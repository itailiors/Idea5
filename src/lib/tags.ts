/**
 * Tags are extracted automatically from #hashtags in the note text.
 * Markdown headings ("# Title") are ignored because they have a space after '#'.
 */
const TAG_RE = /(?:^|\s)#([\p{L}\p{N}_-]+)/gu;

export function extractTags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(TAG_RE)) out.add(m[1].toLowerCase());
  return [...out];
}
