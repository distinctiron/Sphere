import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/auth/reset-password/request
 * Request a password reset email
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate input
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists (but don't reveal if they don't - security best practice)
    const user = await db.user.findUnique({
      where: { email },
    });

    // Always return success message (don't reveal if email exists)
    // If user exists, generate token and send email
    if (user) {
      // Generate secure random token
      const token = crypto.randomBytes(32).toString("hex");
      
      // Token expires in 1 hour
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);

      // Store token in database (identifier is the email)
      // Delete any existing tokens for this email first
      await db.verificationToken.deleteMany({
        where: { identifier: email },
      });

      await db.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });

      // Generate reset link
      const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

      // Send email (for now, this logs to console)
      await sendPasswordResetEmail(email, resetLink);
    }

    // Always return success (security: don't reveal if email exists)
    return NextResponse.json(
      {
        message: "If an account exists, a password reset link has been sent to your email",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "An error occurred while processing your request" },
      { status: 500 }
    );
  }
}

