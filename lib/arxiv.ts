/**
 * arXiv API Service
 * 
 * Handles fetching and parsing papers from the arXiv API
 * API Documentation: https://info.arxiv.org/help/api/user-manual.html
 */

import { XMLParser } from "fast-xml-parser";

const ARXIV_API_BASE = "https://export.arxiv.org/api/query";

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: Array<{ name: string }>;
  published: string;
  updated: string;
  categories: string[];
  links: Array<{ rel: string; type?: string; href: string }>;
}

export interface ParsedPaper {
  arxivId: string;
  title: string;
  authors: Array<{ name: string }>;
  abstract: string;
  publicationDate: Date;
  updatedDate: Date;
  categories: string[];
  pdfUrl: string;
  htmlUrl: string;
}

/**
 * Extract arXiv ID from the id URL
 * Example: "http://arxiv.org/abs/2512.25075v1" -> "2512.25075v1"
 */
function extractArxivId(idUrl: string): string {
  const match = idUrl.match(/arxiv\.org\/abs\/(.+)$/);
  if (!match) {
    throw new Error(`Invalid arXiv ID URL: ${idUrl}`);
  }
  return match[1];
}

/**
 * Construct HTML URL from arXiv ID
 * Example: "2512.25075v1" -> "https://arxiv.org/html/2512.25075v1"
 */
function constructHtmlUrl(arxivId: string): string {
  return `https://arxiv.org/html/${arxivId}`;
}

/**
 * Parse XML response from arXiv API
 */
function parseXmlResponse(xmlString: string): ArxivEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });

  const parsed = parser.parse(xmlString);
  const feed = parsed.feed;

  if (!feed || !feed.entry) {
    return [];
  }

  // Handle single entry (object) or multiple entries (array)
  const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];

  return entries.map((entry: any) => {
    // Extract authors
    const authors = Array.isArray(entry.author) ? entry.author : [entry.author];
    const authorNames = authors.map((a: any) => ({
      name: typeof a === "string" ? a : a.name || a["#text"] || "",
    }));

    // Extract categories
    const categories = Array.isArray(entry.category)
      ? entry.category.map((c: any) => (typeof c === "string" ? c : c["@_term"] || ""))
      : [typeof entry.category === "string" ? entry.category : entry.category?.["@_term"] || ""];

    // Extract links
    const links = Array.isArray(entry.link) ? entry.link : [entry.link];
    const linkObjects = links.map((link: any) => ({
      rel: link["@_rel"] || "",
      type: link["@_type"] || "",
      href: link["@_href"] || "",
    }));

    return {
      id: entry.id?.["#text"] || entry.id || "",
      title: entry.title?.["#text"] || entry.title || "",
      summary: entry.summary?.["#text"] || entry.summary || "",
      authors: authorNames,
      published: entry.published?.["#text"] || entry.published || "",
      updated: entry.updated?.["#text"] || entry.updated || "",
      categories: categories.filter((c: string) => c),
      links: linkObjects,
    };
  });
}

/**
 * Convert ArxivEntry to ParsedPaper
 */
function convertToParsedPaper(entry: ArxivEntry): ParsedPaper {
  const arxivId = extractArxivId(entry.id);
  const htmlUrl = constructHtmlUrl(arxivId);

  // Find PDF link
  const pdfLink = entry.links.find(
    (link) => link.rel === "related" && link.type === "application/pdf"
  );
  const pdfUrl = pdfLink?.href || "";

  if (!pdfUrl) {
    throw new Error(`PDF URL not found for paper ${arxivId}`);
  }

  return {
    arxivId,
    title: entry.title.trim(),
    authors: entry.authors,
    abstract: entry.summary.trim(),
    publicationDate: new Date(entry.published),
    updatedDate: new Date(entry.updated),
    categories: entry.categories,
    pdfUrl,
    htmlUrl,
  };
}

/**
 * Format a date for arXiv submittedDate range queries.
 * Format: YYYYMMDDHHMM in GMT (e.g. 202609281530)
 */
export function formatArxivDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`
  );
}

/**
 * Build a search query for papers in the given categories submitted within a window.
 * Example: (cat:cs.* OR cat:physics.*) AND submittedDate:[202609240000 TO 202609281200]
 */
export function buildSubmittedDateQuery(categories: string[], from: Date, to: Date): string {
  const categoryClause = categories.map((c) => `cat:${c}`).join(" OR ");
  return `(${categoryClause}) AND submittedDate:[${formatArxivDateTime(from)} TO ${formatArxivDateTime(to)}]`;
}

export class ArxivApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ArxivApiError";
  }
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;

/**
 * Search the arXiv API (one page of results).
 * Retries rate-limit and server errors with backoff (honouring Retry-After).
 */
export async function searchArxiv(options: {
  searchQuery: string;
  start?: number;
  maxResults?: number;
  signal?: AbortSignal;
}): Promise<{ papers: ParsedPaper[]; totalResults: number }> {
  const params = new URLSearchParams({
    search_query: options.searchQuery,
    start: String(options.start ?? 0),
    max_results: String(options.maxResults ?? 100),
    sortBy: "submittedDate",
    sortOrder: "descending",
  });
  const url = `${ARXIV_API_BASE}?${params.toString()}`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Sphere/1.0 (Research Companion)" },
        signal: options.signal,
      });

      if (!response.ok) {
        throw new ArxivApiError(
          `arXiv API returned status ${response.status}: ${response.statusText}`,
          response.status
        );
      }

      const xmlString = await response.text();
      const totalMatch = xmlString.match(/<opensearch:totalResults[^>]*>(\d+)<\/opensearch:totalResults>/);

      const papers: ParsedPaper[] = [];
      for (const entry of parseXmlResponse(xmlString)) {
        try {
          papers.push(convertToParsedPaper(entry));
        } catch (error) {
          console.error(`Error parsing paper entry:`, error);
          // Continue processing other papers even if one fails
        }
      }

      return { papers, totalResults: totalMatch ? parseInt(totalMatch[1], 10) : papers.length };
    } catch (error) {
      lastError = error;
      const retryable =
        error instanceof ArxivApiError ? RETRYABLE_STATUSES.has(error.status) : !options.signal?.aborted;
      if (!retryable || attempt === MAX_ATTEMPTS) break;
      await new Promise((resolve) => setTimeout(resolve, 3000 * 2 ** (attempt - 1)));
    }
  }
  throw lastError;
}

/**
 * Fetch papers from arXiv API
 * 
 * @param sinceDate - Currently not used (arXiv API date queries are problematic)
 *                    Fetches most recent papers sorted by submission date
 * @param maxResults - Maximum number of results (default: 100)
 * @param categoryFilter - Optional category filter (e.g., "cat:cs.* OR cat:physics.*")
 *                         Defaults to "cat:*" (all categories)
 */
export async function fetchPapersFromArxiv(
  sinceDate: Date | null = null,
  maxResults: number = 100,
  categoryFilter: string = "cat:*"
): Promise<ParsedPaper[]> {
  try {
    const { papers } = await searchArxiv({ searchQuery: categoryFilter, maxResults });
    return papers;
  } catch (error) {
    console.error("Error fetching papers from arXiv:", error);
    throw error;
  }
}
