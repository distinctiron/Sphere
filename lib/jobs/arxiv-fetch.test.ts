import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    jobRun: { findFirst: vi.fn() },
    paper: { findMany: vi.fn(), createMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/arxiv", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/arxiv")>()),
  searchArxiv: vi.fn(),
}));

// No 3-second spacing between arXiv requests in tests
vi.mock("./rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./rate-limit")>()),
  createIntervalThrottle: () => async () => {},
}));

import { db } from "@/lib/db";
import { searchArxiv, type ParsedPaper } from "@/lib/arxiv";
import { arxivFetchJob } from "./arxiv-fetch";

const mockDb = vi.mocked(db, true);

function page(ids: string[]): ParsedPaper[] {
  return ids.map((arxivId) => ({
    arxivId,
    title: arxivId,
    authors: [],
    abstract: "",
    publicationDate: new Date(0),
    updatedDate: new Date(0),
    categories: ["cs.AI"],
    pdfUrl: "",
    htmlUrl: "",
  }));
}

const ctx = () => ({
  runId: "run-2",
  trigger: "cli" as const,
  signal: new AbortController().signal,
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
});

// Page 0 is fully stored already; page 1 has new papers; 3 pages in total
const PAGES = [page(["old-1", "old-2"]), page(["new-1", "new-2"]), page(["new-3"])];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(searchArxiv).mockImplementation(async ({ start = 0 }) => ({
    papers: PAGES[start / 200] ?? [],
    totalResults: 3 * 200,
  }));
  mockDb.paper.findMany.mockImplementation((async (args: { where: { arxivId: { in: string[] } } }) =>
    args.where.arxivId.in
      .filter((id) => id.startsWith("old"))
      .map((arxivId) => ({ id: arxivId, ...page([arxivId])[0] }))) as never);
  mockDb.paper.createMany.mockImplementation((async (args: { data: unknown[] }) => ({ count: args.data.length })) as never);
});

describe("arxiv-fetch job", () => {
  it("stops at the first page without new papers once caught up", async () => {
    mockDb.jobRun.findFirst.mockResolvedValue({
      status: "COMPLETED",
      details: { stopReason: "caught up with stored papers" },
    } as never);

    const result = await arxivFetchJob.run(ctx());

    expect(searchArxiv).toHaveBeenCalledTimes(1);
    expect(result.details).toMatchObject({ newPapers: 0, stopReason: "caught up with stored papers", backfill: false });
  });

  it("backfills the whole window after an incomplete previous run", async () => {
    mockDb.jobRun.findFirst.mockResolvedValue({
      status: "COMPLETED",
      details: { stopReason: "max pages reached" },
    } as never);

    const result = await arxivFetchJob.run(ctx());

    expect(searchArxiv).toHaveBeenCalledTimes(3);
    expect(result.details).toMatchObject({ newPapers: 3, backfill: true, stopReason: "end of results" });
  });

  it("backfills on the very first run", async () => {
    mockDb.jobRun.findFirst.mockResolvedValue(null);
    const result = await arxivFetchJob.run(ctx());
    expect(result.details).toMatchObject({ newPapers: 3, backfill: true });
  });

  it("keeps partial results when a later page fails", async () => {
    mockDb.jobRun.findFirst.mockResolvedValue(null);
    vi.mocked(searchArxiv)
      .mockResolvedValueOnce({ papers: PAGES[1], totalResults: 600 })
      .mockRejectedValueOnce(new Error("arXiv API returned status 503"));

    const result = await arxivFetchJob.run(ctx());

    expect(result.details).toMatchObject({ newPapers: 2, stopReason: "arXiv error", fetchError: "arXiv API returned status 503" });
  });

  it("fails the run when the first page can't be fetched", async () => {
    mockDb.jobRun.findFirst.mockResolvedValue(null);
    vi.mocked(searchArxiv).mockRejectedValue(new Error("network down"));
    await expect(arxivFetchJob.run(ctx())).rejects.toThrow("network down");
  });
});
