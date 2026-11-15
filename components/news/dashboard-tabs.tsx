import Link from "next/link";

const TABS = [
  { id: "papers", label: "Papers", href: "/dashboard" },
  { id: "news", label: "News", href: "/dashboard?tab=news" },
  { id: "learn", label: "Learn", href: "/learn" },
] as const;

export type DashboardTab = (typeof TABS)[number]["id"];

/** Papers | News | Learn switch; the current section gets a blue brush stroke */
export function DashboardTabs({ active }: { active?: DashboardTab }) {
  return (
    <nav aria-label="Dashboard sections" className="sk-segs">
      {TABS.map(({ id, label, href }) => (
        <Link key={id} href={href} aria-current={active === id ? "page" : undefined} className="sk-seg">
          <span className="sk-bseg" aria-hidden="true" />
          <span className="lbl">{label}</span>
        </Link>
      ))}
    </nav>
  );
}
