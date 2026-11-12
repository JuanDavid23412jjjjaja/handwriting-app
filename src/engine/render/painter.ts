import type { GlyphPlan, PagePlan, PlacedImage } from '../types';
import { getFontById } from '../fonts/fontService';
import { SYMBOL_SHAPES } from '../math/symbols';
import { paintPaperDetails } from '../paper/paper';

export interface PaintOptions {
  images?: Map<string, CanvasImageSource>;
  /** default ink colour for glyphs without their own colour */
  inkColor?: string;
  /** dev aid: skip the paper tint */
  transparentPaper?: boolean;
}

const pathCache = new Map<string, Path2D>();
const noiseTile = { canvas: null as HTMLCanvasElement | null };

function getNoiseTile(): HTMLCanvasElement {
  if (noiseTile.canvas) return noiseTile.canvas;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const data = ctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 120 + Math.random() * 110;
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 26;
  }
  ctx.putImageData(data, 0, 0);
  noiseTile.canvas = canvas;
  return canvas;
}

function glyphPath(fontId: string, ch: string, sizeMm: number): Path2D | null {
  const key = `${fontId}|${ch}|${sizeMm.toFixed(3)}`;
  const cached = pathCache.get(key);
  if (cached) return cached;
  const font = getFontById(fontId);
  if (!font || !font.hasGlyph(ch)) return null;
  const path = font.font.getPath(ch, 0, 0, sizeMm);
  const p = new Path2D();
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        p.moveTo(cmd.x, cmd.y);
        break;
      case 'L':
        p.lineTo(cmd.x, cmd.y);
        break;
      case 'C':
        p.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        break;
      case 'Q':
        p.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        break;
      case 'Z':
        p.closePath();
        break;
    }
  }
  pathCache.set(key, p);
  return p;
}

function strokePolyline(ctx: CanvasRenderingContext2D, points: Array<[number, number]>, width: number): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (points.length === 2) {
    ctx.moveTo(points[0][0], points[0][1]);
    ctx.lineTo(points[1][0], points[1][1]);
    ctx.stroke();
    return;
  }
  // smooth quadratic through midpoints
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    ctx.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

function drawSymbol(ctx: CanvasRenderingContext2D, glyph: GlyphPlan, bodyColor: string): void {
  const shape = SYMBOL_SHAPES[glyph.symbol!];
  if (!shape) return;
  const size = glyph.sizeMm;
  const pivotX = glyph.x + (shape.w * size) / 2;
  const pivotY = glyph.y - size * 0.32;
  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate((glyph.rot * Math.PI) / 180);
  ctx.scale(1, glyph.scaleY);
  ctx.translate(-pivotX, -pivotY);
  ctx.strokeStyle = bodyColor;
  ctx.globalAlpha = glyph.alpha;
  for (const pts of shape.strokes(size)) {
    const moved: Array<[number, number]> = pts.map(([x, y]) => [x + glyph.x, y + glyph.y]);
    strokePolyline(ctx, moved, Math.max(0.08, size * 0.055) + (glyph.strokeMm ?? 0));
  }
  ctx.restore();
}

function drawGlyph(ctx: CanvasRenderingContext2D, glyph: GlyphPlan, color: string): void {
  if (glyph.symbol) {
    drawSymbol(ctx, glyph, color);
    return;
  }
  const font = getFontById(glyph.fontId);
  if (!font) return;
  const path = glyphPath(glyph.fontId, glyph.ch, glyph.sizeMm);
  if (!path) return;
  const adv = font.advanceEm(glyph.ch) * glyph.sizeMm;
  // glyph paths are built at the origin with the baseline at y = 0, so the
  // rotation pivot lives in local space: mid-advance, a third up the em box.
  const pivotX = adv / 2;
  const pivotY = -glyph.sizeMm * 0.33;
  ctx.save();
  ctx.translate(glyph.x, glyph.y);
  ctx.translate(pivotX, pivotY);
  ctx.rotate((glyph.rot * Math.PI) / 180);
  ctx.scale(1, glyph.scaleY);
  ctx.translate(-pivotX, -pivotY);
  ctx.globalAlpha = glyph.alpha;
  ctx.fillStyle = color;
  ctx.fill(path);
  if (glyph.strokeMm) {
    ctx.strokeStyle = color;
    ctx.lineWidth = glyph.strokeMm;
    ctx.lineJoin = 'round';
    ctx.stroke(path);
  }
  ctx.restore();
}

function drawImage(ctx: CanvasRenderingContext2D, image: PlacedImage, source: CanvasImageSource): void {
  const { xMm, yMm, widthMm, heightMm, rotation } = image;
  ctx.save();
  ctx.translate(xMm + widthMm / 2, yMm + heightMm / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (image.filter === 'grayscale') ctx.filter = 'grayscale(1) contrast(1.04)';
  else if (image.filter === 'printed') ctx.filter = 'saturate(0.9) contrast(1.03)';
  ctx.globalAlpha = 0.98;
  ctx.drawImage(source, -widthMm / 2, -heightMm / 2, widthMm, heightMm);
  ctx.restore();
}

/**
 * Paints one page onto any 2D context. `pxPerMm` is the only resolution knob:
 * preview uses ~3.78 px/mm (96 dpi) × zoom, export uses DPI/25.4.
 */
export function paintPage(
  ctx: CanvasRenderingContext2D,
  page: PagePlan,
  pxPerMm: number,
  options: PaintOptions = {},
): void {
  const wPx = page.widthMm * pxPerMm;
  const hPx = page.heightMm * pxPerMm;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (!options.transparentPaper) {
    ctx.fillStyle = page.paper.paperColor;
    ctx.fillRect(0, 0, wPx, hPx);
    const texture = page.paper.texture;
    if (texture > 0) {
      const pattern = ctx.createPattern(getNoiseTile(), 'repeat');
      if (pattern) {
        ctx.globalAlpha = Math.min(0.35, texture * 0.4);
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, wPx, hPx);
        ctx.globalAlpha = 1;
      }
      const vignette = ctx.createRadialGradient(
        wPx / 2,
        hPx / 2,
        Math.min(wPx, hPx) * 0.25,
        wPx / 2,
        hPx / 2,
        Math.max(wPx, hPx) * 0.72,
      );
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, `rgba(60,40,20,${0.05 * texture})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, wPx, hPx);
    }
  }

  ctx.scale(pxPerMm, pxPerMm);
  ctx.translate(0, 0);

  paintPaperDetails(ctx, page.paper, page.widthMm, page.heightMm, {
    seed: page.index * 7919 + 17,
    page: page.index,
  });

  if (options.images) {
    for (const image of page.images) {
      const source = options.images.get(image.blobKey);
      if (source) drawImage(ctx, image, source);
    }
  }

  for (const stroke of page.strokes) {
    ctx.globalAlpha = stroke.alpha;
    ctx.strokeStyle = stroke.color;
    const points = stroke.points;
    if (points.length === 2) {
      ctx.beginPath();
      ctx.lineWidth = stroke.widthMm;
      ctx.moveTo(points[0][0], points[0][1]);
      const [x1, y1] = points[1];
      ctx.quadraticCurveTo(
        (points[0][0] + x1) / 2 + (stroke.rough ? 0.18 : 0),
        (points[0][1] + y1) / 2 + (stroke.rough ? 0.12 : 0),
        x1,
        y1,
      );
      ctx.stroke();
    } else {
      strokePolyline(ctx, points, stroke.widthMm);
    }
  }

  const color = options.inkColor ?? '#1a2b6b';
  for (const glyph of page.glyphs) {
    drawGlyph(ctx, glyph, color);
  }

  ctx.restore();
}
