import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import type { HandDocument, PagePlan } from '@/engine/types';
import { paintPage } from '@/engine/render/painter';
import { loadImageElement } from '@/store/imageStore';

export type ExportFormat = 'pdf' | 'png' | 'jpg';

export interface ExportOptions {
  format: ExportFormat;
  dpi: number;
  quality: number;
  pages: number[];
  onProgress?: (done: number, total: number) => void;
}

async function loadImages(doc: HandDocument): Promise<Map<string, CanvasImageSource>> {
  const map = new Map<string, CanvasImageSource>();
  for (const image of doc.images) {
    if (map.has(image.blobKey)) continue;
    const el = await loadImageElement(image.blobKey);
    if (el) map.set(image.blobKey, el);
  }
  return map;
}

export async function renderPageCanvas(
  page: PagePlan,
  doc: HandDocument,
  dpi: number,
  images: Map<string, CanvasImageSource>,
): Promise<HTMLCanvasElement> {
  const pxPerMm = dpi / 25.4;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(page.widthMm * pxPerMm);
  canvas.height = Math.round(page.heightMm * pxPerMm);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  paintPage(ctx, page, pxPerMm, { images, inkColor: doc.ink.color });
  return canvas;
}

function safeName(name: string): string {
  return (name || 'documento').replace(/[\\/:*?"<>|]+/g, '-').trim().slice(0, 60);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function exportDocument(
  pages: PagePlan[],
  doc: HandDocument,
  options: ExportOptions,
): Promise<{ blob: Blob; filename: string }> {
  const selected = options.pages
    .map((i) => pages[i])
    .filter((p): p is PagePlan => Boolean(p));
  if (!selected.length) throw new Error('No pages selected');

  const images = await loadImages(doc);
  const quality = options.format === 'jpg' ? options.quality : undefined;
  const baseName = safeName(doc.title);

  if (options.format === 'pdf') {
    const first = selected[0];
    const pdf = new jsPDF({
      orientation: first.widthMm > first.heightMm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [first.widthMm, first.heightMm],
      compress: true,
    });
    for (let i = 0; i < selected.length; i++) {
      const page = selected[i];
      if (i > 0) pdf.addPage([page.widthMm, page.heightMm], page.widthMm > page.heightMm ? 'landscape' : 'portrait');
      const canvas = await renderPageCanvas(page, doc, options.dpi, images);
      // PNG at 300 dpi takes ~30 s per page to encode; JPEG at 0.96 is invisible
      // at print size and keeps the whole export under a few seconds.
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, page.widthMm, page.heightMm);
      options.onProgress?.(i + 1, selected.length);
    }
    return { blob: pdf.output('blob'), filename: `${baseName}.pdf` };
  }

  const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
  const canvases: Array<{ canvas: HTMLCanvasElement; index: number }> = [];
  for (let i = 0; i < selected.length; i++) {
    canvases.push({ canvas: await renderPageCanvas(selected[i], doc, options.dpi, images), index: selected[i].index });
    options.onProgress?.(i + 1, selected.length);
  }

  const toBlob = (canvas: HTMLCanvasElement) =>
    new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), mime, quality));

  if (canvases.length === 1) {
    return {
      blob: await toBlob(canvases[0].canvas),
      filename: `${baseName}.${options.format}`,
    };
  }

  const zip = new JSZip();
  for (const { canvas, index } of canvases) {
    zip.file(`${baseName}-pagina-${index + 1}.${options.format}`, await toBlob(canvas));
  }
  return { blob: await zip.generateAsync({ type: 'blob' }), filename: `${baseName}.zip` };
}
