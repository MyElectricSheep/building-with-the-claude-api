/**
 * Text chunking (lesson 33). Pure functions - no network, fully unit tested.
 */

export interface Chunk {
  id: string;
  text: string;
  /** Index of the chunk within its source document. */
  ordinal: number;
  source: string;
}

/** Split on a fixed character count. The naive baseline the course starts from. */
export function chunkByCharacters(
  text: string,
  source: string,
  size = 800,
  overlap = 100,
): Chunk[] {
  if (size <= 0) throw new Error("size must be positive");
  if (overlap < 0 || overlap >= size) {
    throw new Error("overlap must be >= 0 and < size");
  }
  const chunks: Chunk[] = [];
  const stride = size - overlap;
  for (let start = 0; start < text.length; start += stride) {
    const slice = text.slice(start, start + size).trim();
    if (slice.length > 0) {
      chunks.push({
        id: `${source}#${chunks.length}`,
        text: slice,
        ordinal: chunks.length,
        source,
      });
    }
    if (start + size >= text.length) break;
  }
  return chunks;
}

/**
 * Split on blank-line paragraph boundaries, then pack paragraphs up to a
 * target size. Respecting semantic boundaries is what the lesson actually
 * argues for, and it remains current practice in 2026.
 */
export function chunkByParagraph(
  text: string,
  source: string,
  targetSize = 800,
): Chunk[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const chunks: Chunk[] = [];
  let buffer = "";

  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      id: `${source}#${chunks.length}`,
      text: buffer,
      ordinal: chunks.length,
      source,
    });
    buffer = "";
  };

  for (const paragraph of paragraphs) {
    if (buffer.length > 0 && buffer.length + paragraph.length + 2 > targetSize) {
      flush();
    }
    buffer = buffer.length > 0 ? `${buffer}\n\n${paragraph}` : paragraph;
    if (buffer.length >= targetSize) flush();
  }
  flush();
  return chunks;
}

/** Split on Markdown ATX headings, keeping the heading with its section. */
export function chunkBySection(text: string, source: string): Chunk[] {
  const lines = text.split("\n");
  const sections: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (/^#{1,6}\s/.test(line) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) sections.push(current.join("\n").trim());

  return sections
    .filter((section) => section.length > 0)
    .map((section, ordinal) => ({
      id: `${source}#${ordinal}`,
      text: section,
      ordinal,
      source,
    }));
}
