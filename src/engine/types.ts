/**
 * Core document + render-plan types.
 *
 * The document model is expressed in **millimetres** (real paper units).
 * The render plan is therefore resolution independent: the same plan is used
 * for the screen preview (96 dpi × zoom) and for export (300 dpi).
 */

export type PaperTemplate = 'blank' | 'ruled' | 'graph' | 'dotted';
export type PageSizeId = 'A4' | 'Letter' | 'A5' | 'HalfLetter';
export type Orientation = 'portrait' | 'landscape';

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PaperConfig {
  template: PaperTemplate;
  size: PageSizeId;
  orientation: Orientation;
  paperColor: string;
  lineColor: string;
  lineSpacingMm: number;
  gridSizeMm: number;
  margins: Margins;
  marginLine: { enabled: boolean; color: string; xMm: number };
  headerLine: boolean;
  headerHeightMm: number;
  texture: number; // 0..1 paper grain
}

export interface InkConfig {
  fontId: string;
  sizeMm: number;
  color: string;
  opacity: number;
  bold: boolean;
  pressure: number; // 0..1 stroke-variation look
}

export interface Imperfections {
  seed: number;
  letterRotation: number;
  letterSize: number;
  baselineJitter: number;
  lineDrift: number;
  lineSlant: number;
  wordSpacing: number;
  letterSpacing: number;
  inkVariation: number;
  marginWobble: number;
}

export type ImageFilter = 'none' | 'grayscale' | 'printed';
export type ImageMode = 'overlay' | 'pushText';

export interface PlacedImage {
  id: string;
  blobKey: string;
  page: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotation: number;
  mode: ImageMode;
  filter: ImageFilter;
}

export interface HandDocument {
  version: 1;
  title: string;
  text: string;
  paper: PaperConfig;
  ink: InkConfig;
  imperfections: Imperfections;
  images: PlacedImage[];
}

/* ------------------------------------------------------------------ */
/* Render plan                                                         */
/* ------------------------------------------------------------------ */

export interface GlyphPlan {
  ch: string;
  /** left edge of the glyph advance, mm */
  x: number;
  /** baseline, mm */
  y: number;
  sizeMm: number;
  fontId: string;
  /** degrees, around glyph centre */
  rot: number;
  /** vertical scale multiplier (handwriting is rarely perfectly upright) */
  scaleY: number;
  alpha: number;
  /** if set, a hand-drawn vector symbol is used instead of the font glyph */
  symbol?: string;
  /** glyph missing everywhere — painter skips it (space is still reserved) */
  missing?: boolean;
  /** extra stroke width (mm) for "bold" */
  strokeMm?: number;
}

export interface StrokePlan {
  points: Array<[number, number]>;
  widthMm: number;
  alpha: number;
  color: string;
  /** draw with rounded caps + slight hand wobble */
  rough?: boolean;
}

export interface PagePlan {
  index: number;
  widthMm: number;
  heightMm: number;
  paper: PaperConfig;
  glyphs: GlyphPlan[];
  strokes: StrokePlan[];
  images: PlacedImage[];
}

/** A run of text: plain string or maths source. */
export type InlineRun =
  | { kind: 'text'; text: string; bold?: boolean; underline?: boolean }
  | { kind: 'math'; latex: string };

export type Block =
  | { type: 'paragraph'; runs: InlineRun[]; align?: 'left' | 'center' | 'right' }
  | { type: 'heading'; level: 1 | 2 | 3; runs: InlineRun[] }
  | { type: 'list'; ordered: boolean; items: InlineRun[][]; start?: number }
  | { type: 'table'; rows: string[][]; header: boolean }
  | { type: 'math'; latex: string }
  | { type: 'pagebreak' }
  | { type: 'quote'; runs: InlineRun[] };

export interface LayoutOptions {
  /** fallback font used for glyphs the selected font lacks */
  fallbackFontId: string;
}
