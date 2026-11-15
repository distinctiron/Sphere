import Link from "next/link";
import { BrushTag, Brush, SketchCard, SketchCorner, SketchFrame, SketchLogo } from "@/components/sketch";
import { rng, ring, shade, type BrushColor } from "@/lib/sketch";

const pt = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;

const POINTS: { key: keyof typeof ICONS; tag: string; color: BrushColor; title: string; body: string }[] = [
  {
    key: "paper",
    tag: "arXiv",
    color: "yellow",
    title: "Papers, ranked by novelty",
    body: "New arXiv papers in the categories you follow, each with a novelty score and a short note on what is actually new.",
  },
  {
    key: "news",
    tag: "news",
    color: "pink",
    title: "Breaking in AI",
    body: "Stories from Hacker News, Reddit, GitHub, X and news outlets, grouped into one story and written up from the sources.",
  },
  {
    key: "learn",
    tag: "4 paths",
    color: "green",
    title: "Learn the field",
    body: "Short lessons on the math, compute, building with AI and the AI economy, with quizzes and a tutor.",
  },
  {
    key: "chat",
    tag: "deep dive",
    color: "blue",
    title: "Chat with a paper",
    body: "Select any passage to get it explained, or ask questions; answers cite the exact passages they came from.",
  },
];

/** Hand-drawn icons: outline first, details second. */
const ICONS = {
  paper: ["M12 6 L 30 5 L 38 13 L 37 43 L 12 43 Z M30 5 L 30 13 L 38 13", "M17 22 L 32 22 M17 28 L 32 28 M17 34 L 27 34"],
  news: ["M7 12 L 41 11 L 41 39 L 8 40 Z", "M13 18 L 24 18 L 24 28 L 13 28 Z M29 18 L 36 18 M29 23 L 36 23 M13 34 L 36 34"],
  learn: ["M4 18 L 24 9 L 44 18 L 24 27 Z", "M12 22 L 12 33 C 18 38, 30 38, 36 33 L 36 22 M44 18 L 44 30"],
  chat: ["M6 10 L 34 9 L 34 28 L 18 28 L 10 35 L 11 28 L 6 28 Z", "M22 32 L 22 36 L 36 36 L 42 41 L 41 36 L 44 35 L 43 18 L 38 18"],
};

const HERO = (() => {
  const R = rng(65);
  const orbit: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const a = -0.4 + (i / 60) * Math.PI * 2.05;
    orbit.push(pt(130 + 128 * Math.cos(a) + (R() - 0.5), 130 + 34 * Math.sin(a) - 10 * Math.cos(a) + (R() - 0.5)));
  }
  return {
    a: ring(130, 130, 106, 61, 1.08),
    b: ring(130, 130, 109, 62, 0.95),
    shade: shade(130, 130, 102, 63, 0.25, 4.2),
    shade2: shade(130, 130, 100, 64, 0.5, 5.5, Math.PI / 4 + 0.5),
    orbit: "M" + orbit.join(" L"),
  };
})();

const delay = (s: number) => ({ animationDelay: `${s}s` });

