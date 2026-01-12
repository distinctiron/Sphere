import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/**
 * POST /api/library/reorder
 * Reorder papers in the user's library
 * 
 * Accepts an array of paper IDs in the desired order and updates display_order
 * values sequentially (1, 2, 3...) using a database transaction.
 */
export async function POST(request: Request) {
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

    const userId = user.id;

    // Parse request body
    const body = await request.json();
    const { paperIds } = body;

    if (!Array.isArray(paperIds)) {
      return NextResponse.json(
        { error: "paperIds must be an array" },
        { status: 400 }
      );
    }

    if (paperIds.length === 0) {
      return NextResponse.json(
        { error: "paperIds array cannot be empty" },
        { status: 400 }
      );
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Verify all papers belong to the user and are in library
      const userPaperStates = await tx.userPaperState.findMany({
        where: {
          userId,
          paperId: { in: paperIds },
          inLibrary: true,
        },
      });

      if (userPaperStates.length !== paperIds.length) {
        throw new Error("Some papers not found in user's library");
      }

      // Recalculate display_order sequentially (1, 2, 3...)
      const updates = paperIds.map(async (paperId, index) => {
        return tx.userPaperState.update({
          where: {
            userId_paperId: {
              userId,
              paperId,
            },
          },
          data: {
            displayOrder: index + 1,
          },
        });
      });

      await Promise.all(updates);

      // Return updated states
      const updatedStates = await tx.userPaperState.findMany({
        where: {
          userId,
          paperId: { in: paperIds },
          inLibrary: true,
        },
        select: {
          paperId: true,
          displayOrder: true,
        },
      });

      return updatedStates;
    });

    return NextResponse.json(
      {
        message: "Library reordered successfully",
        papers: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error reordering library:", error);
    return NextResponse.json(
      {
        error: "Failed to reorder library",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

