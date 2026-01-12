import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/papers/[id]/html
 * Fetch HTML content for a paper from arXiv
 * 
 * This endpoint acts as a proxy to fetch HTML content from arXiv,
 * avoiding CORS issues when fetching directly from the client.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify paper exists and user has access
    const paper = await db.paper.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        htmlUrl: true,
      },
    });

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Fetch HTML content from arXiv
    const response = await fetch(paper.htmlUrl, {
      headers: {
        "User-Agent": "Sphere Research Platform",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "HTML_NOT_AVAILABLE" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: "Failed to fetch HTML content" },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Return HTML content
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Error fetching paper HTML:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch HTML content",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