function CtaButton({ href, seed, primary, corner, children }: { href: string; seed: string; primary?: boolean; corner?: boolean; children: string }) {
  return (
    <Link href={href} className={primary ? "sk-btn primary" : "sk-btn ghost"}>
      <span className="sk-bsw" aria-hidden="true" />
      <SketchFrame seed={seed} w={primary ? 200 : 130} h={46} />
      {corner && <SketchCorner seed={`${seed}:c`} size="button" delay={1.4} />}
      <span className="lbl">{children}</span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-14 px-6 pb-[72px] pt-6">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <SketchLogo />
            <span className="font-hand text-[34px] font-bold leading-none">Sphere</span>
          </Link>
          <nav aria-label="Account" className="ml-auto flex flex-wrap items-center gap-2.5">
            <Link href="/login" className="px-3 py-2 font-hand text-[24px] font-bold">
              Sign in
            </Link>
            <Link href="/register" className="sk-btn small">
              <span className="sk-bsw" aria-hidden="true" />
              <SketchFrame seed="landing-nav-cta" w={160} h={44} />
              <span className="lbl">Create account</span>
            </Link>
          </nav>
        </header>

        <section className="flex flex-wrap items-center gap-x-14 gap-y-10">
          <div className="relative mx-auto h-[260px] w-[260px] flex-none">
            <svg width={260} height={260} viewBox="0 0 260 260" aria-hidden="true" className="overflow-visible">
              <path className="sk-draw sh" pathLength={1} d={HERO.shade} style={{ animationDelay: "1.6s", animationDuration: "2.2s" }} />
              <path className="sk-draw sh2" pathLength={1} d={HERO.shade2} style={{ animationDelay: "2.6s", animationDuration: "1.8s" }} />
              <path className="sk-draw" pathLength={1} d={HERO.a} style={{ strokeWidth: 2.8, animationDuration: "1.3s" }} />
              <path className="sk-draw p2" pathLength={1} d={HERO.b} style={delay(0.7)} />
              <path className="sk-draw thin" pathLength={1} d="M28 140 C 70 172, 190 172, 232 132" style={delay(1)} />
              <path className="sk-draw p2" pathLength={1} d="M30 112 C 80 88, 180 86, 230 108" style={delay(1.2)} />
              <path className="sk-draw thin" pathLength={1} d="M128 22 C 82 70, 84 190, 134 240" style={delay(1.1)} />
              <path className="sk-draw p2" pathLength={1} d="M132 20 C 176 68, 178 186, 128 238" style={delay(1.35)} />
              <path className="sk-draw red thin" pathLength={1} d={HERO.orbit} style={{ animationDelay: "2s", animationDuration: "1.2s" }} />
            </svg>
          </div>
          <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
            <p className="m-0 origin-left -rotate-2 font-hand text-[26px] text-pen">for people who read arXiv every morning</p>
            <h1 className="m-0 font-hand text-[clamp(72px,10vw,104px)] font-bold leading-[0.9]">Sphere</h1>
            <p className="m-0 max-w-[560px] text-[26px] leading-[1.35]">
              An AI-powered{" "}
              <Brush color="yellow" delay={1} className="px-1.5">
                research companion
              </Brush>
              : it reads the new papers, tells you which ones are new ideas, and helps you understand them.
            </p>
            <div className="mt-2 flex flex-wrap gap-3.5">
              <CtaButton href="/register" seed="landing-cta" primary corner>
                Create account
              </CtaButton>
              <CtaButton href="/login" seed="landing-cta-2">
                Sign in
              </CtaButton>
            </div>
          </div>
        </section>

        <section aria-labelledby="what-h" className="flex flex-col gap-[22px]">
          <div>
            <h2 id="what-h" className="m-0 font-hand text-[44px] font-bold leading-none">
              What it does
            </h2>
            <svg width={220} height={14} viewBox="0 0 220 14" aria-hidden="true" className="block max-w-full overflow-visible">
              <path className="sk-draw" pathLength={1} d="M3 8 C 60 3, 120 12, 216 6" style={delay(0.4)} />
              <path className="sk-draw p2" pathLength={1} d="M212 10 C 150 9, 80 13, 8 11" style={{ animationDelay: "1s", animationDuration: ".6s" }} />
            </svg>
          </div>
          <div className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,250px),1fr))]">
            {POINTS.map((p, i) => (
              <SketchCard
                key={p.key}
                seed={`landing-point-${p.key}`}
                as="article"
                w={270}
                h={240}
                hover
                wedge
                wrapClassName="h-full"
                className="box-border h-full min-h-[230px] px-5 py-[22px]"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden="true" className="flex-none overflow-visible">
                      <path className="sk-draw" pathLength={1} d={ICONS[p.key][0]} style={delay(0.3 + i * 0.2)} />
                      <path className="sk-draw p2" pathLength={1} d={ICONS[p.key][1]} style={delay(0.8 + i * 0.2)} />
                    </svg>
                    <BrushTag color={p.color} variant={p.key} size="sm" delay={0.8 + i * 0.2}>
                      {p.tag}
                    </BrushTag>
                  </div>
                  <h3 className="m-0 font-hand text-[32px] font-bold leading-none">{p.title}</h3>
                  <p className="m-0 text-[15px]">{p.body}</p>
                </div>
              </SketchCard>
            ))}
          </div>
        </section>

        <SketchCard seed="landing-end" as="section" w={1130} h={130} panel className="px-[30px] py-7">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-[18px]">
            <p className="m-0 flex-[1_1_360px] font-hand text-[34px] font-bold leading-[1.1]">
              Pick the arXiv categories you follow, and your first papers are waiting when you sign in.
            </p>
            <CtaButton href="/register" seed="landing-cta-3" primary>
              Create account
            </CtaButton>
          </div>
        </SketchCard>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-pencil">
          <span className="font-hand text-[20px]">Sphere</span>
          <span>Papers come from arXiv. News comes from Hacker News, Reddit, GitHub, X and news outlets.</span>
        </footer>
      </div>
    </div>
  );
}
