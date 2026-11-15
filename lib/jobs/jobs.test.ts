import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    jobRun: { create: vi.fn(), update: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn() },
    jobLock: { updateMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
    paper: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), createMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/llm", () => ({
  isLLMConfigured: vi.fn(),
  scoreNovelty: vi.fn(),
}));

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isLLMConfigured, scoreNovelty } from "@/lib/llm";
import { buildSubmittedDateQuery, formatArxivDateTime, type ParsedPaper } from "@/lib/arxiv";
import { runJob } from "./job-runner";
import { acquireJobLock } from "./lock";
import { isTransientError, mapWithConcurrency } from "./rate-limit";
import { msUntilNextRun } from "./scheduler";
import { noveltyScoringJob, scoringRetryDelayMs } from "./novelty-scoring";
import { upsertPapers } from "./arxiv-fetch";
import type { JobDefinition } from "./types";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.jobRun.create.mockResolvedValue({ id: "run-1" } as never);
  mockDb.jobRun.update.mockResolvedValue({} as never);
  mockDb.jobRun.updateMany.mockResolvedValue({ count: 0 });
  mockDb.jobLock.updateMany.mockResolvedValue({ count: 0 });
  mockDb.jobLock.create.mockResolvedValue({} as never);
  mockDb.jobLock.deleteMany.mockResolvedValue({ count: 1 });
});

function job(run: JobDefinition["run"]): JobDefinition {
  return { name: "test-job", description: "test", timeoutMs: 60_000, run };
}

describe("msUntilNextRun", () => {
  it("aligns hourly runs to the configured minute", () => {
    expect(msUntilNextRun(new Date("2026-09-28T10:00:00Z"), 60, 5)).toBe(5 * 60_000);
    expect(msUntilNextRun(new Date("2026-09-28T10:05:00Z"), 60, 5)).toBe(60 * 60_000);
    expect(msUntilNextRun(new Date("2026-09-28T10:30:30Z"), 60, 5)).toBe(34.5 * 60_000);
  });

  it("supports sub-hourly intervals", () => {
    expect(msUntilNextRun(new Date("2026-09-28T10:07:00Z"), 15, 0)).toBe(8 * 60_000);
  });
});

describe("mapWithConcurrency", () => {
  it("limits concurrency and captures failures without stopping", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      if (n === 3) throw new Error("boom");
      return n * 10;
    });
    expect(peak).toBe(2);
    expect(results.map((r) => r?.status)).toEqual(["fulfilled", "fulfilled", "rejected", "fulfilled", "fulfilled"]);
  });

  it("stops scheduling new items once shouldStop is true", async () => {
    let calls = 0;
    const results = await mapWithConcurrency([1, 2, 3, 4], 1, async () => ++calls, () => calls >= 2);
    expect(calls).toBe(2);
    expect(results.filter((r) => r === undefined)).toHaveLength(2);
  });
});

describe("isTransientError", () => {
  it("classifies rate limits, server and network errors as transient", () => {
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 400 })).toBe(false);
    expect(isTransientError(new TypeError("fetch failed"))).toBe(true);
    expect(isTransientError(new Error("bad schema"))).toBe(false);
  });
});

describe("acquireJobLock", () => {
  it("takes over an expired lock", async () => {
    mockDb.jobLock.updateMany.mockResolvedValue({ count: 1 });
    expect(await acquireJobLock("job", "owner", 1000)).toBe(true);
    expect(mockDb.jobLock.create).not.toHaveBeenCalled();
  });

  it("creates the lock when none exists", async () => {
    expect(await acquireJobLock("job", "owner", 1000)).toBe(true);
    expect(mockDb.jobLock.create).toHaveBeenCalled();
  });

  it("fails when another owner holds a live lock", async () => {
    mockDb.jobLock.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "6" })
    );
    expect(await acquireJobLock("job", "owner", 1000)).toBe(false);
  });
});

