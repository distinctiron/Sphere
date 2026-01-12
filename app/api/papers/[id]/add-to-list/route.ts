import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * POST /api/papers/[id]/add-to-list
 * Add a paper to the user's library
 * 
 * Creates or updates a UserPaperState entry to associate the paper with the user.
 * If the paper is already in the library, returns success without creating a duplicate.
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

    // Calculate display_order: max(display_order) + 1, or 1 if no library papers exist
    const maxOrderResult = await db.userPaperState.aggregate({
      where: {
        userId,
        inLibrary: true,
      },
      _max: {
        displayOrder: true,
      },
    });
    const newDisplayOrder = (maxOrderResult._max.displayOrder || 0) + 1;

    if (existingState) {
      if (existingState.inLibrary) {
        // Paper is already in the library
        return NextResponse.json(
          {
            message: "Paper is already in your library",
            alreadyInLibrary: true,
          },
          { status: 200 }
        );
      } else {
        // Update existing state to mark as in library, preserve status, set display_order
        await db.userPaperState.update({
          where: {
            userId_paperId: {
              userId,
              paperId,
            },
          },
          data: {
            inLibrary: true,
            displayOrder: newDisplayOrder,
            // status is NOT updated - preserve existing status
          },
        });

        return NextResponse.json(
          {
            message: "Paper added to your library",
            alreadyInLibrary: false,
            displayOrder: newDisplayOrder,
          },
          { status: 200 }
        );
      }
    }

    // Create UserPaperState entry with inLibrary = true, status defaults to NEW
    await db.userPaperState.create({
      data: {
        userId,
        paperId,
        status: PaperStatus.NEW,
        inLibrary: true,
        displayOrder: newDisplayOrder,
      },
    });

    return NextResponse.json(
      {
        message: "Paper added to your library",
        alreadyInLibrary: false,
        displayOrder: newDisplayOrder,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error adding paper to library:", error);
    return NextResponse.json(
      {
        error: "Failed to add paper to library",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

