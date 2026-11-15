import { NextResponse } from "next/server";
import { z } from "zod";
import { tutorChatStreaming } from "@/lib/llm";
import { buildTutorSystemPrompt } from "@/lib/learn/tutor";
import { getSessionUserId } from "@/lib/news/session";
import { trimHistory } from "@/lib/rag/query";
import { aiAccessDenied, authorizeAiUsage } from "@/lib/billing/account";
import { meteredSseResponse } from "@/lib/billing/metered-stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  message: z.string().trim().min(1).max(4000),
  /** Earlier turns, without the message being sent */
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .max(50)
    .default([]),
  /** Text the learner selected in the lesson, if they asked about a passage */
  selection: z.string().max(2000).optional(),
});

/**
 * POST /api/learn/lessons/[id]/chat: lesson tutor (Story 9.4), streamed as SSE:
 * data: {"chunk": "..."} … data: [DONE], or data: {"error": "..."}.
 * Metered like paper chat (lib/billing); free users / empty wallets get 402.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const system = buildTutorSystemPrompt(params.id);
  if (!system) return NextResponse.json({ error: "Lesson not found" }, { status: 404 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  const { message, history, selection } = parsed.data;
  const access = await authorizeAiUsage(userId);
  if (!access.allowed) return aiAccessDenied(access);

  const question = selection ? `About this passage in the lesson:\n> ${selection.replace(/\n+/g, " ")}\n\n${message}` : message;

  return meteredSseResponse(
    { userId, feature: "tutor", billing: access.billing },
    "The tutor is unavailable right now. Please try again.",
    async ({ send, onUsage }) => {
      await tutorChatStreaming(system, trimHistory(history), question, (chunk) => send({ chunk }), onUsage);
    }
  );
}
