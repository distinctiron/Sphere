import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { seedPapersForUser } from "@/lib/seed-papers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, categories = [], articleCount = 20 } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate categories (must be array of strings)
    if (!Array.isArray(categories)) {
      return NextResponse.json(
        { error: "Categories must be an array" },
        { status: 400 }
      );
    }

    // Validate articleCount (must be a number between 5 and 100)
    const count = typeof articleCount === "number" ? articleCount : parseInt(articleCount, 10);
    if (isNaN(count) || count < 5 || count > 100 || ![5, 10, 20, 50, 100].includes(count)) {
      return NextResponse.json(
        { error: "Article count must be 5, 10, 20, 50, or 100" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    // Hash password (NFR5: passwords must be hashed and salted)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Billing plan with an empty wallet: the user starts on the free tier
    await db.paymentPlan.create({ data: { userId: user.id } });

    // Seed papers in the background (don't block registration response)
    // If seeding fails, user is still created and can use the app
    seedPapersForUser({
      userId: user.id,
      categoryCodes: categories,
      articleCount: count,
    }).catch((error) => {
      console.error("Error seeding papers during registration:", error);
      // Don't fail registration if seeding fails - papers can be fetched later
    });

    // Return success immediately (seeding happens in background)
    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}

