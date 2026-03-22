/**
 * Split raw text into paragraphs for search indexing and highlight rendering.
 *
 * Strategy:
 *  1. Split on blank lines (double newline) first.
 *  2. If no blank lines exist, split on single newlines.
 *  3. If there are still no breaks (single continuous string), split on
 *     sentence-ending punctuation (。！？；) keeping the delimiter attached
 *     to the preceding segment.
 *  4. Filter out empty segments.
 *
 * Both the search API (server) and the text detail page (client) must use
 * this exact function so paragraph indices stay consistent.
 */
export function splitTextIntoParagraphs(raw: string): string[] {
  if (!raw || !raw.trim()) return [];

  const trimmed = raw.trim();

  // Try blank-line split first
  let parts = trimmed.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  // Fall back to single-newline split
  parts = trimmed.split(/\n/).map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts;

  // No line breaks — split on sentence-ending punctuation (CJK + western)
  // Keep the punctuation attached to the end of each segment.
  parts = trimmed
    .split(/(?<=[。！？；\.\!\?])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts;

  // Truly indivisible — return as single paragraph
  return [trimmed];
}
