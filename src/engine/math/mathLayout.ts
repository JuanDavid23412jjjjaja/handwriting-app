import type { GlyphPlan, StrokePlan } from '../types';
import type { LoadedFont } from '../fonts/fontService';
import { SYMBOL_SHAPES, hasSymbol } from './symbols';

/* ------------------------------------------------------------------ */
/* 1. LaTeX subset parser                                              */
/* ------------------------------------------------------------------ */

type Node =
  | { t: 'row'; items: Node[] }
  | { t: 'glyph'; ch: string }
  | { t: 'frac'; num: Node; den: Node }
  | { t: 'sqrt'; body: Node }
  | { t: 'script'; base: Node; sup?: Node; sub?: Node }
  | { t: 'bigop'; ch: string; sub?: Node; sup?: Node }
  | { t: 'space'; em: number }
  | { t: 'text'; text: string };

const GREEK: Record<string, string> = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const SYMBOLS: Record<string, string> = {
  times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', leq: '≤', le: '≤',
  geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', sim: '~', equiv: '≡',
  to: '→', rightarrow: '→', leftarrow: '←', Rightarrow: '⇒', infty: '∞',
  partial: '∂', nabla: '∇', forall: '∀', exists: '∃', in: '∈', notin: '∉',
  cup: '∪', cap: '∩', subset: '⊂', supset: '⊃', emptyset: '∅',
  ldots: '…', cdots: '⋯', prime: '′', degree: '°', angle: '∠',
  sum: 'Σ', prod: 'Π', int: '∫', iint: '∬', oint: '∮',
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉',
  because: '∵', therefore: '∴',
};

const SPACES: Record<string, number> = {
  ',': 0.17, ':': 0.22, ';': 0.28, '!': -0.17, quad: 1, qquad: 2, ' ': 0.3,
};

class MathParser {
  private i = 0;
  private src: string;
  constructor(src: string) {
    this.src = src;
  }

  parse(): Node {
    const items = this.parseSeq(false);
    return { t: 'row', items };
  }

  private peek(): string {
    return this.src[this.i] ?? '';
  }

  private skipWs(): void {
    while (/\s/.test(this.peek())) this.i++;
  }

