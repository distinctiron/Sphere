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

interface ParsedPaper {
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
 * Format date for arXiv API query
 * Format: YYYYMMDD
 */
function formatDateForQuery(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
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
    // Build query parameters
    // Note: Date filtering with submittedDate queries causes 500 errors from arXiv API
    // For now, fetch recent papers sorted by submission date
    // Client can filter by date after fetching if needed
    const params = new URLSearchParams({
      search_query: categoryFilter,
      start: "0",
      max_results: String(maxResults),
      sortBy: "submittedDate",
      sortOrder: "descending",
    });

    const url = `${ARXIV_API_BASE}?${params.toString()}`;

    // Fetch from arXiv API
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Sphere/1.0 (Research Companion)",
      },
    });

    if (!response.ok) {
      throw new Error(`arXiv API returned status ${response.status}: ${response.statusText}`);
    }

    const xmlString = await response.text();

    // Parse XML response
    const entries = parseXmlResponse(xmlString);

    // Convert to ParsedPaper format
    const papers: ParsedPaper[] = [];
    for (const entry of entries) {
      try {
        papers.push(convertToParsedPaper(entry));
      } catch (error) {
        console.error(`Error parsing paper entry:`, error);
        // Continue processing other papers even if one fails
      }
    }

    return papers;
  } catch (error) {
    console.error("Error fetching papers from arXiv:", error);
    throw error;
  }
}

