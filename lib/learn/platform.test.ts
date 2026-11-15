import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    userLessonProgress: { findUnique: vi.fn(), upsert: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/news/session", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/llm", () => ({ tutorChatStreaming: vi.fn() }));
vi.mock("@/lib/billing/account", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/billing/account")>()),
  authorizeAiUsage: vi.fn(),
}));
vi.mock("@/lib/billing/usage", () => ({ recordUsage: vi.fn() }));

import { db } from "@/lib/db";
import { tutorChatStreaming } from "@/lib/llm";
import { authorizeAiUsage } from "@/lib/billing/account";
import { recordUsage } from "@/lib/billing/usage";
import { getSessionUserId } from "@/lib/news/session";
import { PUT as putProgress } from "@/app/api/learn/progress/[lessonId]/route";
import { POST as postChat } from "@/app/api/learn/lessons/[id]/chat/route";
import { getLessonRef, isEarlierLesson, lessonHref } from "./curriculum";
import { extractBodyRefs, getPrevNext, lessonPlainText } from "./content";
import { createLessonMatcher, lessonsForText, rankByKeywords } from "./feed-match";
import { buildTutorSystemPrompt } from "./tutor";

const mockDb = vi.mocked(db, true);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getSessionUserId).mockResolvedValue("user-1");
  vi.mocked(authorizeAiUsage).mockResolvedValue({ allowed: true, billing: "WALLET" });
});

describe("curriculum ordering", () => {
  it("codes lessons by path letter and position", () => {
    expect(getLessonRef("vectors")?.code).toBe("A1");
    expect(getLessonRef("forward-pass")?.code).toBe("A6");
    expect(getLessonRef("inference")?.code).toBe("B8");
    expect(getLessonRef("tool-use")?.code).toBe("C3");
    expect(lessonHref("harness-engineering")).toBe("/learn/building/harness-engineering");
  });

  it("treats earlier lessons in the path and paths earlier in the route as recallable", () => {
    expect(isEarlierLesson("tool-use", "harness-engineering")).toBe(true);
    expect(isEarlierLesson("harness-engineering", "tool-use")).toBe(false);
    expect(isEarlierLesson("attention", "tool-use")).toBe(true); // A before C
    expect(isEarlierLesson("tool-use", "unit-economics")).toBe(true); // C before D
    expect(isEarlierLesson("attention", "inference")).toBe(false); // A and B are read in parallel
  });

  it("links prev/next within a path only", () => {
    expect(getPrevNext("vectors").prev).toBeNull();
    expect(getPrevNext("forward-pass").prev?.id).toBe("neuron");
    expect(getPrevNext("post-training").next).toBeNull();
    expect(getPrevNext("cpu").prev).toBeNull();
  });
});

describe("MDX body helpers", () => {
  const body = `Intro <Term id="kv-cache">KV cache</Term> text.

## The picture

<Figure name="prefill-decode" title="Same weights" caption="Two rows." />

<Recall id="attention">

Keys and values.

</Recall>

See <LessonLink id="gpu" /> and <Preview id="hosting">hosting</Preview>.`;

  it("extracts references", () => {
    expect(extractBodyRefs(body)).toMatchObject({
      terms: ["kv-cache"],
      figures: ["prefill-decode"],
      recalls: ["attention"],
      lessonLinks: ["gpu"],
      previews: ["hosting"],
      headings: ["The picture"],
    });
  });

  it("turns components into readable text for the tutor", () => {
    const text = lessonPlainText(body);
    expect(text).toContain("Intro KV cache text.");
    expect(text).toContain("[Figure: Same weights — Two rows.]");
    expect(text).toContain("[Recall A11:");
    expect(text).toContain("B2 (gpu)");
    expect(text).not.toMatch(/<[A-Z]/);
  });
});

describe("feed matching", () => {
  it("matches whole words, and acronyms case-sensitively", () => {
    const matcher = createLessonMatcher(["KV cache", "RAG", "export controls"]);
    expect(matcher.matches("New KV cache compression beats baselines")).toEqual(["KV cache"]);
    expect(matcher.matches("A rag-tag team")).toEqual([]);
    expect(matcher.matches("Better RAG for code")).toEqual(["RAG"]);
    expect(matcher.matches("US tightens Export Controls on HBM")).toEqual(["export controls"]);
    expect(matcher.matches("kv caches")).toEqual([]);
  });

  it("ranks title hits above body hits and drops weak matches", () => {
    const ranked = rankByKeywords(
      ["prefill", "decode", "KV cache"],
      [
        { id: "body", title: "Unrelated headline", body: "mentions prefill and decode" },
        { id: "title", title: "Faster decode with a smaller KV cache", body: null },
        { id: "weak", title: "Nothing here", body: "only decode" },
      ],
      2
    );
    expect(ranked.map((r) => r.item.id)).toEqual(["title", "body"]);
    expect(ranked[0].score).toBe(4);
  });

  it("finds background lessons for a story", () => {
    const lessons = [
      { id: "inference", keywords: ["KV cache", "prefill", "decode"] },
      { id: "export-controls", keywords: ["export controls", "entity list"] },
    ];
    expect(lessonsForText(lessons, "US expands export controls", "adds firms to the entity list")[0]).toMatchObject({ id: "export-controls", score: 3 });
    expect(lessonsForText(lessons, "Weather", null)).toEqual([]);
  });
});

