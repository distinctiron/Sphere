import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/mark-read
 * Mark a paper as read
 * 
 * Updates a paper's status to READ if it's currently NEW or BEING_PROCESSED.
 * Preserves the inLibrary flag unchanged. If the paper is already READ, returns
 * success without updating. If UserPaperState doesn't exist, creates it with
 * status READ and appropriate inLibrary value.
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
      // Only update if status is NEW or BEING_PROCESSED
      if (
        existingState.status === PaperStatus.NEW ||
        existingState.status === PaperStatus.BEING_PROCESSED
      ) {
        await db.userPaperState.update({
          where: {
            userId_paperId: {
              userId,
              paperId,
            },
          },
          data: {
            status: PaperStatus.READ,
            // inLibrary is NOT updated - preserve existing value
          },
        });

        return NextResponse.json(
          {
            message: "Paper marked as read",
            status: PaperStatus.READ,
            inLibrary: existingState.inLibrary,
          },
          { status: 200 }
        );
      } else {
        // Status is already READ (or DISMISSED), return success without update
        return NextResponse.json(
          {
            message: "Paper is already marked as read",
            status: existingState.status,
            inLibrary: existingState.inLibrary,
          },
          { status: 200 }
        );
      }
    } else {
      // UserPaperState doesn't exist - create with status READ
      // Default inLibrary to true if calling from library context
      const newState = await db.userPaperState.create({
        data: {
          userId,
          paperId,
          status: PaperStatus.READ,
          inLibrary: true, // Default if calling from library context
        },
      });

      return NextResponse.json(
        {
          message: "Paper marked as read",
          status: PaperStatus.READ,
          inLibrary: newState.inLibrary,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error marking paper as read:", error);
    return NextResponse.json(
      {
        error: "Failed to mark paper as read",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
