import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/dismiss
 * Dismiss a paper from the dashboard
 * 
 * Marks a paper as dismissed by updating or creating a UserPaperState entry
 * with status DISMISSED. The paper will no longer appear on the dashboard.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const paperId = params.id;
    const userId = user.id;

    // Verify paper exists
    const paper = await db.paper.findUnique({
      where: { id: paperId },
      select: { id: true },
    });

    if (!paper) {
      return NextResponse.json({ error: "Paper not found" }, { status: 404 });
    }

    // Check if UserPaperState already exists
    const existingState = await db.userPaperState.findUnique({
      where: {
        userId_paperId: {
          userId,
          paperId,
        },
      },
    });

    if (existingState) {
      // Update existing state to dismissed
      await db.userPaperState.update({
        where: {
          userId_paperId: {
            userId,
            paperId,
          },
        },
        data: {
          status: PaperStatus.DISMISSED,
        },
      });
    } else {
      // Create UserPaperState entry with status DISMISSED
      await db.userPaperState.create({
        data: {
          userId,
          paperId,
          status: PaperStatus.DISMISSED,
          inLibrary: false,
        },
      });
    }

    return NextResponse.json(
      {
        message: "Paper dismissed",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error dismissing paper:", error);
    return NextResponse.json(
      {
        error: "Failed to dismiss paper",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

