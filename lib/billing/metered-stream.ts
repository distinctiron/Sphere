/**
 * Server-sent-event response for a metered AI call (server-only).
 *
 * Protocol (unchanged for clients): data: {...json}\n\n events, then
 * data: [DONE], or data: {"error": "..."} on failure.
 *
 * Usage is recorded exactly once, after the call ends, including when it fails
 * part-way (the provider may still bill a partial generation). If the reader
 * disconnects, generation continues so the call is still metered.
 */

import type { LLMUsage, UsageCallback } from "@/lib/llm";
import { recordUsage, type RecordUsageInput } from "./usage";

export interface MeteredStreamContext {
  send: (payload: unknown) => void;
  onUsage: UsageCallback;
}

export function meteredSseResponse(
  meter: Omit<RecordUsageInput, "usage">,
  errorMessage: string,
  run: (ctx: MeteredStreamContext) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const write = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          /* closed by the client */
        }
      };
      let usage: LLMUsage | undefined;
      try {
        await run({ send: (payload) => write(JSON.stringify(payload)), onUsage: (u) => (usage = u) });
        await recordUsage({ ...meter, usage });
        write("[DONE]");
      } catch (error) {
        console.error(`Error in ${meter.feature} stream:`, error);
        await recordUsage({ ...meter, usage });
        write(JSON.stringify({ error: errorMessage }));
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
