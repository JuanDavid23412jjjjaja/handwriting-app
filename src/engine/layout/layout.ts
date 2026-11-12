import type {
  Block,
  GlyphPlan,
  HandDocument,
  Imperfections,
  InlineRun,
  PagePlan,
  PaperConfig,
  PlacedImage,
  StrokePlan,
} from '../types';
import { pageDimensions } from '../units';
import type { LoadedFont } from '../fonts/fontService';
import { gaussianFactory, mulberry32, noise1D } from '../prng';
import { layoutMath } from '../math/mathLayout';
import { SYMBOL_SHAPES, hasSymbol } from '../math/symbols';

export type FontRegistry = Record<string, LoadedFont | undefined>;

export interface RawGlyph {
  ch: string;
  sizeMm: number;
  fontId: string;
  advMm: number;
  symbol?: string;
  missing?: boolean;
}

interface LineItem {
  kind: 'word' | 'math';
  width: number;
  ascent: number;
  descent: number;
  glyphs: RawGlyph[];
  mathGlyphs?: GlyphPlan[];
  strokes: StrokePlan[];
  underline?: boolean;
  bold?: boolean;
  spaceWidth?: number;
  text?: string;
}

interface Line {
  items: LineItem[];
  width: number;
  ascent: number;
  descent: number;
}

/* ------------------------------------------------------------------ */
/* Paper helpers                                                       */
/* ------------------------------------------------------------------ */

export function contentTop(paper: PaperConfig): number {
  return paper.margins.top + (paper.headerLine ? paper.headerHeightMm : 0);
}

export function ruledBaselines(paper: PaperConfig, heightMm: number): number[] {
  if (paper.template !== 'ruled') return [];
  const top = contentTop(paper);
  const bottom = heightMm - paper.margins.bottom;
  const step = Math.max(4, paper.lineSpacingMm);
  const out: number[] = [];
  for (let y = top + step; y <= bottom + 0.01; y += step) out.push(y);
  return out;
}

/* ------------------------------------------------------------------ */
/* Flow: one page at a time                                            */
/* ------------------------------------------------------------------ */

interface PageState {
  index: number;
  glyphs: GlyphPlan[];
  strokes: StrokePlan[];
  images: PlacedImage[];
  baselineIndex: number;
  lastBaseline: number;
  hasContent: boolean;
  lineNumber: number;
}

class Flow {
  pages: PageState[] = [];
  page: PageState;
  widthMm: number;
  heightMm: number;
  contentLeft: number;
  contentRight: number;
  contentWidth: number;
  top: number;
  bottom: number;
  baselines: number[];
  doc: HandDocument;
  fonts: FontRegistry;
  inkFont: LoadedFont;
  fallback: LoadedFont;

  constructor(doc: HandDocument, fonts: FontRegistry, inkFont: LoadedFont, fallback: LoadedFont) {
    this.doc = doc;
    this.fonts = fonts;
    this.inkFont = inkFont;
    this.fallback = fallback;
    const dims = pageDimensions(doc.paper);
    this.widthMm = dims.width;
    this.heightMm = dims.height;
    this.contentLeft = doc.paper.margins.left;
    this.contentRight = dims.width - doc.paper.margins.right;
    this.contentWidth = Math.max(20, this.contentRight - this.contentLeft);
    this.top = contentTop(doc.paper);
    this.bottom = dims.height - doc.paper.margins.bottom;
    this.baselines = ruledBaselines(doc.paper, dims.height);
    this.page = this.createPage(0);
  }

  private createPage(index: number): PageState {
    const state: PageState = {
      index,
      glyphs: [],
      strokes: [],
      images: this.doc.images.filter((img) => img.page === index),
      baselineIndex: 0,
      lastBaseline: this.top,
      hasContent: false,
      lineNumber: 0,
    };
    this.pages[index] = state;
    return state;
  }

  newPage(): void {
    this.page = this.createPage(this.pages.length);
  }

