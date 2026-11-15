import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ring } from "@/lib/sketch";
import { SketchCard, SketchDivider, SketchFrame, SketchLogo } from "@/components/sketch";

/** Centered column with the sketched Sphere mark above the auth card. */
export function AuthShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen px-5 pb-[72px] pt-10">
      <div className={cn("mx-auto flex flex-col gap-[26px]", wide ? "max-w-[820px]" : "max-w-[480px]")}>
        <Link href="/" className="flex items-center justify-center gap-2.5 no-underline">
          <SketchLogo />
          <span className="font-hand text-[34px] font-bold leading-none">Sphere</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

/** Two quick red-pen strokes under a heading. */
export function PenUnderline({ width = 150 }: { width?: number }) {
  const w = width;
  return (
    <svg width={w} height={14} viewBox={`0 0 ${w} 14`} aria-hidden="true" className="block max-w-full overflow-visible">
      <path className="sk-draw red" pathLength={1} d={`M3 8 C ${w * 0.27} 3, ${w * 0.6} 12, ${w - 4} 6`} style={{ animationDelay: ".3s" }} />
      <path
        className="sk-draw red p2"
        pathLength={1}
        d={`M${w - 8} 10 C ${w * 0.66} 9, ${w * 0.33} 13, 6 11`}
        style={{ animationDelay: ".8s", animationDuration: ".5s" }}
      />
    </svg>
  );
}

/** The auth card: a framed sheet with corner shading, a handwritten title and a muted subtitle. */
export function AuthCard({
  seed,
  title,
  subtitle,
  titleId,
  underline = 150,
  size = "lg",
  children,
}: {
  seed: string;
  title: ReactNode;
  subtitle?: ReactNode;
  titleId: string;
  underline?: number;
  size?: "lg" | "md";
  children?: ReactNode;
}) {
  return (
    <SketchCard
      seed={seed}
      as="section"
      aria-labelledby={titleId}
      w={440}
      h={640}
      hover
      panel
      wedge
      className={size === "lg" ? "px-7 pb-[26px] pt-[30px]" : "px-[22px] py-6"}
    >
      <div className="flex flex-col gap-[18px]">
        <div>
          <h1 id={titleId} className={cn("m-0 font-hand font-bold leading-none", size === "lg" ? "text-[52px]" : "text-[36px]")}>
            {title}
          </h1>
          <PenUnderline width={underline} />
          {subtitle && <p className="m-0 mt-2 text-pencil">{subtitle}</p>}
        </div>
        {children}
      </div>
    </SketchCard>
  );
}

/** A note on paper: a green tick for success, a red cross for errors. */
export function AuthNotice({ tone, seed, children }: { tone: "success" | "error"; seed: string; children: ReactNode }) {
  const ok = tone === "success";
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn("relative flex items-start gap-3 bg-sheet py-3.5 pl-3.5 pr-[18px]", ok && "-rotate-[0.6deg]")}
    >
      <SketchFrame seed={seed} w={440} h={70} tone={ok ? "green" : "red"} />
      {ok ? (
        <svg width={30} height={26} viewBox="0 0 34 28" aria-hidden="true" className="relative mt-0.5 flex-none overflow-visible">
          <path className="sk-draw green" pathLength={1} d="M3 15 C 7 18, 10 21, 12 24 C 17 15, 23 8, 31 3" style={{ animationDuration: ".5s", animationDelay: ".4s" }} />
          <path className="sk-draw green p2" pathLength={1} d="M5 14 C 8 17, 11 20, 13 22 C 18 14, 24 8, 32 5" style={{ animationDelay: ".85s", animationDuration: ".4s" }} />
        </svg>
      ) : (
        <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true" className="relative mt-0.5 flex-none overflow-visible">
          <path className="sk-draw red" pathLength={1} d="M5 5.5 C 10 10, 14 14.5, 19 19" style={{ animationDelay: ".3s", animationDuration: ".35s" }} />
          <path className="sk-draw red" pathLength={1} d="M19 5 C 14 10.5, 10 14, 5.2 19" style={{ animationDelay: ".6s", animationDuration: ".35s" }} />
        </svg>
      )}
      <p className={cn("relative m-0 text-[15px]", !ok && "sk-err")}>{children}</p>
    </div>
  );
}

/** "Or continue with email" between two pencil rules. */
export function OrDivider({ label, seed }: { label: string; seed: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <SketchDivider seed={`${seed}:l`} w={120} className="flex-1" />
      <span className="whitespace-nowrap font-hand text-[20px] text-pencil">{label}</span>
      <SketchDivider seed={`${seed}:r`} w={120} className="flex-1" />
    </div>
  );
}

/** Federated sign-in button: pencil frame, a circled initial, the provider label. */
export function OAuthButton({
  letter,
  label,
  seed,
  onClick,
  disabled,
}: {
  letter: string;
  label: string;
  seed: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className="sk-btn ghost w-full justify-start px-4 font-sans text-[15px] font-semibold"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="sk-bsw" aria-hidden="true" />
      <SketchFrame seed={seed} w={384} h={46} />
      <span className="lbl">
        <span className="relative inline-flex h-7 w-7 items-center justify-center font-hand text-[20px] font-bold">
          <svg width={28} height={28} viewBox="0 0 28 28" aria-hidden="true" className="absolute inset-0 overflow-visible">
            <path className="sk-ink" strokeWidth={1.6} d={ring(14, 14, 12, seed.length * 37 + letter.charCodeAt(0))} />
          </svg>
          <span className="relative">{letter}</span>
        </span>
        {label}
      </span>
    </button>
  );
}

/** Handwritten link with a red-pen underline. */
export function HandLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} className={cn("sk-uline font-hand text-[22px] font-bold", className)}>
      {children}
    </a>
  );
}

/** Class for react-hook-form messages: red pen, handwritten. */
export const penMessage = "font-hand text-[22px] font-normal leading-tight text-pen -rotate-1 origin-left";
