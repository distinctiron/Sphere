import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/news/session";
import { getBillingAccount } from "@/lib/billing/account";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/billing
 * The signed-in user's tier, wallet balance, subscription and recent AI usage.
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [account, usage, payments] = await Promise.all([
    getBillingAccount(userId),
    db.usageEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, feature: true, billing: true, model: true, chargedMicros: true, createdAt: true },
    }),
    db.transaction.findMany({
      where: { userId, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, transactionType: true, amountCents: true, status: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({ ...account, usage, payments });
}
