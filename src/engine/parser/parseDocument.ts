import type { Block, InlineRun } from '../types';

const PAGEBREAK = /^\s*(-{3,}\s*page\s*-{3,}|\\pagebreak)\s*$/i;
const HEADING = /^(#{1,3})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*(\d+)[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const TABLE_ROW = /^\s*\|(.+)\|\s*$/;
const TABLE_SEP = /^\s*\|?[\s:|-]+\|?\s*$/;

/**
 * Light Markdown accepted by the editor:
 *   # / ## / ###      headings
 *   - item            bullet list
 *   1. item           ordered list
 *   > quote           quote
 *   | a | b |         table (second row may be |---|---|)
 *   $x^2$             inline maths
 *   $$ ... $$         display maths
 *   **bold**          heavier ink
 *   __underline__     underlined
 *   ---page---        manual page break
 */
export function parseDocument(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buffered: string[]) => {
    if (!buffered.length) return;
    const text = buffered.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', runs: parseInline(text) });
    buffered.length = 0;
  };

  let paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(paragraph);
      i++;
      continue;
    }

    if (PAGEBREAK.test(trimmed)) {
      flushParagraph(paragraph);
      blocks.push({ type: 'pagebreak' });
      i++;
      continue;
    }

    // Display maths: $$ ... $$ (possibly multiline)
    if (trimmed.startsWith('$$')) {
      flushParagraph(paragraph);
      let body = trimmed.slice(2);
      let closed = body.trimEnd().endsWith('$$');
      if (closed) {
        body = body.trimEnd().slice(0, -2);
        i++;
      } else {
        i++;
        const parts: string[] = [];
        while (i < lines.length) {
          const l = lines[i];
          if (l.trim().endsWith('$$')) {
            parts.push(l.trim().slice(0, -2));
            i++;
            break;
          }
          parts.push(l);
          i++;
        }
        body = parts.join(' ');
      }
      blocks.push({ type: 'math', latex: body.trim() });
      continue;
    }

    const heading = HEADING.exec(trimmed);
    if (heading) {
      flushParagraph(paragraph);
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        runs: parseInline(heading[2].trim()),
      });
      i++;
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph(paragraph);
      const items: InlineRun[][] = [parseInline(bullet[1].trim())];
      i++;
      while (i < lines.length) {
        const next = BULLET.exec(lines[i]);
        if (!next) break;
        items.push(parseInline(next[1].trim()));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    const ordered = ORDERED.exec(line);
    if (ordered) {
      flushParagraph(paragraph);
      const start = Number(ordered[1]);
      const items: InlineRun[][] = [parseInline(ordered[2].trim())];
      i++;
      while (i < lines.length) {
        const next = ORDERED.exec(lines[i]);
        if (!next) break;
        items.push(parseInline(next[2].trim()));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items, start });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      flushParagraph(paragraph);
      const parts: string[] = [quote[1].trim()];
      i++;
      while (i < lines.length) {
        const next = QUOTE.exec(lines[i]);
        if (!next) break;
        parts.push(next[1].trim());
        i++;
      }
      blocks.push({ type: 'quote', runs: parseInline(parts.join(' ')) });
      continue;
    }

    // Tables
    if (TABLE_ROW.test(line)) {
      flushParagraph(paragraph);
      const rows: string[][] = [];
      let header = false;
      let first = true;
      while (i < lines.length) {
        const m = TABLE_ROW.exec(lines[i]);
        if (!m) break;
        const raw = m[1];
        if (TABLE_SEP.test(lines[i]) && rows.length === 1) {
          header = true;
          first = false;
          i++;
          continue;
        }
        if (first) first = false;
        rows.push(
          raw
            .split('|')
            .map((c) => c.trim())
            .filter((_, idx, arr) => !(idx === arr.length - 1 && arr[idx] === '')),
        );
        i++;
      }
      if (rows.length) blocks.push({ type: 'table', rows, header });
      continue;
    }

    paragraph.push(trimmed);
    i++;
  }

  flushParagraph(paragraph);
  return blocks;
}

const INLINE = /(\$[^$\n]+\$)|(\*\*[^*]+\*\*)|(__[^_]+__)/g;

export function parseInline(text: string): InlineRun[] {
  const runs: InlineRun[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) runs.push({ kind: 'text', text: text.slice(last, start) });
    const token = m[0];
    if (token.startsWith('$')) {
      runs.push({ kind: 'math', latex: token.slice(1, -1) });
    } else if (token.startsWith('**')) {
      runs.push({ kind: 'text', text: token.slice(2, -2), bold: true });
    } else {
      runs.push({ kind: 'text', text: token.slice(2, -2), underline: true });
    }
    last = start + token.length;
  }
  if (last < text.length) runs.push({ kind: 'text', text: text.slice(last) });
  return runs.length ? runs : [{ kind: 'text', text: '' }];
}