describe("PUT /api/learn/progress/[lessonId]", () => {
  const put = (lessonId: string, body: unknown) =>
    putProgress(new Request("http://x", { method: "PUT", body: JSON.stringify(body) }), { params: { lessonId } });

  it("rejects unknown lessons and invalid scores", async () => {
    expect((await put("nope", { status: "COMPLETED" })).status).toBe(404);
    expect((await put("vectors", {})).status).toBe(400);
    expect((await put("vectors", { quizCorrect: 5, quizTotal: 3 })).status).toBe(400);
  });

  it("records completion with the quiz score", async () => {
    mockDb.userLessonProgress.findUnique.mockResolvedValue(null as never);
    mockDb.userLessonProgress.upsert.mockImplementation((async ({ create }: { create: Record<string, unknown> }) => ({
      ...create,
      id: "p1",
      quizCorrect: create.quizCorrect ?? null,
      quizTotal: create.quizTotal ?? null,
      completedAt: create.completedAt ?? null,
    })) as never);
    const response = await put("vectors", { status: "COMPLETED", quizCorrect: 3, quizTotal: 4 });
    expect(response.status).toBe(200);
    const { progress } = await response.json();
    expect(progress).toMatchObject({ lessonId: "vectors", status: "COMPLETED", quizCorrect: 3, quizTotal: 4 });
    expect(progress.completedAt).toBeTruthy();
  });

  it("requires a session", async () => {
    vi.mocked(getSessionUserId).mockResolvedValue(null);
    expect((await put("vectors", { status: "COMPLETED" })).status).toBe(401);
  });
});

describe("tutor", () => {
  it("builds a system prompt with the lesson, its prerequisites, mental model and outline", () => {
    const prompt = buildTutorSystemPrompt("inference")!;
    expect(prompt).toContain('lesson B8 "Inference fundamentals"');
    expect(prompt).toContain("Arithmetic is cheap; moving data and power is what costs");
    expect(prompt).toContain("[[lesson:memory-wall]]");
    expect(prompt).toContain("KV cache:"); // glossary entry
    expect(prompt).toContain("<lesson>");
    expect(prompt).toContain("Prefill");
    expect(buildTutorSystemPrompt("nope")).toBeNull();
  });

  it("streams the answer as SSE, quoting a selected passage", async () => {
    vi.mocked(tutorChatStreaming).mockImplementation(async (_system, history, message, onChunk) => {
      expect(history).toEqual([{ role: "user", content: "earlier" }, { role: "assistant", content: "answer" }]);
      expect(message).toContain("> the KV cache grows");
      expect(message).toContain("Why?");
      onChunk("Because ");
      onChunk("memory.");
    });
    const response = await postChat(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          message: "Why?",
          selection: "the KV cache grows",
          history: [
            { role: "user", content: "earlier" },
            { role: "assistant", content: "answer" },
          ],
        }),
      }),
      { params: { id: "inference" } }
    );
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    const text = await response.text();
    expect(text).toBe('data: {"chunk":"Because "}\n\ndata: {"chunk":"memory."}\n\ndata: [DONE]\n\n');
  });

  it("meters each answer against the user's plan", async () => {
    const usage = { provider: "openai" as const, model: "gpt-5.1", inputTokens: 900, outputTokens: 120, cachedInputTokens: 0, cacheWriteTokens: 0 };
    vi.mocked(tutorChatStreaming).mockImplementation(async (_s, _h, _m, onChunk, onUsage) => {
      onChunk("Hi");
      onUsage?.(usage);
    });
    const response = await postChat(new Request("http://x", { method: "POST", body: JSON.stringify({ message: "Why?" }) }), {
      params: { id: "inference" },
    });
    await response.text();
    expect(recordUsage).toHaveBeenCalledWith({ userId: "user-1", feature: "tutor", billing: "WALLET", usage });
  });

  it("returns 402 with a reason code when the plan doesn't cover AI use", async () => {
    vi.mocked(authorizeAiUsage).mockResolvedValue({ allowed: false, reason: "FREE_TIER", message: "Paid plans only" });
    const response = await postChat(new Request("http://x", { method: "POST", body: JSON.stringify({ message: "Why?" }) }), {
      params: { id: "inference" },
    });
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "FREE_TIER" });
    expect(tutorChatStreaming).not.toHaveBeenCalled();
  });

  it("rejects empty messages and unknown lessons", async () => {
    const post = (id: string, body: unknown) => postChat(new Request("http://x", { method: "POST", body: JSON.stringify(body) }), { params: { id } });
    expect((await post("inference", { message: "  " })).status).toBe(400);
    expect((await post("nope", { message: "hi" })).status).toBe(404);
  });
});
