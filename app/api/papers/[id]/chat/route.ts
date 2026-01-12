import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/chat
 * Chat with paper using LLM streaming
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
    const { message, conversationHistory } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
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

    // Fetch full paper HTML content
    let fullContent: string | undefined;
    if (paper.htmlUrl) {
      try {
        const htmlResponse = await fetch(paper.htmlUrl, {
          headers: {
            "User-Agent": "Sphere Research Platform",
          },
        });
        if (htmlResponse.ok) {
          fullContent = await htmlResponse.text();
        }
      } catch (error) {
        console.warn("Failed to fetch HTML content:", error);
        // Continue without full content - will use abstract only
      }
    }

    // Validate conversation history format
    const history: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        if (
          msg &&
          typeof msg === "object" &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string"
        ) {
          history.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Import LLM service dynamically to handle streaming
          const { chatWithPaperStreaming } = await import("@/lib/llm");
          
          // Stream the chat response
          await chatWithPaperStreaming(
            message.trim(),
            {
              title: paper.title,
              abstract: paper.abstract || "",
              fullContent,
            },
            history,
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
          console.error("Error in chat stream:", error);
          const errorData = JSON.stringify({ 
            error: "Deep Dive service unavailable. Please try again." 
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
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

