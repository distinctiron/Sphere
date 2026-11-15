/**
 * Block-level parsing of the Markdown subset used by story articles
 * (client-safe; rendered by components/news/article-markdown.tsx).
 */

export type Block =
  | { type: "h2" | "h3" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (!line) {
      flush();
    } else if (heading) {
      flush();
      blocks.push({ type: heading[1].length <= 2 ? "h2" : "h3", text: heading[2] });
    } else if (bullet || numbered) {
      flush();
      const type = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1];
      const previous = blocks[blocks.length - 1];
      if (previous && previous.type === type) previous.items.push(text);
      else blocks.push({ type, items: [text] });
    } else {
      const previous = blocks[blocks.length - 1];
      // Continuation line of a list item
      if (paragraph.length === 0 && previous && (previous.type === "ul" || previous.type === "ol") && raw.startsWith(" ")) {
        previous.items[previous.items.length - 1] += ` ${line}`;
      } else {
        paragraph.push(line);
      }
    }
  }
  flush();
  return blocks;
}
