import { describe, it, expect } from 'vitest';
import { layoutMath } from '@/engine/math/mathLayout';

function makeFont(adv = 0.5) {
  return {
    hasGlyph: () => true,
    advanceEm: () => adv,
    meta: { id: 'mock', name: 'mock', scale: 1, tracking: 0 },
    ascenderEm: 0.8,
    descenderEm: -0.2,
    font: { unitsPerEm: 1000 },
  } as any;
}

describe('layoutMath', () => {
  it('lays out glyphs left-to-right without overlap', () => {
    const env = { font: makeFont(0.5), fallback: makeFont(0.5), sizeMm: 6, color: '#000', alpha: 1, jitter: () => ({ rot: 0, scale: 1, dy: 0 }) };
    const r = layoutMath('a + b = c', env as any);
    const xs = r.glyphs.map((g) => g.x);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]).toBeGreaterThan(xs[i - 1] - 1e-9);
    }
    expect(r.width).toBeGreaterThan(0);
  });

  it('frac produces a horizontal bar stroke', () => {
    const env = { font: makeFont(0.5), fallback: makeFont(0.5), sizeMm: 6, color: '#000', alpha: 1, jitter: () => ({ rot: 0, scale: 1, dy: 0 }) };
    const r = layoutMath('\\frac{a}{b}', env as any);
    expect(r.strokes.length).toBeGreaterThanOrEqual(1);
  });

  it('sqrt produces a radical stroke', () => {
    const env = { font: makeFont(0.5), fallback: makeFont(0.5), sizeMm: 6, color: '#000', alpha: 1, jitter: () => ({ rot: 0, scale: 1, dy: 0 }) };
    const r = layoutMath('\\sqrt{x}', env as any);
    expect(r.strokes.length).toBeGreaterThanOrEqual(1);
  });
});
