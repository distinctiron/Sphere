/**
 * Paper Seeding Library
 * 
 * Reusable function for seeding papers into the database
 * Used by both the seed script and the registration API
 */

import { db } from "./db";
import { fetchPapersFromArxiv } from "./arxiv";
import { buildCategoryFilter } from "./arxiv-categories";
import { PaperStatus } from "@prisma/client";

export interface SeedPapersOptions {
  userId: string;
  categoryCodes: string[];
  articleCount: number;
}

export interface SeedPapersResult {
  newPapersCount: number;
  updatedPapersCount: number;
  newStatesCount: number;
}

/**
 * Seed papers for a user based on their preferences
 * 
 * @param options - Seeding options (userId, categoryCodes, articleCount)
 * @returns Result with counts of new/updated papers and states
 */
export async function seedPapersForUser(
  options: SeedPapersOptions
): Promise<SeedPapersResult> {
  const { userId, categoryCodes, articleCount } = options;

  // Build category filter query for arXiv API
  const categoryFilter = categoryCodes.length > 0
    ? `(${buildCategoryFilter(categoryCodes)})`
    : "cat:*"; // All categories if none selected

  // Fetch papers from arXiv
  const fetchedPapers = await fetchPapersFromArxiv(null, articleCount, categoryFilter);

  let newPapersCount = 0;
  let updatedPapersCount = 0;
  let newStatesCount = 0;

  // Process each paper
  for (const paperData of fetchedPapers) {
    try {
      // Upsert paper (update if exists, insert if new)
      const paper = await db.paper.upsert({
        where: { arxivId: paperData.arxivId },
        update: {
          title: paperData.title,
          authors: paperData.authors as any,
          abstract: paperData.abstract,
          publicationDate: paperData.publicationDate,
          updatedDate: paperData.updatedDate,
          categories: paperData.categories as any,
          pdfUrl: paperData.pdfUrl,
          htmlUrl: paperData.htmlUrl,
          updatedAt: new Date(),
        },
        create: {
          arxivId: paperData.arxivId,
          title: paperData.title,
          authors: paperData.authors as any,
          abstract: paperData.abstract,
          publicationDate: paperData.publicationDate,
          updatedDate: paperData.updatedDate,
          categories: paperData.categories as any,
          pdfUrl: paperData.pdfUrl,
          htmlUrl: paperData.htmlUrl,
        },
      });

      // Check if this is a new paper or updated
      const wasCreated = paper.createdAt.getTime() === paper.updatedAt.getTime();
      if (wasCreated) {
        newPapersCount++;
      } else {
        updatedPapersCount++;
      }

      // Create UserPaperState if it doesn't exist
      // inLibrary defaults to false - papers are not in library until explicitly added
      const existingState = await db.userPaperState.findUnique({
        where: {
          userId_paperId: {
            userId,
            paperId: paper.id,
          },
        },
      });

      if (!existingState) {
        await db.userPaperState.create({
          data: {
            userId,
            paperId: paper.id,
            status: PaperStatus.NEW,
            inLibrary: false, // Explicitly set to false (though it's the default)
          },
        });
        newStatesCount++;
      }
    } catch (error) {
      console.error(`Error processing paper ${paperData.arxivId}:`, error);
      // Continue processing other papers
    }
  }

  // Update user's last fetch timestamp
  await db.user.update({
    where: { id: userId },
    data: { lastFetchTimestamp: new Date() },
  });

  return {
    newPapersCount,
    updatedPapersCount,
    newStatesCount,
  };
}