  private parseSeq(inGroup: boolean): Node[] {
    const items: Node[] = [];
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (!c || (inGroup && c === '}')) break;
      if (c === '^' || c === '_') break;
      if (c === '}') break;
      const atom = this.parseAtom();
      if (!atom) break;
      items.push(this.attachScripts(atom));
    }
    return items;
  }

  private attachScripts(base: Node): Node {
    let sup: Node | undefined;
    let sub: Node | undefined;
    for (;;) {
      this.skipWs();
      const c = this.peek();
      if (c !== '^' && c !== '_') break;
      this.i++;
      const arg = this.parseAtom() ?? { t: 'row', items: [] };
      if (c === '^') sup = arg;
      else sub = arg;
    }
    if (!sup && !sub) return base;
    if (base.t === 'bigop') return { ...base, sup, sub };
    return { t: 'script', base, sup, sub };
  }

  private parseAtom(): Node | null {
    this.skipWs();
    const c = this.peek();
    if (!c) return null;
    if (c === '{') {
      this.i++;
      const items = this.parseSeq(true);
      if (this.peek() === '}') this.i++;
      return { t: 'row', items };
    }
    if (c === '}') return null;
    if (c === '\\') return this.parseCommand();
    if (c === '^' || c === '_') return null;
    if (c === '&') {
      this.i++;
      return null;
    }
    this.i++;
    if (c === '~') return { t: 'space', em: 0.3 };
    return { t: 'glyph', ch: c };
  }

  private readGroupRaw(): string {
    this.skipWs();
    if (this.peek() !== '{') {
      const ch = this.peek();
      this.i++;
      return ch;
    }
    let depth = 1;
    this.i++;
    let out = '';
    while (this.i < this.src.length && depth > 0) {
      const ch = this.src[this.i];
      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          this.i++;
          break;
        }
      }
      if (depth > 0) out += ch;
      this.i++;
    }
    return out;
  }

  private readGroup(): Node {
    this.skipWs();
    if (this.peek() === '{') {
      this.i++;
      const items = this.parseSeq(true);
      if (this.peek() === '}') this.i++;
      return { t: 'row', items };
    }
    return this.parseAtom() ?? { t: 'row', items: [] };
  }

  private parseCommand(): Node {
    this.i++; // backslash
    let name = '';
    if (/[a-zA-Z]/.test(this.peek())) {
      while (/[a-zA-Z]/.test(this.peek())) {
        name += this.peek();
        this.i++;
      }
    } else {
      name = this.peek() ?? '';
      this.i++;
      // escaped punctuation
      if (name === '{') return { t: 'glyph', ch: '{' };
      if (name === '}') return { t: 'glyph', ch: '}' };
      if (name === '\\') return { t: 'space', em: 0.3 };
    }

    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
      const num = this.readGroup();
      const den = this.readGroup();
      return { t: 'frac', num, den };
    }
    if (name === 'sqrt') return { t: 'sqrt', body: this.readGroup() };
    if (name === 'text' || name === 'textrm' || name === 'mathrm' || name === 'operatorname') {
      return { t: 'text', text: this.readGroupRaw() };
    }
    if (name === 'left' || name === 'right' || name === 'big' || name === 'Big' || name === 'bigl' || name === 'bigr') {
      this.skipWs();
      const delim = this.peek();
      this.i++;
      if (delim === '.' || !delim) return { t: 'row', items: [] };
      return { t: 'glyph', ch: delim };
    }
    if (name === 'begin' || name === 'end') {
      this.readGroupRaw();
      return { t: 'space', em: 0 };
    }
    if (name in SPACES) return { t: 'space', em: SPACES[name] };
    if (name in GREEK) return { t: 'glyph', ch: GREEK[name] };
    if (name in SYMBOLS) {
      const ch = SYMBOLS[name];
      if (name === 'sum' || name === 'prod' || name === 'int' || name === 'iint' || name === 'oint') {
        return { t: 'bigop', ch };
      }
      return { t: 'glyph', ch };
    }
    if (name === 'pi') return { t: 'glyph', ch: 'π' };
    if (name === 'infty') return { t: 'glyph', ch: '∞' };
    // Unknown command: show it as written so nothing is silently lost.
    return { t: 'text', text: name };
  }
}

export function parseLatex(src: string): Node {
  return new MathParser(src).parse();
}

/* ------------------------------------------------------------------ */
/* 2. Layout                                                           */
/* ------------------------------------------------------------------ */

interface Box {
  w: number;
  ascent: number;
  descent: number;
  glyphs: GlyphPlan[];
  strokes: StrokePlan[];
}

const EMPTY: Box = { w: 0, ascent: 0, descent: 0, glyphs: [], strokes: [] };

function shift(box: Box, dx: number, dy: number): Box {
  return {
    w: box.w,
    ascent: box.ascent,
    descent: box.descent,
    glyphs: box.glyphs.map((g) => ({ ...g, x: g.x + dx, y: g.y + dy })),
    strokes: box.strokes.map((s) => ({
      ...s,
      points: s.points.map(([x, y]) => [x + dx, y + dy] as [number, number]),
    })),
  };
}

const RELATIONS = new Set(['=', '<', '>', '≤', '≥', '≠', '≈', '≡', '⇒', '→', '∈', '⊂']);
const BINARY = new Set(['+', '−', '-', '±', '∓', '×', '÷', '·', '∪', '∩']);

export interface MathEnv {
  font: LoadedFont;
  fallback: LoadedFont;
  color: string;
  alpha: number;
  /** deterministic jitter per glyph */
  jitter: (index: number) => { rot: number; scale: number; dy: number };
}

function glyphBox(ch: string, size: number, env: MathEnv, index: number): Box {
  const usePrimary = env.font.hasGlyph(ch);
  const useFallback = !usePrimary && env.fallback.hasGlyph(ch);
  const symbol = !usePrimary && !useFallback && hasSymbol(ch) ? SYMBOL_SHAPES[ch] : undefined;
  const j = env.jitter(index);

  if (symbol) {
    const w = symbol.w * size;
    const strokes = symbol.strokes(size).map((pts) => ({
      points: pts,
      widthMm: Math.max(0.16, size * 0.055),
      alpha: env.alpha,
      color: env.color,
      rough: true,
    }));
    return {
      w,
      ascent: size * 0.72,
      descent: size * 0.16,
      glyphs: [],
      strokes,
    };
  }

  const font = usePrimary ? env.font : useFallback ? env.fallback : env.font;
  const adv = font.advanceEm(ch);
  const scale = font.meta.scale;
  const ascent = Math.min(0.82, Math.max(0.5, font.ascenderEm * 0.62)) * size;
  return {
    w: adv * size * scale,
    ascent,
    descent: Math.max(0.12, -font.descenderEm * 0.32) * size,
    glyphs: [
      {
        ch,
        x: 0,
        y: 0,
        sizeMm: size * scale,
        fontId: font.meta.id,
        rot: j.rot,
        scaleY: j.scale,
        alpha: env.alpha,
      },
    ],
    strokes: [],
  };
}