  /** Reserve room for `height` mm and return the baseline for the next line. */
  nextBaseline(height: number, sizeMm: number): number {
    if (this.baselines.length) {
      const step = Math.max(4, this.doc.paper.lineSpacingMm);
      const needed = Math.max(1, Math.ceil((height * 1.05) / step));
      let idx = this.page.baselineIndex + (this.page.hasContent ? needed - 1 : 0);
      if (idx >= this.baselines.length) {
        this.newPage();
        idx = 0;
      }
      this.page.baselineIndex = idx + 1;
      const y = this.baselines[idx];
      this.page.lastBaseline = y;
      this.page.hasContent = true;
      return y;
    }
    const step = Math.max(sizeMm * 1.62, height * 1.08);
    let y = this.page.hasContent ? this.page.lastBaseline + step : this.top + sizeMm * 1.2;
    if (y > this.bottom) {
      this.newPage();
      y = this.top + sizeMm * 1.2;
    }
    this.page.lastBaseline = y;
    this.page.hasContent = true;
    return y;
  }

  /** Vertical breathing room between blocks. */
  gap(mm: number): void {
    if (!this.page.hasContent) return;
    if (this.baselines.length) {
      const step = Math.max(4, this.doc.paper.lineSpacingMm);
      const lines = Math.round(mm / step);
      if (lines <= 0) return;
      const next = this.page.baselineIndex + lines;
      if (next < this.baselines.length) this.page.baselineIndex = next;
      else this.page.baselineIndex = this.baselines.length;
    } else {
      const y = this.page.lastBaseline + mm;
      if (y > this.bottom) this.newPage();
      else this.page.lastBaseline = y;
    }
  }

  /** Unused vertical room on the current page, in mm. */
  remaining(): number {
    if (this.baselines.length) {
      const idx = this.page.baselineIndex;
      if (idx >= this.baselines.length) return 0;
      return this.baselines[this.baselines.length - 1] - (idx === 0 ? this.top : this.baselines[idx - 1]);
    }
    return this.bottom - this.page.lastBaseline;
  }

  finish(): PagePlan[] {
    while (this.pages.length > 1 && !this.pages[this.pages.length - 1].hasContent) this.pages.pop();
    return this.pages.map((p, i) => ({
      index: i,
      widthMm: this.widthMm,
      heightMm: this.heightMm,
      paper: this.doc.paper,
      glyphs: p.glyphs,
      strokes: p.strokes,
      images: p.images,
    }));
  }
}

/* ------------------------------------------------------------------ */
/* Glyph measurement + humanising                                      */
/* ------------------------------------------------------------------ */

function pickFont(fonts: FontRegistry, inkFont: LoadedFont, fallback: LoadedFont, ch: string): LoadedFont {
  if (inkFont.hasGlyph(ch)) return fonts[inkFont.meta.id] ?? inkFont;
  if (fallback.hasGlyph(ch)) return fonts[fallback.meta.id] ?? fallback;
  return inkFont;
}

function spaceAdvanceMm(font: LoadedFont, sizeMm: number): number {
  const em = sizeMm * font.meta.scale;
  // script fonts ship a very tight space glyph; give words room to breathe
  return Math.max(font.advanceEm(' ') * em, em * 0.4);
}

function measureText(font: LoadedFont, text: string, sizeMm: number, trackingEm: number): number {
  const scale = font.meta.scale;
  const em = sizeMm * scale;
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    w += ch === ' ' ? spaceAdvanceMm(font, sizeMm) : font.advanceEm(ch) * em + trackingEm * em;
  }
  return w;
}

function rawGlyphs(
  text: string,
  sizeMm: number,
  fonts: FontRegistry,
  inkFont: LoadedFont,
  fallback: LoadedFont,
  trackingEm: number,
): RawGlyph[] {
  const out: RawGlyph[] = [];
  for (const ch of text) {
    const font = pickFont(fonts, inkFont, fallback, ch);
    const em = sizeMm * font.meta.scale;
    const has = font.hasGlyph(ch);
    const symbol = !has && hasSymbol(ch) ? ch : undefined;
    const adv = has
      ? font.advanceEm(ch) * em + trackingEm * em
      : symbol
        ? SYMBOL_SHAPES[symbol].w * sizeMm
        : font.advanceEm(ch) * em;
    out.push({
      ch,
      sizeMm: em,
      fontId: font.meta.id,
      advMm: adv,
      symbol,
      missing: !has && !symbol,
    });
  }
  return out;
}

