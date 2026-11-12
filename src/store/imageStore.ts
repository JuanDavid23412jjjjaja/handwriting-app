import { get, set, del } from 'idb-keyval';

const PREFIX = 'escribano:img:';

/** Downscale imported pictures so IndexedDB stays small and fast. */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const max = 2500;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1 && file.size < 2_500_000) return file;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const isPng = file.type === 'image/png';
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      isPng ? 'image/png' : 'image/jpeg',
      isPng ? undefined : 0.92,
    );
  });
}

export async function putImage(file: File): Promise<{ key: string; width: number; height: number }> {
  const blob = await prepare(file);
  const key = `${PREFIX}${crypto.randomUUID()}`;
  await set(key, blob);
  const bitmap = await createImageBitmap(blob);
  return { key, width: bitmap.width, height: bitmap.height };
}

export async function getImageBlob(key: string): Promise<Blob | undefined> {
  return get<Blob>(key);
}

export async function deleteImageBlob(key: string): Promise<void> {
  await del(key);
}

const urlCache = new Map<string, string>();
export async function imageUrl(key: string): Promise<string | undefined> {
  const cached = urlCache.get(key);
  if (cached) return cached;
  const blob = await getImageBlob(key);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

export async function loadImageElement(key: string): Promise<HTMLImageElement | undefined> {
  const url = await imageUrl(key);
  if (!url) return undefined;
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  await img.decode().catch(() => undefined);
  return img;
}
