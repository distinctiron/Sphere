/**
 * Email service for sending password reset emails
 * 
 * For production, replace this with a real email service (Resend, SendGrid, etc.)
 * For now, this logs the email to the console for development/testing
 */

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<void> {
  // TODO: Replace with actual email service (Resend, SendGrid, etc.)
  // For development, we'll log the email to console
  console.log("=== PASSWORD RESET EMAIL ===");
  console.log(`To: ${email}`);
  console.log(`Subject: Reset your password`);
  console.log(`Reset Link: ${resetLink}`);
  console.log("============================");

  // In production, implement actual email sending:
  // Example with Resend:
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: email,
  //   subject: 'Reset your password',
  //   html: `Click <a href="${resetLink}">here</a> to reset your password.`
  // });
}

