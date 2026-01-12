import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/explain
 * Generate explanation for selected text using LLM
 * Returns streaming response
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Get paper from database for context
    const paper = await db.paper.findUnique({
      where: { id: params.id },
    });

    if (!paper) {
      return NextResponse.json(
        { error: "Paper not found" },
        { status: 404 }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Import LLM service dynamically to handle streaming
          const { explainTextStreaming } = await import("@/lib/llm");
          
          // Stream the explanation
          await explainTextStreaming(
            text.trim(),
            {
              title: paper.title,
              abstract: paper.abstract,
            },
            (chunk: string) => {
              // Send chunk as SSE format
              const data = JSON.stringify({ chunk });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          );

          // Send completion signal
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Error in explanation stream:", error);
          const errorData = JSON.stringify({ 
            error: "Explanation unavailable. Try the Deep Dive panel for more help." 
          });
          controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in explanation route:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the explanation" },
      { status: 500 }
    );
  }
}

