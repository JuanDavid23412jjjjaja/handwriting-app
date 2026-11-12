/** Deterministic PRNG utilities. Same seed ⇒ same page, always. */

export type Rng = () => number;

/** mulberry32 — small, fast, good enough for visual noise. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller, cached second value. */
export function gaussianFactory(rng: Rng): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const v = spare;
      spare = null;
      return v;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * Smooth 1-D value noise. Used for the slow "line drift" that makes a written
 * line gently rise and fall like real handwriting.
 */
export function noise1D(x: number, seed = 1337): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hashString(`${seed}:${i}`) / 0xffffffff;
  const b = hashString(`${seed}:${i + 1}`) / 0xffffffff;
  const u = f * f * (3 - 2 * f);
  return (a + (b - a) * u) * 2 - 1;
}

/** Per-glyph deterministic sub-seed: stable when text is edited elsewhere. */
export function glyphKeySeed(seed: number, page: number, line: number, index: number): number {
  return (seed ^ Math.imul(page + 1, 0x9e3779b1) ^ Math.imul(line + 7, 0x85ebca6b) ^ Math.imul(index + 13, 0xc2b2ae35)) >>> 0;
}
