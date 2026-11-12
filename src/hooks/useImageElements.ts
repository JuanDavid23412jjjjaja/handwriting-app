import { useEffect, useState } from 'react';
import type { PlacedImage } from '@/engine/types';
import { loadImageElement } from '@/store/imageStore';

export function useImageElements(images: PlacedImage[]): Map<string, HTMLImageElement> {
  const [map, setMap] = useState<Map<string, HTMLImageElement>>(new Map());
  const keys = images.map((i) => i.blobKey).join('|');

  useEffect(() => {
    let alive = true;
    const unique = Array.from(new Set(keys.split('|').filter(Boolean)));
    Promise.all(
      unique.map(async (key) => {
        const el = await loadImageElement(key);
        return [key, el] as const;
      }),
    ).then((entries) => {
      if (!alive) return;
      const next = new Map<string, HTMLImageElement>();
      for (const [key, el] of entries) if (el) next.set(key, el);
      setMap(next);
    });
    return () => {
      alive = false;
    };
  }, [keys]);

  return map;
}
