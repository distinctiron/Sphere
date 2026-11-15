/**
 * Minimal RSS 2.0 / Atom parser on top of fast-xml-parser (already used for
 * the arXiv API). Returns a uniform list of entries; text fields are raw
 * (possibly HTML) strings.
 */

import { XMLParser } from "fast-xml-parser";

export interface FeedEntry {
  id: string;
  title: string;
  link: string;
  /** HTML or text content (content:encoded / content / description / summary) */
  content: string;
  author?: string;
  published?: Date;
  /** <source> element of aggregator feeds (Google News) */
  sourceName?: string;
  categories: string[];
}

export interface ParsedFeed {
  title: string;
  entries: FeedEntry[];
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  parseTagValue: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  isArray: (name) => name === "item" || name === "entry" || name === "link" || name === "category",
});

type XmlNode = string | number | { [key: string]: unknown } | undefined | null;

function text(node: unknown): string {
  if (node === undefined || node === null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return text(node[0]);
  const value = (node as Record<string, unknown>)["#text"];
  return value === undefined ? "" : String(value);
}

function categories(nodes: unknown): string[] {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .map((c) => (typeof c === "object" && c && "@_term" in c ? String((c as Record<string, unknown>)["@_term"]) : text(c)))
    .filter(Boolean);
}

function parseDate(value: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function atomLink(links: unknown): string {
  const list = (Array.isArray(links) ? links : [links]) as XmlNode[];
  const alternate =
    list.find((l) => typeof l === "object" && l && (!("@_rel" in l) || (l as Record<string, unknown>)["@_rel"] === "alternate")) ??
    list[0];
  if (typeof alternate === "object" && alternate) return String((alternate as Record<string, unknown>)["@_href"] ?? text(alternate));
  return text(alternate);
}

export function parseFeed(xml: string): ParsedFeed {
  const doc = parser.parse(xml) as Record<string, any>;

  if (doc.rss?.channel || doc["rdf:RDF"]) {
    const channel = doc.rss?.channel ?? doc["rdf:RDF"];
    const items: any[] = channel.item ?? doc["rdf:RDF"]?.item ?? [];
    return {
      title: text(channel.title),
      entries: items.map((item) => {
        const link = Array.isArray(item.link) ? text(item.link[0]) : text(item.link);
        return {
          id: text(item.guid) || link,
          title: text(item.title),
          link,
          content: text(item["content:encoded"]) || text(item.description),
          author: text(item["dc:creator"]) || text(item.author) || undefined,
          published: parseDate(text(item.pubDate) || text(item["dc:date"])),
          sourceName: text(item.source) || undefined,
          categories: categories(item.category),
        };
      }),
    };
  }

  if (doc.feed) {
    const entries: any[] = doc.feed.entry ?? [];
    return {
      title: text(doc.feed.title),
      entries: entries.map((entry) => {
        const link = atomLink(entry.link);
        return {
          id: text(entry.id) || link,
          title: text(entry.title),
          link,
          content: text(entry.content) || text(entry.summary) || text(entry["media:group"]?.["media:description"]),
          author: text(entry.author?.name) || undefined,
          published: parseDate(text(entry.published) || text(entry.updated)),
          categories: categories(entry.category),
        };
      }),
    };
  }

  throw new Error("Unrecognised feed format");
}
