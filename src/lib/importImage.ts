import type { HandDocument, PlacedImage } from '@/engine/types';
import { pageDimensions } from '@/engine/units';
import { putImage } from '@/store/imageStore';

export async function importImage(file: File, page: number, doc: HandDocument): Promise<PlacedImage> {
  const { key, width, height } = await putImage(file);
  const dims = pageDimensions(doc.paper);
  const maxW = dims.width * 0.52;
  const maxH = dims.height * 0.4;
  const ratio = Math.min(maxW / width, maxH / height, 1);
  const w = width * ratio;
  const h = height * ratio;
  return {
    id: crypto.randomUUID(),
    blobKey: key,
    page,
    xMm: (dims.width - w) / 2,
    yMm: (dims.height - h) / 2,
    widthMm: w,
    heightMm: h,
    rotation: 0,
    mode: 'overlay',
    filter: 'none',
  };
}
