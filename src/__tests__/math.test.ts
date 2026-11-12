import { describe, it, expect } from 'vitest';
import { parseLatex, isMathBalanced } from '@/engine/math/mathLayout';

describe('math', () => {
  it('isMathBalanced', () => {
    expect(isMathBalanced('a{b{c}d}e')).toBe(true);
    expect(isMathBalanced('a{b')).toBe(false);
    expect(isMathBalanced('a}b')).toBe(false);
  });

  it('parses frac and sqrt', () => {
    const node = parseLatex('\\frac{a}{b} + \\sqrt{x^2}') as any;
    expect(node.t).toBe('row');
    const frac = node.items.find((i: any) => i.t === 'frac');
    const sqrt = node.items.find((i: any) => i.t === 'sqrt');
    expect(frac).toBeTruthy();
    expect(sqrt).toBeTruthy();
  });

  it('parses greek and symbols', () => {
    const node = parseLatex('\\alpha + \\sum_{i=0}^n i') as any;
    const g = node.items.find((i: any) => i.t === 'glyph');
    expect(g.ch).toBe('α');
    const big = node.items.find((i: any) => i.t === 'bigop');
    expect(big).toBeTruthy();
  });
});
