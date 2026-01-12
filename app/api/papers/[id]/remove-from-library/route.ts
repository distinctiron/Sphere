import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/remove-from-library
 * Remove a paper from the user's library
 * 
 * Sets inLibrary=false while preserving the status field. If the paper is already
 * not in the library, returns success (idempotent operation).
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
      if (!existingState.inLibrary) {
        // Paper is already not in library - idempotent operation, return success
        return NextResponse.json(
          {
            message: "Paper is already not in your library",
            inLibrary: false,
            status: existingState.status,
          },
          { status: 200 }
        );
      }

      // Update existing state: set inLibrary=false, preserve status
      await db.userPaperState.update({
        where: {
          userId_paperId: {
            userId,
            paperId,
          },
        },
        data: {
          inLibrary: false,
          // status is NOT updated - preserve existing value
          // displayOrder can be cleared or preserved - clearing for simplicity
          displayOrder: null,
        },
      });

      return NextResponse.json(
        {
          message: "Paper removed from your library",
          inLibrary: false,
          status: existingState.status,
        },
        { status: 200 }
      );
    } else {
      // UserPaperState doesn't exist - create with inLibrary=false, status=NEW
      await db.userPaperState.create({
        data: {
          userId,
          paperId,
          status: PaperStatus.NEW,
          inLibrary: false,
        },
      });

      return NextResponse.json(
        {
          message: "Paper removed from your library",
          inLibrary: false,
          status: PaperStatus.NEW,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error removing paper from library:", error);
    return NextResponse.json(
      {
        error: "Failed to remove paper from library",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
