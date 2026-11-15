"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { DashboardTabs, type DashboardTab } from "@/components/news/dashboard-tabs";
import { SketchLogo, SketchRing } from "@/components/sketch";

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "").trim();
  if (!src) return "?";
  const parts = src.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (name ? parts[1]?.[0] ?? "" : "")).toUpperCase() || "?";
}

/** Shared app header: sketched logo, Papers | News | Learn tabs, extra actions and the account avatar */
export function AppHeader({ active, actions }: { active?: DashboardTab; actions?: ReactNode }) {
  const { data } = useSession();
  return (
    <header className="flex flex-wrap items-center gap-x-7 gap-y-3">
      <Link href="/dashboard" className="flex items-center gap-2.5 no-underline">
        <SketchLogo />
        <span className="font-hand text-[34px] font-bold leading-none">Sphere</span>
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-3">
        <DashboardTabs active={active} />
        {actions}
        {data?.user && (
          <Link href="/profile" className="sk-icon font-hand text-[22px] font-bold no-underline" aria-label="Your account">
            <SketchRing seed="avatar" size={44} shading={0.55}>
              {initials(data.user.name, data.user.email)}
            </SketchRing>
          </Link>
        )}
      </div>
    </header>
  );
}
