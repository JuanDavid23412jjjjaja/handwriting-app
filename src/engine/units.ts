import type { Orientation, PageSizeId, PaperConfig } from './types';

/** Page sizes in millimetres, portrait. */
export const PAGE_SIZES: Record<PageSizeId, { width: number; height: number; label: string }> = {
  A4: { width: 210, height: 297, label: 'A4 · 210 × 297 mm' },
  Letter: { width: 215.9, height: 279.4, label: 'US Letter · 8.5 × 11 in' },
  A5: { width: 148, height: 210, label: 'A5 · 148 × 210 mm' },
  HalfLetter: { width: 139.7, height: 215.9, label: 'Half Letter · 5.5 × 8.5 in' },
};

export function pageDimensions(paper: Pick<PaperConfig, 'size' | 'orientation'>): {
  width: number;
  height: number;
} {
  const s = PAGE_SIZES[paper.size];
  const portrait = paper.orientation === 'portrait';
  return portrait ? { width: s.width, height: s.height } : { width: s.height, height: s.width };
}

export const MM_PER_INCH = 25.4;

export function mmToPx(mm: number, dpi: number): number {
  return (mm / MM_PER_INCH) * dpi;
}

export function pxToMm(px: number, dpi: number): number {
  return (px / dpi) * MM_PER_INCH;
}

/** CSS pixels at 96 dpi for a given zoom factor. */
export function mmToCssPx(mm: number, zoom = 1): number {
  return (mm / MM_PER_INCH) * 96 * zoom;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function orientationLabel(o: Orientation): string {
  return o === 'portrait' ? 'Vertical' : 'Horizontal';
}
