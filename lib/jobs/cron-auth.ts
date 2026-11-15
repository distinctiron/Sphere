import { timingSafeEqual } from "crypto";

/**
 * Validates "Authorization: Bearer <CRON_SECRET>" (the header Vercel Cron sends).
 * Returns an error message, or null when authorized.
 */
export function checkCronAuth(request: Request): { error: string; status: number } | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return { error: "Cron endpoints are disabled (CRON_SECRET is not set)", status: 503 };
  }
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return { error: "Unauthorized", status: 401 };
  }
  return null;
}
