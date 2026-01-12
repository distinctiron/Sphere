import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus } from "@prisma/client";

export const runtime = "nodejs";

/**
 * GET /api/papers
 * Fetches papers for the dashboard, filtered by user's paper states
 * 
 * Query parameters:
 * - status: Filter by paper status (optional, used for incoming articles)
 * - inLibrary: Filter by library membership (true/false, used for library section)
 * - limit: Maximum number of papers to return (optional)
 * 
 * Examples:
 * - GET /api/papers?inLibrary=true - Get all library papers (ordered by display_order)
 * - GET /api/papers?status=NEW - Get incoming articles (not dismissed, inLibrary=false or no state)
 *   Note: Incoming articles include NEW, BEING_PROCESSED, and READ papers - only DISMISSED are excluded
 */
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch user ID from database using email (more reliable than session.user.id)
  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = user.id;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PaperStatus | null;
  const inLibraryParam = searchParams.get("inLibrary");
  const inLibrary = inLibraryParam === "true" ? true : inLibraryParam === "false" ? false : null;
  const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : null;

  try {
    let userPaperStates;
    let sortedStates;

    // Query for library papers (inLibrary=true, status can be any value)
    if (inLibrary === true) {
      userPaperStates = await db.userPaperState.findMany({
        where: {
          userId,
          inLibrary: true,
        },
        include: {
          paper: true,
        },
      });

      // Sort library papers: by display_order (ascending, nulls last), then by created_at
      sortedStates = userPaperStates.sort((a, b) => {
        // Handle null display_order (put them last)
        if (a.displayOrder === null && b.displayOrder === null) {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
        if (a.displayOrder === null) return 1; // a goes after b
        if (b.displayOrder === null) return -1; // b goes after a

        // Both have display_order - compare orders first
        const orderDiff = a.displayOrder - b.displayOrder;
        if (orderDiff !== 0) return orderDiff;

        // Orders are equal - sort by created_at
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }
    // Query for incoming articles (not dismissed, inLibrary=false or no state)
    // Includes NEW, BEING_PROCESSED, and READ papers - only excludes DISMISSED
    else {
      // Get all papers that are not dismissed and not in library
      userPaperStates = await db.userPaperState.findMany({
        where: {
          userId,
          status: {
            not: PaperStatus.DISMISSED,
          },
          inLibrary: false,
        },
        include: {
          paper: true,
        },
      });

      // Also need to get papers that don't have a UserPaperState record yet
      // These are implicitly NEW and not in library (and not dismissed)
      const allUserPaperStates = await db.userPaperState.findMany({
        where: { userId },
        select: { paperId: true },
      });
      const userPaperIds = new Set(allUserPaperStates.map((ups) => ups.paperId));

      // Get all papers that don't have a state record
      // These are implicitly NEW (not dismissed, not in library)
      const papersWithoutState = await db.paper.findMany({
        where: {
          id: {
            notIn: Array.from(userPaperIds),
          },
        },
      });

      // Convert papers without state to the same format
      const papersWithoutStateFormatted = papersWithoutState.map((paper) => ({
        id: paper.id,
        arxivId: paper.arxivId,
        title: paper.title,
        authors: paper.authors as Array<{ name: string }>,
        abstract: paper.abstract,
        publicationDate: paper.publicationDate,
        updatedDate: paper.updatedDate,
        categories: paper.categories as string[],
        pdfUrl: paper.pdfUrl,
        htmlUrl: paper.htmlUrl,
        noveltyScore: paper.noveltyScore,
        noveltySummary: paper.noveltySummary,
        status: PaperStatus.NEW,
        inLibrary: false,
        displayOrder: null,
        createdAt: paper.createdAt,
        updatedAt: paper.updatedAt,
      }));

      // Sort incoming articles: by novelty_score descending (nulls last), then by publication date descending
      const sortedStatesWithState = userPaperStates.sort((a, b) => {
        // Handle null scores (put them last)
        if (a.paper.noveltyScore === null && b.paper.noveltyScore === null) {
          return b.paper.publicationDate.getTime() - a.paper.publicationDate.getTime();
        }
        if (a.paper.noveltyScore === null) return 1; // a goes after b
        if (b.paper.noveltyScore === null) return -1; // b goes after a

        // Both have scores - compare scores first
        const scoreDiff = b.paper.noveltyScore - a.paper.noveltyScore;
        if (scoreDiff !== 0) return scoreDiff;

        // Scores are equal - sort by publication date descending
        return b.paper.publicationDate.getTime() - a.paper.publicationDate.getTime();
      });

      // Transform states to paper format
      const papersWithState = sortedStatesWithState.map((ups) => ({
        id: ups.paper.id,
        arxivId: ups.paper.arxivId,
        title: ups.paper.title,
        authors: ups.paper.authors as Array<{ name: string }>,
        abstract: ups.paper.abstract,
        publicationDate: ups.paper.publicationDate,
        updatedDate: ups.paper.updatedDate,
        categories: ups.paper.categories as string[],
        pdfUrl: ups.paper.pdfUrl,
        htmlUrl: ups.paper.htmlUrl,
        noveltyScore: ups.paper.noveltyScore,
        noveltySummary: ups.paper.noveltySummary,
        status: ups.status,
        inLibrary: ups.inLibrary,
        displayOrder: ups.displayOrder,
        createdAt: ups.paper.createdAt,
        updatedAt: ups.paper.updatedAt,
      }));

      // Sort papers without state by novelty score
      const sortedPapersWithoutState = papersWithoutStateFormatted.sort((a, b) => {
        if (a.noveltyScore === null && b.noveltyScore === null) {
          return b.publicationDate.getTime() - a.publicationDate.getTime();
        }
        if (a.noveltyScore === null) return 1;
        if (b.noveltyScore === null) return -1;
        const scoreDiff = b.noveltyScore - a.noveltyScore;
        if (scoreDiff !== 0) return scoreDiff;
        return b.publicationDate.getTime() - a.publicationDate.getTime();
      });

      // Combine and sort all incoming articles
      const allIncomingPapers = [...papersWithState, ...sortedPapersWithoutState].sort((a, b) => {
        if (a.noveltyScore === null && b.noveltyScore === null) {
          return b.publicationDate.getTime() - a.publicationDate.getTime();
        }
        if (a.noveltyScore === null) return 1;
        if (b.noveltyScore === null) return -1;
        const scoreDiff = b.noveltyScore - a.noveltyScore;
        if (scoreDiff !== 0) return scoreDiff;
        return b.publicationDate.getTime() - a.publicationDate.getTime();
      });

      // Apply limit if specified
      const limitedPapers = limit ? allIncomingPapers.slice(0, limit) : allIncomingPapers;

      return NextResponse.json({ papers: limitedPapers }, { status: 200 });
    }

    // Apply limit if specified (for library papers)
    const limitedStates = limit ? sortedStates.slice(0, limit) : sortedStates;

    // Transform the data to include paper info with status
    const papers = limitedStates.map((ups) => ({
      id: ups.paper.id,
      arxivId: ups.paper.arxivId,
      title: ups.paper.title,
      authors: ups.paper.authors as Array<{ name: string }>,
      abstract: ups.paper.abstract,
      publicationDate: ups.paper.publicationDate,
      updatedDate: ups.paper.updatedDate,
      categories: ups.paper.categories as string[],
      pdfUrl: ups.paper.pdfUrl,
      htmlUrl: ups.paper.htmlUrl,
      noveltyScore: ups.paper.noveltyScore,
      noveltySummary: ups.paper.noveltySummary,
      status: ups.status,
      inLibrary: ups.inLibrary,
      displayOrder: ups.displayOrder,
      createdAt: ups.paper.createdAt,
      updatedAt: ups.paper.updatedAt,
    }));

    return NextResponse.json({ papers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching papers:", error);
    return NextResponse.json(
      { error: "Failed to fetch papers", details: (error as Error).message },
      { status: 500 }
    );
  }
}

