import type { PaperConfig } from '../types';
import { contentTop, ruledBaselines } from '../layout/layout';
import { mulberry32, hashString } from '../prng';

export interface PaperPaintOptions {
  seed: number;
  page: number;
  /** paint the ruling only, skipping header/margin decoration */
  plain?: boolean;
}

/** Draws everything that belongs to the paper itself, in millimetre space. */
export function paintPaperDetails(
  ctx: CanvasRenderingContext2D,
  paper: PaperConfig,
  widthMm: number,
  heightMm: number,
  opts: PaperPaintOptions,
): void {
  const rng = mulberry32(hashString(`${opts.seed}:paper:${opts.page}`));
  const jitter = (v: number) => v + (rng() - 0.5) * 0.22;
  const lineAlpha = 0.42;
  const top = contentTop(paper);
  const left = paper.margins.left;
  const right = widthMm - paper.margins.right;
  const bottom = heightMm - paper.margins.bottom;

  ctx.save();
  ctx.lineCap = 'round';

  const hLine = (y: number, x0 = left, x1 = right, width = 0.22, alpha = lineAlpha) => {
    ctx.beginPath();
    ctx.moveTo(x0, jitter(y));
    ctx.lineTo((x0 + x1) / 2, jitter(y));
    ctx.lineTo(x1, jitter(y));
    ctx.strokeStyle = paper.lineColor;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.stroke();
  };

  if (paper.template === 'ruled') {
    for (const y of ruledBaselines(paper, heightMm)) hLine(y, left, right, 0.24, lineAlpha);
  } else if (paper.template === 'graph') {
    const g = Math.max(2, paper.gridSizeMm);
    for (let x = left; x <= right + 0.01; x += g) {
      ctx.beginPath();
      ctx.moveTo(jitter(x), top);
      ctx.lineTo(jitter(x), bottom);
      ctx.strokeStyle = paper.lineColor;
      ctx.globalAlpha = lineAlpha * 0.8;
      ctx.lineWidth = 0.16;
      ctx.stroke();
    }
    for (let y = top; y <= bottom + 0.01; y += g) {
      hLine(y, left, right, 0.16, lineAlpha * 0.8);
    }
  } else if (paper.template === 'dotted') {
    const g = Math.max(3, paper.gridSizeMm);
    ctx.fillStyle = paper.lineColor;
    ctx.globalAlpha = 0.55;
    for (let y = top; y <= bottom + 0.01; y += g) {
      for (let x = left; x <= right + 0.01; x += g) {
        ctx.beginPath();
        ctx.arc(x, y, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (paper.headerLine && !opts.plain) {
    hLine(top, left, right, 0.3, 0.55);
  }

  if (paper.marginLine.enabled && !opts.plain) {
    const x = paper.marginLine.xMm;
    ctx.beginPath();
    ctx.moveTo(x + (rng() - 0.5) * 0.15, paper.margins.top);
    ctx.lineTo(x + (rng() - 0.5) * 0.2, heightMm - paper.margins.bottom);
    ctx.strokeStyle = paper.marginLine.color;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.26;
    ctx.stroke();
  }

  ctx.restore();
}

/** Baselines for a page, exposed for tests and hit-testing. */
export function baselinesFor(paper: PaperConfig, heightMm: number): number[] {
  return ruledBaselines(paper, heightMm);
}