interface HumaniseCtx {
  imp: Imperfections;
  page: number;
  line: number;
  ink: HandDocument['ink'];
  rng: () => number;
  gauss: () => number;
  pageWidth: number;
}

function humanise(
  g: RawGlyph,
  x: number,
  baseline: number,
  ctx: HumaniseCtx,
): GlyphPlan {
  const { imp, ink } = ctx;
  const size = g.sizeMm;
  const rot = ctx.gauss() * imp.letterRotation * 5;
  const scaleY = 1 + ctx.gauss() * imp.letterSize * 0.09;
  const drift = noise1D((x + ctx.page * 37) / 55, imp.seed) * imp.lineDrift * 0.2 * size;
  const jitter = ctx.gauss() * imp.baselineJitter * 0.11 * size;
  const alpha = Math.max(0.35, ink.opacity * (1 - ctx.rng() * imp.inkVariation * 0.32));
  const pressure = Math.max(0, ink.pressure) * size * 0.014;
  const stroke = ink.bold && !BOLD_FONTS.has(g.fontId)
    ? Math.max(pressure, size * 0.03)
    : pressure > 0.02
      ? pressure
      : undefined;
  return {
    ch: g.ch,
    x,
    y: baseline + drift + jitter,
    sizeMm: size,
    fontId: g.fontId,
    rot,
    scaleY,
    alpha,
    symbol: g.symbol,
    missing: g.missing,
    strokeMm: stroke,
  };
}

const BOLD_FONTS = new Set(['kalam']);

/* ------------------------------------------------------------------ */
/* Tokenising inline runs                                              */
/* ------------------------------------------------------------------ */

interface Tokens {
  tokens: LineItem[];
}

function buildTokens(
  runs: InlineRun[],
  flow: Flow,
  inkFont: LoadedFont,
  fallback: LoadedFont,
  fonts: FontRegistry,
  sizeMm: number,
  ctxBase: Omit<HumaniseCtx, 'rng' | 'gauss'>,
): Tokens {
  const tokens: LineItem[] = [];
  const tracking = inkFont.meta.tracking;

  const mathItem = (latex: string): LineItem => {
    const res = layoutMath(latex, {
      font: inkFont,
      fallback,
      sizeMm,
      color: ctxBase.ink.color,
      alpha: ctxBase.ink.opacity,
      jitter: () => ({ rot: 0, scale: 1, dy: 0 }),
    });
    return {
      kind: 'math',
      width: res.width,
      ascent: res.ascent,
      descent: res.descent,
      glyphs: [],
      mathGlyphs: res.glyphs,
      strokes: res.strokes.map((s) => ({ ...s, color: ctxBase.ink.color })),
    };
  };

  for (const run of runs) {
    if (run.kind === 'math') {
      tokens.push(mathItem(run.latex));
      continue;
    }
    const parts = run.text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        tokens.push({
          kind: 'word',
          width: spaceAdvanceMm(inkFont, sizeMm) * part.length,
          ascent: sizeMm * 0.7,
          descent: sizeMm * 0.16,
          glyphs: [],
          strokes: [],
          spaceWidth: sizeMm * 0.3,
          text: ' ',
        });
      } else {
        const glyphs = rawGlyphs(part, sizeMm, fonts, inkFont, fallback, tracking);
        tokens.push({
          kind: 'word',
          width: glyphs.reduce((a, g) => a + g.advMm, 0),
          ascent: sizeMm * 0.78,
          descent: sizeMm * 0.24,
          glyphs,
          strokes: [],
          underline: run.underline,
          bold: run.bold,
          text: part,
        });
      }
    }
  }
  void flow;
  return { tokens };
}

