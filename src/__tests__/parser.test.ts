import { describe, it, expect } from 'vitest';
import { parseDocument } from '@/engine/parser/parseDocument';

describe('parseDocument', () => {
  it('parses headings, lists, tables, pagebreaks', () => {
    const src = `# H1\n\n- a\n- b\n\n1. uno\n2. dos\n\n| x | y |\n|---|---|\n| 1 | 2 |\n\n---page---\n\nfin`;
    const blocks = parseDocument(src);
    const types = blocks.map((b) => b.type);
    expect(types).toContain('heading');
    expect(types).toContain('list');
    expect(types).toContain('table');
    expect(types).toContain('pagebreak');
    expect(types).toContain('paragraph');
  });

  it('parses inline math and bold', () => {
    const blocks = parseDocument('Texto **bold** con $x^2$ y __sub__.');
    const p = blocks.find((b) => b.type === 'paragraph') as any;
    expect(p).toBeTruthy();
    const runs = p.runs;
    expect(runs.some((r: any) => r.bold)).toBe(true);
    expect(runs.some((r: any) => r.underline)).toBe(true);
    expect(runs.some((r: any) => r.kind === 'math' && r.latex === 'x^2')).toBe(true);
  });

  it('display math block', () => {
    const blocks = parseDocument('$$\nE = mc^2\n$$');
    expect(blocks.some((b) => b.type === 'math')).toBe(true);
  });
});
