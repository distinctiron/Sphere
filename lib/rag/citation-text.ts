/**
 * Parsing of inline citation markers ("[1]", "[2, 3]") in LLM answers.
 * Client-safe (used by the citation UI).
 */

const CITATION_PATTERN = /\[(\d+(?:\s*,\s*\d+)*)\]/g;

function findCitationGroups(text: string): Array<{ index: number; length: number; ids: number[] }> {
  const groups: Array<{ index: number; length: number; ids: number[] }> = [];
  const pattern = new RegExp(CITATION_PATTERN.source, "g");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    groups.push({
      index: match.index,
      length: match[0].length,
      ids: match[1].split(",").map((n) => parseInt(n.trim(), 10)),
    });
  }
  return groups;
}

/** Citation numbers referenced in an answer, e.g. "[1] ... [2, 3]" → {1, 2, 3} */
export function citedIdsIn(text: string): Set<number> {
  const ids = new Set<number>();
  findCitationGroups(text).forEach((group) => group.ids.forEach((id) => ids.add(id)));
  return ids;
}

/** Split answer text into plain strings and citation-number groups */
export function splitCitations(text: string, validIds: Set<number>): Array<string | number[]> {
  const parts: Array<string | number[]> = [];
  let last = 0;
  for (const group of findCitationGroups(text)) {
    if (!group.ids.every((id) => validIds.has(id))) continue;
    if (group.index > last) parts.push(text.slice(last, group.index));
    parts.push(group.ids);
    last = group.index + group.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
