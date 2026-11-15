import Link from "next/link";
import { LockMark } from "@/components/payment/sketch-marks";

/** Error body of a 402 from an AI route (lib/billing/account.ts → aiAccessDenied) */
export interface BillingDenial {
  code: "FREE_TIER" | "INSUFFICIENT_BALANCE" | "FAIR_USE_REACHED";
  message: string;
}

/** Reads a 402 response from an AI route; null for any other response */
export async function readBillingDenial(response: Response): Promise<BillingDenial | null> {
  if (response.status !== 402) return null;
  const data = await response.json().catch(() => ({}));
  return { code: data.code ?? "FREE_TIER", message: data.message ?? "This needs a paid plan." };
}

/** Compact inline notice for AI panels (Deep Dive, Intellisense, tutor) */
export function UpgradeNotice({ denial, className }: { denial: BillingDenial; className?: string }) {
  const cta = denial.code === "FREE_TIER" ? "See plans" : "Top up wallet";
  return (
    <div role="alert" className={`flex items-start gap-3 bg-[rgba(255,212,59,.18)] px-4 py-3 ${className ?? ""}`}>
      <span className="mt-0.5 shrink-0 scale-75">
        <LockMark />
      </span>
      <div className="text-sm">
        <p className="m-0">{denial.message}</p>
        <Link href="/profile#billing" className="mt-1 inline-block font-semibold underline">
          {cta}
        </Link>
      </div>
    </div>
  );
}