describe("runJob", () => {
  it("records a completed run with metrics and releases the lock", async () => {
    const summary = await runJob(
      job(async () => ({ itemsProcessed: 3, itemsFailed: 1, details: { note: "ok" } })),
      "cli"
    );

    expect(summary).toMatchObject({ status: "COMPLETED", runId: "run-1", itemsProcessed: 3, itemsFailed: 1 });
    expect(mockDb.jobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "run-1" },
        data: expect.objectContaining({ status: "COMPLETED", itemsProcessed: 3, itemsFailed: 1, details: { note: "ok" } }),
      })
    );
    expect(mockDb.jobLock.deleteMany).toHaveBeenCalled();
  });

  it("marks abandoned runs of the same job as failed before starting", async () => {
    await runJob(job(async () => ({ itemsProcessed: 0, itemsFailed: 0 })), "cli");
    expect(mockDb.jobRun.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jobName: "test-job", status: "RUNNING" } })
    );
  });

  it("records failures without throwing", async () => {
    const summary = await runJob(
      job(async () => {
        throw new Error("arXiv down");
      }),
      "scheduler"
    );
    expect(summary).toMatchObject({ status: "FAILED", error: "arXiv down" });
    expect(mockDb.jobRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", error: "arXiv down" }) })
    );
    expect(mockDb.jobLock.deleteMany).toHaveBeenCalled();
  });

  it("skips (and records) a run when the lock is held", async () => {
    mockDb.jobLock.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "6" })
    );
    const run = vi.fn();
    const summary = await runJob(job(run), "http");
    expect(summary.status).toBe("SKIPPED");
    expect(run).not.toHaveBeenCalled();
    expect(mockDb.jobRun.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SKIPPED" }) })
    );
  });
});

describe("arXiv query helpers", () => {
  it("formats dates in GMT as YYYYMMDDHHMM", () => {
    expect(formatArxivDateTime(new Date("2026-09-28T07:04:59Z"))).toBe("202609280704");
  });

  it("builds a category + submittedDate query", () => {
    expect(
      buildSubmittedDateQuery(["cs.*", "physics.*"], new Date("2026-09-24T12:00:00Z"), new Date("2026-09-28T12:00:00Z"))
    ).toBe("(cat:cs.* OR cat:physics.*) AND submittedDate:[202609241200 TO 202609281200]");
  });
});

function parsedPaper(arxivId: string, overrides: Partial<ParsedPaper> = {}): ParsedPaper {
  return {
    arxivId,
    title: `Title ${arxivId}`,
    authors: [{ name: "A. Author" }],
    abstract: "Abstract",
    publicationDate: new Date("2026-09-25T00:00:00Z"),
    updatedDate: new Date("2026-09-25T00:00:00Z"),
    categories: ["cs.AI"],
    pdfUrl: `https://arxiv.org/pdf/${arxivId}`,
    htmlUrl: `https://arxiv.org/html/${arxivId}`,
    ...overrides,
  };
}

describe("upsertPapers", () => {
  it("inserts new papers, skips unchanged ones and updates changed metadata", async () => {
    const unchanged = parsedPaper("2609.00001v1");
    const changed = parsedPaper("2609.00002v1", {
      title: "New title",
      updatedDate: new Date("2026-09-26T00:00:00Z"),
    });
    const fresh = parsedPaper("2609.00003v1");

    mockDb.paper.findMany.mockResolvedValue([
      { id: "p1", ...parsedPaper("2609.00001v1") },
      { id: "p2", ...parsedPaper("2609.00002v1") },
    ] as never);
    mockDb.paper.createMany.mockResolvedValue({ count: 1 });
    mockDb.paper.update.mockResolvedValue({} as never);

    const stats = await upsertPapers([unchanged, changed, fresh, fresh]);

    expect(stats).toEqual({ created: 1, updated: 1, unchanged: 1, failed: 0 });
    expect(mockDb.paper.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ arxivId: "2609.00003v1" })],
    });
    // Content changed (new updatedDate) → queued for RAG re-indexing
    expect(mockDb.paper.update).toHaveBeenCalledWith({
      where: { id: "p2" },
      data: expect.objectContaining({ title: "New title", ragStatus: "PENDING" }),
    });
  });

  it("falls back to row-by-row inserts and skips duplicates on conflict", async () => {
    mockDb.paper.findMany.mockResolvedValue([]);
    mockDb.paper.createMany.mockRejectedValue(new Error("unique"));
    mockDb.paper.create
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(
        new Prisma.PrismaClientKnownRequestError("Unique constraint", { code: "P2002", clientVersion: "6" })
      );

    const stats = await upsertPapers([parsedPaper("a"), parsedPaper("b")]);
    expect(stats).toEqual({ created: 1, updated: 0, unchanged: 1, failed: 0 });
  });
});

