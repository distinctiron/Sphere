"use client";

import { Button } from "@/components/ui/button";
import { SketchCard } from "@/components/sketch";
import { AppHeader } from "@/components/sketch/app-header";
import { CancelMark } from "@/components/payment/sketch-marks";
import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1240px] flex-col gap-8 px-6 pb-16 pt-6">
      <AppHeader />
      <div className="flex flex-1 items-center justify-center">
        <SketchCard seed="pay-cancel" w={560} h={440} hover wedge as="section" aria-labelledby="no-h" wrapClassName="w-full max-w-xl" className="px-[34px] pb-[34px] pt-9">
          <div className="flex flex-col items-center text-center">
            <CancelMark />
            <h1 id="no-h" className="mb-1.5 mt-3.5 font-hand text-[42px] font-bold leading-none">Payment Cancelled</h1>
            <p className="mb-[18px] max-w-[420px]">
              Your payment was cancelled. No charges were made to your account.
            </p>
            <p className="sk-muted m-0 max-w-[440px] text-sm">
              You can try again anytime. Your account remains unchanged.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3.5">
              <Button asChild>
                <Link href="/profile">Try Again</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          </div>
        </SketchCard>
      </div>
    </div>
  );
}