/** Break tokens into lines that fit `maxWidth`. */
function breakLines(tokens: LineItem[], maxWidth: number, fonts: FontRegistry): Line[] {
  const lines: Line[] = [];
  let items: LineItem[] = [];
  let width = 0;
  let ascent = 0;
  let descent = 0;

  const push = () => {
    while (items.length && items[items.length - 1].text === ' ') items.pop();
    if (!items.length) return;
    lines.push({ items, width, ascent, descent });
    items = [];
    width = 0;
    ascent = 0;
    descent = 0;
  };

  for (const token of tokens) {
    if (token.text === ' ') {
      if (!items.length) continue;
      items.push(token);
      width += token.width;
      continue;
    }
    if (width + token.width > maxWidth && items.length) push();
    if (token.width > maxWidth && token.glyphs.length > 1) {
      // split an over-long word by characters
      let chunk: RawGlyph[] = [];
      let chunkWidth = 0;
      for (const g of token.glyphs) {
        if (chunkWidth + g.advMm > maxWidth && chunk.length) {
          lines.push({
            items: [{ ...token, glyphs: chunk, width: chunkWidth, text: chunk.map((c) => c.ch).join('') }],
            width: chunkWidth,
            ascent: token.ascent,
            descent: token.descent,
          });
          chunk = [];
          chunkWidth = 0;
        }
        chunk.push(g);
        chunkWidth += g.advMm;
      }
      if (chunk.length) {
        items = [{ ...token, glyphs: chunk, width: chunkWidth, text: chunk.map((c) => c.ch).join('') }];
        width = chunkWidth;
        ascent = token.ascent;
        descent = token.descent;
      }
      continue;
    }
    items.push({ ...token, width: token.width });
    width += token.width;
    ascent = Math.max(ascent, token.ascent);
    descent = Math.max(descent, token.descent);
  }
  push();
  void fonts;
  return lines;
}

/* ------------------------------------------------------------------ */
/* Line painting (into the page plan)                                  */
/* ------------------------------------------------------------------ */

