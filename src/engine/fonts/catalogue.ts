export interface FontMeta {
  id: string;
  name: string;
  file: string;
  category: 'print' | 'cursive';
  /** visual size compensation, 1 = neutral */
  scale: number;
  /** extra tracking in em */
  tracking: number;
  /** italics-like slant in degrees (0 = none) */
  slant: number;
  /** optional bold face */
  boldFile?: string;
  /** one-line character description */
  note: string;
}

/**
 * Curated catalogue — all SIL Open Font License (or Apache 2.0 for Homemade
 * Apple), self hosted from /public/fonts so the app works fully offline.
 */
export const FONTS: FontMeta[] = [
  {
    id: 'patrick',
    name: 'Patrick Hand',
    file: 'PatrickHand.ttf',
    category: 'print',
    scale: 1,
    tracking: 0.005,
    slant: 0,
    note: 'Legible print, classroom feel',
  },
  {
    id: 'kalam',
    name: 'Kalam',
    file: 'Kalam-Regular.ttf',
    boldFile: 'Kalam-Bold.ttf',
    category: 'print',
    scale: 1,
    tracking: 0.002,
    slant: 0,
    note: 'Warm marker pen, natural slant',
  },
  {
    id: 'indie',
    name: 'Indie Flower',
    file: 'IndieFlower.ttf',
    category: 'print',
    scale: 1.02,
    tracking: 0.01,
    slant: 0,
    note: 'Round, friendly lettering',
  },
  {
    id: 'gochi',
    name: 'Gochi Hand',
    file: 'GochiHand.ttf',
    category: 'print',
    scale: 0.98,
    tracking: 0.005,
    slant: 0,
    note: 'Quick ballpoint jotting',
  },
  {
    id: 'architects',
    name: 'Architects Daughter',
    file: 'ArchitectsDaughter.ttf',
    category: 'print',
    scale: 1.04,
    tracking: 0.015,
    slant: 0,
    note: 'Drafting, technical, clean',
  },
  {
    id: 'shadows',
    name: 'Shadows Into Light',
    file: 'ShadowsIntoLight.ttf',
    category: 'print',
    scale: 1.08,
    tracking: 0.01,
    slant: 0,
    note: 'Light, airy pen',
  },
  {
    id: 'caveat',
    name: 'Caveat',
    file: 'Caveat.ttf',
    category: 'cursive',
    scale: 1.05,
    tracking: 0.005,
    slant: 0,
    note: 'Fast expressive cursive',
  },
  {
    id: 'homemade',
    name: 'Homemade Apple',
    file: 'HomemadeApple.ttf',
    category: 'cursive',
    scale: 0.94,
    tracking: 0,
    slant: 0,
    note: 'Ink pen, personal letter',
  },
  {
    id: 'dancing',
    name: 'Dancing Script',
    file: 'DancingScript.ttf',
    category: 'cursive',
    scale: 1.02,
    tracking: 0,
    slant: 0,
    note: 'Elegant connected script',
  },
  {
    id: 'nothing',
    name: 'Nothing You Could Do',
    file: 'NothingYouCouldDo.ttf',
    category: 'cursive',
    scale: 1.05,
    tracking: 0.005,
    slant: 0,
    note: 'Relaxed journal handwriting',
  },
  {
    id: 'cedarville',
    name: 'Cedarville Cursive',
    file: 'CedarvilleCursive.ttf',
    category: 'cursive',
    scale: 0.98,
    tracking: 0,
    slant: 0,
    note: 'Slanted school cursive',
  },
  {
    id: 'labelle',
    name: 'La Belle Aurore',
    file: 'LaBelleAurore.ttf',
    category: 'cursive',
    scale: 1.02,
    tracking: 0.005,
    slant: 0,
    note: 'Romantic, flowing ink',
  },
];

export const FONT_MAP: Record<string, FontMeta> = Object.fromEntries(
  FONTS.map((f) => [f.id, f]),
);

export function getFontMeta(id: string): FontMeta {
  return FONT_MAP[id] ?? FONTS[0];
}
