import { describe, it, expect } from 'vitest';
import { mulberry32, gaussianFactory, noise1D, glyphKeySeed } from '@/engine/prng';

describe('prng', () => {
  it('mulberry32 is deterministic for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const sa = Array.from({ length: 20 }, () => a());
    const sb = Array.from({ length: 20 }, () => b());
    expect(sa).toEqual(sb);
  });

  it('different seeds differ', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('gaussianFactory is deterministic', () => {
    const rng1 = mulberry32(999);
    const rng2 = mulberry32(999);
    const g1 = gaussianFactory(rng1);
    const g2 = gaussianFactory(rng2);
    const v1 = Array.from({ length: 10 }, () => g1());
    const v2 = Array.from({ length: 10 }, () => g2());
    expect(v1).toEqual(v2);
  });

  it('noise1D is deterministic and bounded', () => {
    const v = noise1D(3.5, 42);
    expect(v).toBe(noise1D(3.5, 42));
    expect(v).toBeGreaterThanOrEqual(-1);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('glyphKeySeed is stable', () => {
    expect(glyphKeySeed(1, 2, 3, 4)).toBe(glyphKeySeed(1, 2, 3, 4));
  });
});
