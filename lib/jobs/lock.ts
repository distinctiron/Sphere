/**
 * Database-backed job locks
 *
 * Ensures only one instance of a job runs at a time, even when the in-process
 * scheduler, the cron HTTP endpoint and the CLI are used side by side.
 * Locks expire automatically so a crashed run cannot block a job forever.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function acquireJobLock(
  name: string,
  owner: string,
  ttlMs: number
): Promise<boolean> {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);

  // Take over an expired lock
  const taken = await db.jobLock.updateMany({
    where: { name, lockedUntil: { lt: now } },
    data: { owner, lockedUntil, acquiredAt: now },
  });
  if (taken.count > 0) return true;

  // No lock row yet: create it. A unique violation means someone else holds it.
  try {
    await db.jobLock.create({ data: { name, owner, lockedUntil, acquiredAt: now } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false;
    }
    throw error;
  }
}

export async function releaseJobLock(name: string, owner: string): Promise<void> {
  await db.jobLock.deleteMany({ where: { name, owner } });
}
