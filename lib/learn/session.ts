import { redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/news/session";

/** The signed-in user's id; redirects to login (returning to `path`) otherwise */
export async function requireLearner(path: string): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  return userId;
}
