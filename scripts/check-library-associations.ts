/**
 * Script to check library associations in the database
 * 
 * Usage: npx tsx scripts/check-library-associations.ts [user-email]
 */

import { db } from "../lib/db";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function checkLibraryAssociations(userEmail?: string) {
  try {
    // Get user
    let user;
    if (userEmail) {
      user = await db.user.findUnique({
        where: { email: userEmail },
        select: { id: true, email: true, name: true },
      });
    } else {
      // Get first user
      user = await db.user.findFirst({
        select: { id: true, email: true, name: true },
      });
    }

    if (!user) {
      console.error("User not found");
      process.exit(1);
    }

    console.log(`\n📚 Library Associations for: ${user.email} (${user.name || "No name"})\n`);

    // Count total associations
    const totalAssociations = await db.userPaperState.count({
      where: { userId: user.id },
    });

    console.log(`Total library associations: ${totalAssociations}\n`);

    // Count by status
    const statusCounts = await db.userPaperState.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: { id: true },
    });

    console.log("Associations by status:");
    statusCounts.forEach(({ status, _count }) => {
      console.log(`  ${status}: ${_count.id}`);
    });

    // Show recent associations (last 10)
    const recentAssociations = await db.userPaperState.findMany({
      where: { userId: user.id },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            arxivId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    console.log(`\n📄 Recent associations (last 10):\n`);
    recentAssociations.forEach((association, index) => {
      const title = association.paper.title.length > 60
        ? association.paper.title.substring(0, 60) + "..."
        : association.paper.title;
      console.log(`${index + 1}. [${association.status}] ${title}`);
      console.log(`   Paper ID: ${association.paperId}`);
      console.log(`   Created: ${association.createdAt.toISOString()}`);
      console.log();
    });
  } catch (error) {
    console.error("Error checking library associations:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Get user email from command line args
const userEmail = process.argv[2];

checkLibraryAssociations(userEmail);
