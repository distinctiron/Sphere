/**
 * Normalisation helpers for news items: canonical URLs (so the same article
 * shared on HN, Reddit and X is recognised as one story), HTML to text, and
 * snippet truncation.
 */

import { parse } from "node-html-parser";

const TRACKING_PARAMS = new Set([
  "ref",
  "ref_src",
  "ref_url",
  "source",
  "src",
  "via",
  "fbclid",
  "gclid",
  "igshid",
  "mc_cid",
  "mc_eid",
  "cmpid",
  "s",
  "t",
  "si",
  "share",
  "smid",
  "sref",
  "guccounter",
  "guce_referrer",
  "guce_referrer_sig",
  "oc",
]);

/** Hosts whose URLs differ only cosmetically from their canonical host */
const HOST_ALIASES: Record<string, string> = {
  "twitter.com": "x.com",
  "mobile.twitter.com": "x.com",
  "mobile.x.com": "x.com",
  "old.reddit.com": "reddit.com",
  "new.reddit.com": "reddit.com",
  "m.youtube.com": "youtube.com",
  "youtu.be": "youtube.com",
};

/**
 * Canonical form of a URL for de-duplication across sources: lower-case host
 * without "www.", no fragment, no tracking parameters, no trailing slash,
 * sorted query, arXiv abs/pdf/html unified. Returns the input when unparseable.
 */
export function canonicalizeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return input.trim();
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return input.trim();

  let host = url.hostname.toLowerCase().replace(/^www\./, "");
  host = HOST_ALIASES[host] ?? host;

  let path = url.pathname.replace(/\/+$/, "") || "/";
  if (host === "youtube.com" && url.hostname.endsWith("youtu.be")) {
    url.searchParams.set("v", path.slice(1));
    path = "/watch";
  }
  if (host === "arxiv.org") {
    // abs, pdf and html versions of a paper are the same story
    const match = path.match(/^\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?$/);
    if (match) path = `/abs/${match[1]}`;
  }
  if (host === "x.com") {
    // x.com/user/status/123?s=20 → x.com/i/status/123 (the handle can change)
    const match = path.match(/^\/[^/]+\/status\/(\d+)/);
    if (match) path = `/i/status/${match[1]}`;
  }

  const params = Array.from(url.searchParams.entries())
    .filter(([key]) => !key.toLowerCase().startsWith("utm_") && !TRACKING_PARAMS.has(key.toLowerCase()))
    .sort(([a], [b]) => a.localeCompare(b));
  const query = params.length ? `?${new URLSearchParams(params).toString()}` : "";

  return `https://${host}${path === "/" ? "" : path}${query}`;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  "#39": "'",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
    if (lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10));
    return ENTITIES[lower] ?? match;
  });
}

/** Plain text from an HTML fragment, whitespace collapsed */
export function htmlToText(html: string): string {
  if (!html) return "";
  if (!/[<&]/.test(html)) return html.replace(/\s+/g, " ").trim();
  const root = parse(html, { blockTextElements: { script: false, style: false, pre: true } });
  root.querySelectorAll("script, style, img, figure, iframe, svg").forEach((el) => el.remove());
  root.querySelectorAll("p, div, li, br, h1, h2, h3, h4, h5, h6, tr").forEach((el) => el.insertAdjacentHTML("afterend", " "));
  return decodeEntities(root.textContent).replace(/\s+/g, " ").trim();
}

/** Truncates on a word boundary and appends an ellipsis */
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Normalised title for display and embedding */
export function cleanTitle(title: string): string {
  return decodeEntities(title).replace(/\s+/g, " ").trim();
}

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}