function layoutNode(node: Node, size: number, env: MathEnv, depth = 0): Box {
  switch (node.t) {
    case 'glyph':
      return glyphBox(node.ch, size, env, depth);
    case 'space':
      return { ...EMPTY, w: node.em * size, ascent: size * 0.4, descent: 0 };
    case 'text': {
      const parts: Box[] = [];
      for (const ch of node.text) {
        const b = glyphBox(ch === ' ' ? ' ' : ch, size * 0.92, env, depth + parts.length);
        b.w = ch === ' ' ? size * 0.28 : b.w;
        parts.push(b);
      }
      return rowBox(parts, 0);
    }
    case 'row':
      return layoutRow(node.items, size, env, depth);
    case 'frac': {
      const numSize = size * 0.76;
      const denSize = size * 0.76;
      const num = layoutNode(node.num, numSize, env, depth + 1);
      const den = layoutNode(node.den, denSize, env, depth + 2);
      const axis = size * 0.26;
      const gap = size * 0.1;
      const pad = size * 0.12;
      const w = Math.max(num.w, den.w) + pad * 2;
      const numY = -(axis + gap + num.descent);
      const denY = -axis + gap + den.ascent;
      const nBox = shift(num, (w - num.w) / 2, numY);
      const dBox = shift(den, (w - den.w) / 2, denY);
      return {
        w,
        ascent: axis + gap + num.descent + num.ascent,
        descent: Math.max(0, denY + den.descent),
        glyphs: [...nBox.glyphs, ...dBox.glyphs],
        strokes: [
          ...nBox.strokes,
          ...dBox.strokes,
          {
            points: [
              [pad * 0.3, -axis],
              [w - pad * 0.3, -axis + size * 0.004],
            ],
            widthMm: Math.max(0.15, size * 0.045),
            alpha: env.alpha,
            color: env.color,
            rough: true,
          },
        ],
      };
    }
    case 'sqrt': {
      const body = layoutNode(node.body, size, env, depth + 1);
      const radW = size * 0.44;
      const pad = size * 0.08;
      const top = -(body.ascent + size * 0.14);
      const w = radW + body.w + pad;
      const radical: [number, number][] = [
        [0, -size * 0.02],
        [size * 0.09, size * 0.12],
        [size * 0.18, top + size * 0.04],
        [radW, top],
        [w, top],
      ];
      return {
        w,
        ascent: -top + size * 0.02,
        descent: body.descent,
        glyphs: shift(body, radW, 0).glyphs,
        strokes: [
          ...shift(body, radW, 0).strokes,
          {
            points: radical,
            widthMm: Math.max(0.16, size * 0.05),
            alpha: env.alpha,
            color: env.color,
            rough: true,
          },
        ],
      };
    }
    case 'script': {
      const base = layoutNode(node.base, size, env, depth + 1);
      const supSize = size * 0.62;
      const subSize = size * 0.62;
      const sup = node.sup ? layoutNode(node.sup, supSize, env, depth + 2) : null;
      const sub = node.sub ? layoutNode(node.sub, subSize, env, depth + 2) : null;
      const dx = base.w * 0.92;
      const supDy = -(size * 0.42 + (sup?.descent ?? 0));
      const subDy = size * 0.12 + (sub?.ascent ?? 0);
      const supBox = sup ? shift(sup, dx, supDy) : null;
      const subBox = sub ? shift(sub, dx, subDy) : null;
      const w = Math.max(base.w, dx + Math.max(sup?.w ?? 0, sub?.w ?? 0));
      return {
        w,
        ascent: Math.max(base.ascent, sup ? -supDy + sup.ascent : 0),
        descent: Math.max(base.descent, sub ? subDy + sub.descent : 0),
        glyphs: [...base.glyphs, ...(supBox?.glyphs ?? []), ...(subBox?.glyphs ?? [])],
        strokes: [...base.strokes, ...(supBox?.strokes ?? []), ...(subBox?.strokes ?? [])],
      };
    }
    case 'bigop': {
      const op = glyphBox(node.ch, size * 1.35, env, depth);
      const limitSize = size * 0.6;
      const sup = node.sup ? layoutNode(node.sup, limitSize, env, depth + 1) : null;
      const sub = node.sub ? layoutNode(node.sub, limitSize, env, depth + 2) : null;
      const gap = size * 0.06;
      const w = Math.max(op.w, sup?.w ?? 0, sub?.w ?? 0);
      const supBox = sup ? shift(sup, (w - sup.w) / 2, -(op.ascent + gap + sup.descent)) : null;
      const subBox = sub ? shift(sub, (w - sub.w) / 2, op.descent + gap + sub.ascent) : null;
      return {
        w,
        ascent: op.ascent + (sup ? gap + sup.descent + sup.ascent : 0),
        descent: op.descent + (sub ? gap + sub.ascent + sub.descent : 0),
        glyphs: [...shift(op, (w - op.w) / 2, 0).glyphs, ...(supBox?.glyphs ?? []), ...(subBox?.glyphs ?? [])],
        strokes: [...shift(op, (w - op.w) / 2, 0).strokes, ...(supBox?.strokes ?? []), ...(subBox?.strokes ?? [])],
      };
    }
    default:
      return EMPTY;
  }
}

