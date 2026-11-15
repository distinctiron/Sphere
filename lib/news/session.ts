import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/** The signed-in user's id, or null (looked up by email, as in the papers API) */
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.email) return null;
  const user = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  return user?.id ?? null;
}
