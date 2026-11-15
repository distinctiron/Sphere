/** Display helpers for the News UI (client-safe) */

import type { NewsSourceId } from "./types";

export function timeAgo(iso: string, now: number = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function formatCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}k`;
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(value);
}

/** "412 points", "1.2k upvotes", "900 stars" */
export function engagementLabel(source: NewsSourceId, value: number): string | null {
  if (value <= 0) return null;
  const unit = source === "github" ? "★" : source === "reddit" ? "upvotes" : "points";
  return source === "github" ? `★ ${formatCount(value)}` : `${formatCount(value)} ${unit}`;
}