function rowBox(parts: Box[], tracking: number): Box {
  let w = 0;
  let x = 0;
  let ascent = 0;
  let descent = 0;
  const glyphs: GlyphPlan[] = [];
  const strokes: StrokePlan[] = [];
  for (const p of parts) {
    // every part is laid out from its own origin, so shift it into place here
    const moved = x === 0 ? p : shift(p, x, 0);
    glyphs.push(...moved.glyphs);
    strokes.push(...moved.strokes);
    ascent = Math.max(ascent, p.ascent);
    descent = Math.max(descent, p.descent);
    x += p.w + tracking;
  }
  w = Math.max(0, x - (parts.length ? tracking : 0));
  return { w, ascent, descent, glyphs, strokes };
}

function layoutRow(items: Node[], size: number, env: MathEnv, depth: number): Box {
  const parts: Box[] = [];
  let prev: string | null = null;
  for (const item of items) {
    let box = layoutNode(item, size, env, depth);
    if (item.t === 'glyph') {
      const ch = item.ch;
      if (RELATIONS.has(ch) || BINARY.has(ch)) {
        const pad = RELATIONS.has(ch) ? size * 0.18 : size * 0.1;
        if (prev) box = shift(box, pad, 0);
        box.w += pad;
      }
      prev = ch;
    } else {
      prev = null;
    }
    parts.push(box);
  }
  return rowBox(parts, 0);
}

export interface MathLayout {
  width: number;
  ascent: number;
  descent: number;
  glyphs: GlyphPlan[];
  strokes: StrokePlan[];
}

export interface MathOptions {
  font: LoadedFont;
  fallback: LoadedFont;
  sizeMm: number;
  color: string;
  alpha: number;
  jitter: (index: number) => { rot: number; scale: number; dy: number };
}

export function layoutMath(latex: string, opts: MathOptions): MathLayout {
  const ast = parseLatex(latex);
  const env: MathEnv = {
    font: opts.font,
    fallback: opts.fallback,
    color: opts.color,
    alpha: opts.alpha,
    jitter: opts.jitter,
  };
  const box = layoutNode(ast, opts.sizeMm, env, 0);
  return {
    width: Math.max(box.w, opts.sizeMm * 0.2),
    ascent: Math.max(box.ascent, opts.sizeMm * 0.4),
    descent: Math.max(box.descent, opts.sizeMm * 0.1),
    glyphs: box.glyphs,
    strokes: box.strokes,
  };
}

export function isMathBalanced(latex: string): boolean {
  let depth = 0;
  for (const ch of latex) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (depth < 0) return false;
  }
  return depth === 0;
}
