/**
 * Seed Papers Script
 * 
 * Fetches the last 100 papers from arXiv (public API, no authentication required)
 * and stores them in the database. Creates UserPaperState entries with status NEW
 * for the specified user so the papers appear on their dashboard.
 * 
 * Note: arXiv API is public - we only need SEED_USER_EMAIL to associate papers
 * with a user account in the database.
 * 
 * Requires SEED_USER_EMAIL environment variable to be set in .env.local
 * Usage: npx tsx scripts/seed-papers.ts
 */

// Load environment variables from .env.local
import { config } from "dotenv";
import { resolve } from "path";

// Load .env.local file (Next.js convention) - use process.cwd() to get project root
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

// Load .env.local first, then .env as fallback
// dotenv will not override existing env vars, so .env.local takes precedence
const envLocalResult = config({ path: envLocalPath });
const envResult = config({ path: envPath });

// Debug: log which file was loaded (only in development)
if (process.env.NODE_ENV !== "production") {
  if (envLocalResult.parsed) {
    console.log("✅ Loaded environment variables from .env.local");
  } else if (envResult.parsed) {
    console.log("✅ Loaded environment variables from .env");
  } else {
    console.log("⚠️  No .env.local or .env file found");
  }
}

import { db } from "../lib/db";
import { seedPapersForUser } from "../lib/seed-papers";

async function seedPapers(userEmail: string) {
  console.log(`🌱 Starting paper seeding...`);
  console.log(`📧 Papers will be associated with user: ${userEmail}`);

  try {
    // Find user by email (needed to create UserPaperState entries)
    const user = await db.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.error(`❌ User with email ${userEmail} not found`);
      console.log("\nPlease register an account first or use an existing email.");
      console.log("Note: arXiv API is public and doesn't require authentication.");
      console.log("We only need your email to associate papers with your account in the database.");
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.id}`);

    // Fetch papers from arXiv (Computer Science and Physics categories)
    console.log("📡 Fetching papers from arXiv (Computer Science and Physics only)...");
    console.log("   (arXiv API is public - no authentication needed)");
    
    // Default to CS and Physics categories (matching the old behavior)
    const defaultCategories = [
      "cs.AI", "cs.LG", "cs.CV", "cs.CL", "cs.NE", "cs.RO", "cs.SY",
      "cs.SE", "cs.PL", "cs.DS", "cs.DB", "cs.CR", "cs.DC", "cs.OS",
      "cs.AR", "cs.CC", "cs.GT", "cs.LO", "cs.IT", "cs.MA", "cs.MM",
      "cs.NI", "cs.SI",
      "physics.optics", "physics.quant-ph", "physics.atom-ph",
      "physics.class-ph", "physics.chem-ph", "physics.comp-ph",
      "physics.data-an", "physics.flu-dyn", "physics.gen-ph",
      "physics.geo-ph", "physics.hist-ph", "physics.ins-det",
      "physics.med-ph", "physics.plasm-ph", "physics.pop-ph",
      "physics.soc-ph", "physics.space-ph",
    ];

    const result = await seedPapersForUser({
      userId: user.id,
      categoryCodes: defaultCategories,
      articleCount: 100,
    });

    console.log(`✅ Fetched and processed papers from arXiv`);
    console.log("\n✅ Seeding complete!");
    console.log(`   - New papers: ${result.newPapersCount}`);
    console.log(`   - Updated papers: ${result.updatedPapersCount}`);
    console.log(`   - New user paper states: ${result.newStatesCount}`);
    console.log(`   - Total papers in database: ${await db.paper.count()}`);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  }
}

// Get user email from environment variable
const userEmail = process.env.SEED_USER_EMAIL;

if (!userEmail) {
  console.error("❌ SEED_USER_EMAIL environment variable is not set");
  console.log("\nPlease set SEED_USER_EMAIL in your .env.local file:");
  console.log("  SEED_USER_EMAIL=your-email@example.com");
  console.log("\nThen run: npm run seed:papers");
  process.exit(1);
}

// Run the seeding
seedPapers(userEmail)
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