function emitLine(
  flow: Flow,
  line: Line,
  align: 'left' | 'center' | 'right',
  sizeMm: number,
  inkFont: LoadedFont,
  fallback: LoadedFont,
  fonts: FontRegistry,
  indent = 0,
): void {
  const imp = flow.doc.imperfections;
  const ink = flow.doc.ink;
  const baseline = flow.nextBaseline(line.ascent + line.descent, sizeMm);
  const page = flow.page;
  const lineSeed = (imp.seed ^ Math.imul(page.index + 1, 0x9e3779b1) ^ Math.imul(page.lineNumber + 3, 0x85ebca6b)) >>> 0;
  const rng = mulberry32(lineSeed);
  const gauss = gaussianFactory(rng);
  const marginWobble = gauss() * imp.marginWobble * 2.2;
  const usable = flow.contentWidth - indent;
  let startX = flow.contentLeft + indent + marginWobble;
  if (align === 'center') startX = flow.contentLeft + indent + (usable - line.width) / 2;
  if (align === 'right') startX = flow.contentLeft + indent + usable - line.width;

  const slant = (gauss() * imp.lineSlant * 0.7 * Math.PI) / 180;
  const ctx: HumaniseCtx = { imp, page: page.index, line: page.lineNumber, ink, rng, gauss, pageWidth: flow.widthMm };

  let x = startX;
  let drift = 0;
  for (const item of line.items) {
    if (item.kind === 'math') {
      const mathGlyphs = item.mathGlyphs ?? [];
      for (const g of mathGlyphs) {
        page.glyphs.push({
          ...g,
          x: g.x + x,
          y: g.y + baseline + Math.tan(slant) * (x - startX),
          rot: g.rot + gauss() * imp.letterRotation * 1.2,
          alpha: g.alpha * (1 - rng() * imp.inkVariation * 0.2),
        });
      }
      for (const s of item.strokes) {
        page.strokes.push({
          ...s,
          points: s.points.map(([px, py]) => [px + x, py + baseline + Math.tan(slant) * (x - startX)] as [number, number]),
        });
      }
      x += item.width;
      continue;
    }
    if (item.text === ' ') {
      // Word spacing irregularity shifts the following glyphs but never the pen,
      // so the emitted line keeps the width the line breaker measured.
      drift += gauss() * imp.wordSpacing * 0.12 * sizeMm;
      drift = Math.max(-sizeMm * 0.09, Math.min(sizeMm * 0.09, drift));
      x += item.width;
      continue;
    }
    const wordStart = x;
    for (const g of item.glyphs) {
      const extra = gauss() * imp.letterSpacing * 0.07 * g.sizeMm;
      const plan = humanise(g, x, baseline, ctx);
      plan.x += drift + extra;
      plan.y += Math.tan(slant) * (x - startX);
      if (item.bold) plan.strokeMm = Math.max(plan.strokeMm ?? 0, g.sizeMm * 0.022);
      page.glyphs.push(plan);
      x += g.advMm;
    }
    // items may declare a width larger than their ink (list markers), so snap
    // the pen to the measured box instead of trusting the advances
    x = wordStart + Math.max(item.width, x - wordStart);
    if (item.underline) {
      page.strokes.push({
        points: [
          [wordStart + drift, baseline + sizeMm * 0.26],
          [x + drift, baseline + sizeMm * 0.26 + (rng() - 0.5) * 0.3],
        ],
        widthMm: Math.max(0.12, sizeMm * 0.035),
        alpha: ink.opacity * 0.9,
        color: ink.color,
        rough: true,
      });
    }
  }
  page.lineNumber++;
  void inkFont;
  void fallback;
  void fonts;
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const HEADING_SCALE: Record<1 | 2 | 3, number> = { 1: 1.75, 2: 1.38, 3: 1.14 };

function renderBlock(
  flow: Flow,
  block: Block,
  inkFont: LoadedFont,
  fallback: LoadedFont,
  fonts: FontRegistry,
  ctxBase: Omit<HumaniseCtx, 'rng' | 'gauss'>,
): void {
  const ink = flow.doc.ink;
  const size = ink.sizeMm;

  switch (block.type) {
    case 'paragraph':
    case 'quote': {
      const isQuote = block.type === 'quote';
      if (flow.page.hasContent) flow.gap(size * 0.7);
      const quoteIndent = isQuote ? size * 1.6 : 0;
      const indent = isQuote ? size * 1.6 : 0;
      const tokens = buildTokens(block.runs, flow, inkFont, fallback, fonts, size, ctxBase).tokens;
      const lines = breakLines(tokens, flow.contentWidth - quoteIndent, fonts);
      const baselines: number[] = [];
      const quotePage = flow.page.index;
      for (const line of lines) {
        emitLine(flow, line, 'left', size, inkFont, fallback, fonts, indent);
        baselines.push(flow.page.lastBaseline);
      }
      if (isQuote && baselines.length && flow.page.index === quotePage) {
        const top = baselines[0] - size * 0.85;
        const bottom = baselines[baselines.length - 1] + size * 0.3;
        flow.page.strokes.push({
          points: [
            [flow.contentLeft + size * 0.55, top],
            [flow.contentLeft + size * 0.55, bottom],
          ],
          widthMm: Math.max(0.25, size * 0.08),
          alpha: ink.opacity * 0.65,
          color: ink.color,
          rough: true,
        });
      }
      break;
    }
    case 'heading': {
      const scale = HEADING_SCALE[block.level];
      const hSize = size * scale;
      if (flow.page.hasContent) flow.gap(hSize * 0.8);
      const tokens = buildTokens(block.runs, flow, inkFont, fallback, fonts, hSize, ctxBase).tokens;
      const lines = breakLines(tokens, flow.contentWidth, fonts);
      for (const line of lines) emitLine(flow, line, 'left', hSize, inkFont, fallback, fonts);
      flow.gap(hSize * 0.3);
      break;
    }
    case 'list': {
      if (flow.page.hasContent) flow.gap(size * 0.45);
      const indent = size * 2.2;
      block.items.forEach((item, idx) => {
        const marker = block.ordered ? `${(block.start ?? 1) + idx}.` : '•';
        const markerGlyphs = rawGlyphs(marker, size, fonts, inkFont, fallback, inkFont.meta.tracking);
        const tokens = buildTokens(item, flow, inkFont, fallback, fonts, size, ctxBase).tokens;
        const lines = breakLines(tokens, flow.contentWidth - indent, fonts);
        if (!lines.length) return;
        const markerItem: LineItem = {
          kind: 'word',
          width: indent,
          ascent: size * 0.78,
          descent: size * 0.24,
          glyphs: markerGlyphs,
          strokes: [],
          text: marker,
        };
        lines[0].items.unshift(markerItem);
        lines[0].width += indent;
        lines.forEach((line, li) => {
          emitLine(flow, line, 'left', size, inkFont, fallback, fonts, li === 0 ? 0 : indent);
        });
        flow.gap(size * 0.2);
      });
      break;
    }
    case 'math': {
      if (flow.page.hasContent) flow.gap(size * 0.8);
      const res = layoutMath(block.latex, {
        font: inkFont,
        fallback,
        sizeMm: size * 1.18,
        color: ink.color,
        alpha: ink.opacity,
        jitter: () => ({ rot: 0, scale: 1, dy: 0 }),
      });
      const baseline = flow.nextBaseline(res.ascent + res.descent, size * 1.3);
      const startX = flow.contentLeft + (flow.contentWidth - res.width) / 2;
      const page = flow.page;
      for (const g of res.glyphs) page.glyphs.push({ ...g, x: g.x + startX, y: g.y + baseline });
      for (const s of res.strokes) {
        page.strokes.push({
          ...s,
          points: s.points.map(([px, py]) => [px + startX, py + baseline] as [number, number]),
        });
      }
      flow.gap(size * 0.6);
      break;
    }
    case 'table':
      renderTable(flow, block, inkFont, fallback, fonts, ctxBase);
      break;
    case 'pagebreak':
      flow.newPage();
      break;
  }
}

function renderTable(
  flow: Flow,
  block: Extract<Block, { type: 'table' }>,
  inkFont: LoadedFont,
  fallback: LoadedFont,
  fonts: FontRegistry,
  ctxBase: Omit<HumaniseCtx, 'rng' | 'gauss'>,
): void {
  const size = flow.doc.ink.sizeMm * 0.9;
  const padX = size * 0.55;
  const padY = size * 0.45;
  const lineHeight = size * 1.5;
  const cols = Math.max(...block.rows.map((r) => r.length));
  const cells = block.rows.map((row) => Array.from({ length: cols }, (_, i) => row[i] ?? ''));

  // natural column widths
  const natural = new Array(cols).fill(0);
  cells.forEach((row) => {
    row.forEach((cell, c) => {
      natural[c] = Math.max(
        natural[c],
        measureText(pickFont(fonts, inkFont, fallback, cell[0] ?? 'a'), cell, size, inkFont.meta.tracking) +
          size * 0.22,
      );
    });
  });
  let total = natural.reduce((a, b) => a + b + padX * 2, 0);
  const maxW = flow.contentWidth;
  const widths = natural.map((w) => w + padX * 2);
  if (total > maxW) {
    const k = (maxW - padX * 2 * cols) / Math.max(1, total - padX * 2 * cols);
    for (let i = 0; i < cols; i++) widths[i] = Math.max(size * 2.2, widths[i] * k);
    total = widths.reduce((a, b) => a + b, 0);
  }

  const rowHeights = cells.map((row) => {
    const lines = row.map((cell, c) => breakLines(buildTokens([{ kind: 'text', text: cell }], flow, inkFont, fallback, fonts, size, ctxBase).tokens, Math.max(2, widths[c] - padX * 2), fonts).length);
    return Math.max(1, ...lines) * lineHeight + padY * 2;
  });

  const drawRow = (row: string[], r: number, header: boolean) => {
    const height = rowHeights[r];
    const ascent = size * 0.8;
    const topY = flow.nextBaseline(height, size) - ascent - padY;
    const page = flow.page;
    const baselineOf = (i: number) => topY + padY + i * lineHeight + size * 0.82;
    let x = flow.contentLeft;
    const ink = flow.doc.ink;
    const rng = mulberry32((flow.doc.imperfections.seed ^ (r * 2654435761) ^ page.index) >>> 0);

    row.forEach((cell, c) => {
      const tokens = buildTokens([{ kind: 'text', text: cell }], flow, inkFont, fallback, fonts, size, ctxBase).tokens;
      const lines = breakLines(tokens, Math.max(2, widths[c] - padX * 2), fonts);
      lines.forEach((line, li) => {
        let cx = x + padX;
        for (const item of line.items) {
          if (item.text === ' ') {
            cx += size * 0.3;
            continue;
          }
          const baseline = baselineOf(li);
          for (const g of item.glyphs) {
            const plan = humanise(g, cx, baseline, {
              imp: flow.doc.imperfections,
              page: page.index,
              line: 0,
              ink,
              rng,
              gauss: gaussianFactory(rng),
              pageWidth: flow.widthMm,
            });
            if (header) plan.strokeMm = Math.max(plan.strokeMm ?? 0, size * 0.02);
            page.glyphs.push(plan);
            cx += g.advMm;
          }
        }
      });
      x += widths[c];
    });

    // hand-drawn borders
    const ink2 = flow.doc.ink;
    const wobble = (v: number) => v + (rng() - 0.5) * 0.35;
    const bottomY = topY + height;
    page.strokes.push({
      points: [
        [flow.contentLeft, wobble(topY)],
        [flow.contentLeft + total, wobble(topY)],
      ],
      widthMm: header ? 0.36 : 0.24,
      alpha: ink2.opacity * 0.85,
      color: ink2.color,
      rough: true,
    });
    page.strokes.push({
      points: [
        [flow.contentLeft, wobble(bottomY)],
        [flow.contentLeft + total, wobble(bottomY)],
      ],
      widthMm: 0.24,
      alpha: ink2.opacity * 0.85,
      color: ink2.color,
      rough: true,
    });
    let vx = flow.contentLeft;
    for (let c = 0; c <= cols; c++) {
      page.strokes.push({
        points: [
          [vx, wobble(topY)],
          [vx + (rng() - 0.5) * 0.3, wobble(bottomY)],
        ],
        widthMm: 0.22,
        alpha: ink2.opacity * 0.8,
        color: ink2.color,
        rough: true,
      });
      if (c < cols) vx += widths[c];
    }
  };

  if (flow.remaining() < rowHeights[0] + size) flow.newPage();
  if (flow.page.hasContent) flow.gap(size * 0.7);

  cells.forEach((row, r) => {
    if (r > 0 && flow.remaining() < rowHeights[r] + size) {
      flow.newPage();
      if (block.header && r > 1) drawRow(cells[0], 0, true);
    }
    drawRow(row, r, block.header && r === 0);
  });
  flow.gap(size * 0.7);
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export interface BuildOptions {
  fonts: FontRegistry;
  blocks: Block[];
}

export function buildPlan(doc: HandDocument, blocks: Block[], fonts: FontRegistry): PagePlan[] {
  const inkFont = fonts[doc.ink.fontId];
  const fallback = fonts['patrick'] ?? inkFont;
  if (!inkFont || !fallback) throw new Error('Fonts not loaded');

  const flow = new Flow(doc, fonts, inkFont, fallback);
  const ctxBase: Omit<HumaniseCtx, 'rng' | 'gauss'> = {
    imp: doc.imperfections,
    page: 0,
    line: 0,
    ink: doc.ink,
    pageWidth: flow.widthMm,
  };

  if (!blocks.length) {
    blocks = [{ type: 'paragraph', runs: [{ kind: 'text', text: '' }] }];
  }

  for (const block of blocks) {
    renderBlock(flow, block, inkFont, fallback, fonts, ctxBase);
  }

  const pages = flow.finish();

  // Handwritten page numbers when there is more than one page.
  if (pages.length > 1) {
    pages.forEach((page, i) => {
      const num = String(i + 1);
      const size = doc.ink.sizeMm * 0.85;
      const w = measureText(inkFont, num, size, inkFont.meta.tracking);
      const x = page.widthMm / 2 - w / 2;
      const y = page.heightMm - Math.max(6, doc.paper.margins.bottom * 0.55);
      const glyphs = rawGlyphs(num, size, fonts, inkFont, fallback, inkFont.meta.tracking);
      let gx = x;
      const rng = mulberry32((doc.imperfections.seed ^ (i + 99)) >>> 0);
      const gauss = gaussianFactory(rng);
      for (const g of glyphs) {
        page.glyphs.push(
          humanise(g, gx, y, {
            imp: doc.imperfections,
            page: i,
            line: 0,
            ink: doc.ink,
            rng,
            gauss,
            pageWidth: page.widthMm,
          }),
        );
        gx += g.advMm;
      }
    });
  }

  return pages;
}
