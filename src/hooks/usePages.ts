import { useEffect, useMemo, useRef, useState } from 'react';
import type { HandDocument, PagePlan } from '@/engine/types';
import { parseDocument } from '@/engine/parser/parseDocument';
import { buildPlan } from '@/engine/layout/layout';
import { ensureFont, getFontById } from '@/engine/fonts/fontService';
import { FONTS } from '@/engine/fonts/catalogue';

export interface LayoutState {
  pages: PagePlan[];
  layouting: boolean;
  error: string | null;
  ms: number;
}

export function usePages(doc: HandDocument): LayoutState {
  const blocks = useMemo(() => parseDocument(doc.text), [doc.text]);
  const [state, setState] = useState<LayoutState>({ pages: [], layouting: true, error: null, ms: 0 });
  const [fontsReady, setFontsReady] = useState(0);
  const runId = useRef(0);

  useEffect(() => {
    let alive = true;
    setFontsReady(0);
    Promise.all([ensureFont(doc.ink.fontId, false), ensureFont('patrick', false)])
      .then(() => {
        if (alive) setFontsReady((n) => n + 1);
      })
      .catch((err: unknown) => {
        if (alive) setState((s) => ({ ...s, error: err instanceof Error ? err.message : String(err), layouting: false }));
      });
    return () => {
      alive = false;
    };
  }, [doc.ink.fontId]);

  useEffect(() => {
    if (!fontsReady) return;
    const timer = window.setTimeout(() => {
      const id = ++runId.current;
      setState((s) => ({ ...s, layouting: true }));
      // let the browser paint the "laying out" state first
      requestAnimationFrame(() => {
        const t0 = performance.now();
        try {
          const fonts: Record<string, ReturnType<typeof getFontById>> = {};
          for (const f of FONTS) {
            const loaded = getFontById(f.id);
            if (loaded) fonts[f.id] = loaded;
          }
          const pages = buildPlan(doc, blocks, fonts);
          if (runId.current !== id) return;
          setState({ pages, layouting: false, error: null, ms: performance.now() - t0 });
        } catch (err) {
          if (runId.current !== id) return;
          setState({
            pages: [],
            layouting: false,
            error: err instanceof Error ? err.message : String(err),
            ms: 0,
          });
        }
      });
    }, 110);
    return () => window.clearTimeout(timer);
  }, [doc, blocks, fontsReady]);

  return state;
}
