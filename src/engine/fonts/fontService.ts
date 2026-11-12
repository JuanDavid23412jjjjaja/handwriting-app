import { parse, type Font } from 'opentype.js';
import { getFontMeta, type FontMeta } from './catalogue';

export interface LoadedFont {
  meta: FontMeta;
  font: Font;
  unitsPerEm: number;
  ascenderEm: number;
  descenderEm: number;
  /** cached advance width in em units */
  advanceEm: (ch: string) => number;
  hasGlyph: (ch: string) => boolean;
}

const cache = new Map<string, Promise<LoadedFont>>();

function normalise(font: Font): { ascenderEm: number; descenderEm: number } {
  const em = font.unitsPerEm || 1000;
  return { ascenderEm: (font.ascender || em * 0.8) / em, descenderEm: (font.descender || -em * 0.2) / em };
}

export async function loadFont(fontId: string, bold = false): Promise<LoadedFont> {
  const meta = getFontMeta(fontId);
  const file = bold && meta.boldFile ? meta.boldFile : meta.file;
  const key = `${fontId}:${file}`;
  const existing = cache.get(key);
  if (existing) return existing;

  const promise = (async (): Promise<LoadedFont> => {
    const res = await fetch(`${import.meta.env.BASE_URL}fonts/${file}`);
    if (!res.ok) throw new Error(`No se pudo cargar la fuente ${file}`);
    const buffer = await res.arrayBuffer();
    const font = parse(buffer) as Font;
    const em = font.unitsPerEm || 1000;
    const advances = new Map<string, number>();
    const advanceEm = (ch: string) => {
      let v = advances.get(ch);
      if (v === undefined) {
        const glyph = font.charToGlyph(ch);
        v = (glyph.advanceWidth ?? em * 0.5) / em;
        advances.set(ch, v);
      }
      return v;
    };
    const { ascenderEm, descenderEm } = normalise(font);
    return {
      meta: { ...meta, file },
      font,
      unitsPerEm: em,
      ascenderEm,
      descenderEm,
      advanceEm,
      hasGlyph: (ch: string) => font.charToGlyphIndex(ch) !== 0,
    };
  })();

  cache.set(key, promise);
  return promise;
}

/** Synchronous lookup for painters (font must already be loaded). */
const loaded = new Map<string, LoadedFont>();
const loadedById = new Map<string, LoadedFont>();
export function registerLoaded(font: LoadedFont): void {
  loaded.set(font.meta.file, font);
  loadedById.set(font.meta.id, font);
}
export function getLoadedByFile(file: string): LoadedFont | undefined {
  return loaded.get(file);
}
export function getFontById(fontId: string): LoadedFont | undefined {
  return loadedById.get(fontId);
}

export function fontFile(fontId: string, bold = false): string {
  const meta = getFontMeta(fontId);
  return bold && meta.boldFile ? meta.boldFile : meta.file;
}

/** Measure a word (kerning aware) in em units. */
export function measureWordEm(font: LoadedFont, text: string, tracking = 0): number {
  let w = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    w += font.advanceEm(ch) + tracking;
    if (i > 0) {
      const k = font.font.getKerningValue(font.font.charToGlyph(text[i - 1]), font.font.charToGlyph(ch));
      w += k / (font.unitsPerEm || 1000);
    }
  }
  return w;
}

export function ensureFont(fontId: string, bold = false): Promise<LoadedFont> {
  return loadFont(fontId, bold).then((f) => {
    registerLoaded(f);
    return f;
  });
}
