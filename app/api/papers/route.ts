import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PaperStatus, Prisma } from "@prisma/client";

export const runtime = "nodejs";

/** Window used for "new" papers before a user's second login */
const FIRST_VISIT_WINDOW_DAYS = 7;
const DEFAULT_INCOMING_LIMIT = 100;
const MAX_INCOMING_LIMIT = 200;

/**
 * GET /api/papers
 * Fetches papers for the dashboard, filtered by user's paper states
 * 
 * Query parameters:
 * - status: Filter by paper status (optional, used for incoming articles)
 * - inLibrary: Filter by library membership (true/false, used for library section)
 * - limit: Maximum number of papers to return (optional; incoming defaults to 100, max 200)
 * - scope: Incoming only. "new" (default) = papers added since the user's previous
 *          login (last 7 days on first visit); "all" = every paper not dismissed/saved
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
    select: { id: true, newPapersSince: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userId = user.id;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as PaperStatus | null;
  const inLibraryParam = searchParams.get("inLibrary");
  const inLibrary = inLibraryParam === "true" ? true : inLibraryParam === "false" ? false : null;
  const limitParam = parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;
  const scope = searchParams.get("scope") === "all" ? "all" : "new";

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
    // Query for incoming articles (Story 6.4): pre-processed papers from the
    // shared papers table, excluding ones the user dismissed or saved to their
    // library. Papers without a UserPaperState are implicitly NEW.
    // Includes NEW, BEING_PROCESSED, and READ papers - only excludes DISMISSED
    else {
      const since = user.newPapersSince ?? new Date(Date.now() - FIRST_VISIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const where: Prisma.PaperWhereInput = {
        ...(scope === "new" ? { createdAt: { gt: since } } : {}),
        NOT: {
          userStates: {
            some: { userId, OR: [{ status: PaperStatus.DISMISSED }, { inLibrary: true }] },
          },
        },
      };

      const [papers, total] = await Promise.all([
        db.paper.findMany({
          where,
          include: { userStates: { where: { userId }, take: 1 } },
          // Scored papers first (SQLite sorts NULLs last in DESC order), then newest
          orderBy: [{ noveltyScore: "desc" }, { publicationDate: "desc" }],
          take: Math.min(limit ?? DEFAULT_INCOMING_LIMIT, MAX_INCOMING_LIMIT),
        }),
        db.paper.count({ where }),
      ]);

      const incoming = papers.map((paper) => ({
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
        status: paper.userStates[0]?.status ?? PaperStatus.NEW,
        inLibrary: false,
        displayOrder: null,
        createdAt: paper.createdAt,
        updatedAt: paper.updatedAt,
      }));

      return NextResponse.json(
        {
          papers: incoming,
          meta: {
            scope,
            since: scope === "new" ? since : null,
            isFirstVisit: user.newPapersSince === null,
            total,
            pendingScores: incoming.filter((p) => p.noveltyScore === null).length,
          },
        },
        { status: 200 }
      );
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