describe("novelty scoring job", () => {
  const ctx = () => ({
    runId: "run-1",
    trigger: "cli" as const,
    signal: new AbortController().signal,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  });

  function candidate(id: string, attempts = 0, lastAttemptAgoMs?: number) {
    return {
      id,
      title: `Paper ${id}`,
      abstract: "Abstract",
      authors: [{ name: "A" }],
      categories: ["cs.AI"],
      scoringAttempts: attempts,
      lastScoringAttemptAt: lastAttemptAgoMs === undefined ? null : new Date(Date.now() - lastAttemptAgoMs),
    };
  }

  it("skips scoring in mock mode so placeholder scores are never stored", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(false);
    const result = await noveltyScoringJob.run(ctx());
    expect(result.itemsProcessed).toBe(0);
    expect(mockDb.paper.findMany).not.toHaveBeenCalled();
  });

  it("scores due papers, records failures for retry and respects backoff", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true);
    mockDb.paper.findMany.mockResolvedValue([
      candidate("ok"),
      candidate("bad"),
      candidate("waiting", 2, 30 * 60 * 1000), // failed twice, 30 min ago: backoff is 2h
    ] as never);
    vi.mocked(scoreNovelty).mockImplementation(async (title) => {
      if (title === "Paper bad") throw Object.assign(new Error("invalid output"), { status: 400 });
      return { score: 8.2, summary: "Novel" };
    });

    const result = await noveltyScoringJob.run(ctx());

    expect(scoreNovelty).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ itemsProcessed: 1, itemsFailed: 1 });
    expect(mockDb.paper.updateMany).toHaveBeenCalledWith({
      where: { id: "ok", noveltyScore: null },
      data: expect.objectContaining({ noveltyScore: 8.2, noveltySummary: "Novel", scoringError: null }),
    });
    expect(mockDb.paper.update).toHaveBeenCalledWith({
      where: { id: "bad" },
      data: expect.objectContaining({ scoringAttempts: { increment: 1 }, scoringError: "invalid output" }),
    });
  });

  it("stops early when the LLM is rate limited", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true);
    mockDb.paper.findMany.mockResolvedValue(
      Array.from({ length: 20 }, (_, i) => candidate(`p${i}`)) as never
    );
    vi.mocked(scoreNovelty).mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 }));

    const result = await noveltyScoringJob.run(ctx());

    expect(result.details).toMatchObject({ circuitBreakerTripped: true });
    expect(vi.mocked(scoreNovelty).mock.calls.length).toBeLessThan(20);
    expect((result.details as { notAttempted: number }).notAttempted).toBeGreaterThan(0);
  });

  it("fails the run on authentication errors without penalising papers", async () => {
    vi.mocked(isLLMConfigured).mockReturnValue(true);
    mockDb.paper.findMany.mockResolvedValue([candidate("a"), candidate("b"), candidate("c")] as never);
    vi.mocked(scoreNovelty).mockRejectedValue(Object.assign(new Error("401 Incorrect API key"), { status: 401 }));

    await expect(noveltyScoringJob.run(ctx())).rejects.toThrow("LLM authentication failed");
    expect(mockDb.paper.update).not.toHaveBeenCalled();
  });

  it("uses exponential retry delays", () => {
    expect(scoringRetryDelayMs(0)).toBe(0);
    expect(scoringRetryDelayMs(1)).toBe(60 * 60 * 1000);
    expect(scoringRetryDelayMs(3)).toBe(4 * 60 * 60 * 1000);
  });
});
