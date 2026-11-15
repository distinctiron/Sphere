"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SketchCard, SketchRing } from "@/components/sketch";
import { AppHeader } from "@/components/sketch/app-header";
import { SuccessMark } from "@/components/payment/sketch-marks";
import Link from "next/link";

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1240px] flex-col gap-8 px-6 pb-16 pt-6">
      <AppHeader />
      <div className="flex flex-1 items-center justify-center">{children}</div>
    </div>
  );
}

type Confirmation = "waiting" | "confirmed" | "slow";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const type = searchParams.get("type") === "subscription" ? "subscription" : "top-up";
  const [state, setState] = useState<Confirmation>("waiting");

  // Money only moves when Stripe's webhook arrives, so poll until it has been applied
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    const startedAt = Date.now();
    const check = async () => {
      const response = await fetch("/api/billing", { cache: "no-store" }).catch(() => null);
      const data = response?.ok ? await response.json() : null;
      if (cancelled) return;
      if (data) {
        const done =
          type === "subscription"
            ? data.tier === "SUBSCRIPTION"
            : data.payments?.some((p: { transactionType: string; status: string; createdAt: string }) =>
                p.transactionType === "WALLET_TOP_UP" && p.status === "COMPLETED" && Date.parse(p.createdAt) > startedAt - 30 * 60 * 1000
              );
        if (done) return setState("confirmed");
      }
      if (Date.now() - startedAt > 20_000) return setState("slow");
      setTimeout(check, 1500);
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [sessionId, type]);

  if (!sessionId) {
    return (
      <Shell>
        <SketchCard seed="pay-error" w={480} h={220} tone="red" as="section" aria-labelledby="err-h" wrapClassName="w-full max-w-md" className="px-8 py-7">
          <h1 id="err-h" className="sk-red m-0 font-hand text-[38px] font-bold leading-none">Payment Error</h1>
          <p className="sk-muted mb-6 mt-2">Invalid session</p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </SketchCard>
      </Shell>
    );
  }

  const title = type === "subscription" ? "You're subscribed!" : "Wallet topped up!";
  const body =
    type === "subscription"
      ? "Unlimited Deep Dive chat, explanations, the lesson tutor and all tutorials are now included."
      : "Your credit is ready to use for Deep Dive chat, explanations, the lesson tutor and tutorials.";

  return (
    <Shell>
      <SketchCard seed="pay-success" w={560} h={460} hover wedge as="section" aria-labelledby="ok-h" wrapClassName="w-full max-w-xl" className="px-[34px] pb-[34px] pt-9">
        <div className="flex flex-col items-center text-center">
          {state === "waiting" ? (
            <SketchRing seed="pay-wait" size={56} shading={false} className="sk-pulse" />
          ) : (
            <SuccessMark />
          )}
          <h1 id="ok-h" className="mb-1.5 mt-3.5 font-hand text-[42px] font-bold leading-none">
            {state === "waiting" ? "Confirming payment…" : title}
          </h1>
          <p className="mb-[18px] max-w-[420px]">{state === "waiting" ? "Waiting for confirmation from Stripe." : body}</p>
          {state === "slow" && (
            <p role="status" className="m-0 max-w-[440px] bg-[rgba(255,212,59,.18)] px-4 py-3 text-sm">
              Stripe has taken your payment, but its confirmation hasn&apos;t reached Sphere yet. It usually arrives
              within a minute; your account page will show it. (Developing locally? Check that{" "}
              <code>stripe listen</code> is running.)
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3.5">
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/profile#billing">View Billing</Link>
            </Button>
          </div>
        </div>
      </SketchCard>
    </Shell>
  );
}

// useSearchParams needs a Suspense boundary so the page can be prerendered
export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<Shell><p className="font-hand text-2xl text-pencil">Loading…</p></Shell>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
