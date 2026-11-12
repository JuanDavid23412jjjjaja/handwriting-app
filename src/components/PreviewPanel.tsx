import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minus, Plus } from 'lucide-react';
import type { HandDocument, PagePlan } from '@/engine/types';
import { mmToCssPx } from '@/engine/units';
import { useDocStore } from '@/store/documentStore';
import { useUiStore } from '@/store/uiStore';
import { useI18n } from '@/i18n';
import { PageCanvas } from './PageCanvas';

interface PreviewPanelProps {
  pages: PagePlan[];
  layouting: boolean;
  error: string | null;
  onDropFile: (file: File, page: number) => void;
}

export function PreviewPanel({ pages, layouting, error, onDropFile }: PreviewPanelProps) {
  const { t } = useI18n();
  const doc = useDocStore((s) => s.doc);
  const updateImage = useDocStore((s) => s.updateImage);
  const zoom = useUiStore((s) => s.zoom);
  const setZoom = useUiStore((s) => s.setZoom);
  const currentPage = useUiStore((s) => s.currentPage);
  const setCurrentPage = useUiStore((s) => s.setCurrentPage);
  const selectedImageId = useUiStore((s) => s.selectedImageId);
  const setSelectedImageId = useUiStore((s) => s.setSelectedImageId);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [containerWidth, setContainerWidth] = useState(900);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerWidth(entry.contentRect.width));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const maxWidthMm = useMemo(() => Math.max(...pages.map((p) => p.widthMm), 210), [pages]);
  const fitZoom = Math.max(0.35, Math.min(1.6, (containerWidth - 96) / mmToCssPx(maxWidthMm, 1)));

  const scrollToPage = (index: number) => {
    const el = pageRefs.current[index];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setCurrentPage(index);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-panel/95 px-1.5 py-1 shadow-[0_10px_30px_-18px_rgba(40,28,12,0.6)] backdrop-blur">
          <button
            className="btn btn-ghost !rounded-full !p-1.5"
            onClick={() => setZoom(zoom - 0.1)}
            aria-label={t('zoom.out')}
          >
            <Minus size={14} />
          </button>
          <span className="w-11 text-center text-[0.7rem] font-medium tabular-nums text-ink-soft">
            {Math.round(zoom * 100)}%
          </span>
          <button
            className="btn btn-ghost !rounded-full !p-1.5"
            onClick={() => setZoom(zoom + 0.1)}
            aria-label={t('zoom.in')}
          >
            <Plus size={14} />
          </button>
          <span className="mx-0.5 h-4 w-px bg-line" />
          <button className="btn btn-ghost !rounded-full !p-1.5" onClick={() => setZoom(fitZoom)} title={t('zoom.fit')}>
            <Maximize2 size={13} />
          </button>
          {pages.length > 1 && (
            <>
              <span className="mx-0.5 h-4 w-px bg-line" />
              <button className="btn btn-ghost !rounded-full !p-1.5" onClick={() => scrollToPage(Math.max(0, currentPage - 1))}>
                <ChevronLeft size={14} />
              </button>
              <span className="px-0.5 text-[0.68rem] tabular-nums text-muted">
                {Math.min(currentPage + 1, pages.length)} {t('zoom.of')} {pages.length}
              </span>
              <button
                className="btn btn-ghost !rounded-full !p-1.5"
                onClick={() => scrollToPage(Math.min(pages.length - 1, currentPage + 1))}
              >
                <ChevronRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={scrollerRef} className="h-full overflow-y-auto px-6 pb-12 pt-16">
        {error && (
          <div className="mx-auto max-w-md rounded-xl border border-accent/40 bg-accent-soft/50 px-4 py-3 text-[0.78rem] text-accent-2">
            {error}
          </div>
        )}

        {!error && pages.length === 0 && layouting && (
          <div className="flex flex-col items-center gap-4 pt-16">
            <div className="shimmer page-shadow h-[500px] w-[380px] rounded-[3px]" />
            <p className="text-[0.75rem] text-muted">{t('preview.loading')}</p>
          </div>
        )}

        {!error && pages.length === 0 && !layouting && (
          <p className="pt-24 text-center text-[0.8rem] text-muted">{t('preview.empty')}</p>
        )}

        <div className="mx-auto flex w-fit flex-col items-center gap-8">
          {pages.map((page, index) => (
            <div
              key={page.index}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              className="scroll-mt-16"
              onMouseDown={() => setCurrentPage(index)}
            >
              <PageCanvas
                page={page}
                doc={doc as HandDocument}
                zoom={zoom}
                selectedImageId={selectedImageId}
                onSelectImage={setSelectedImageId}
                onMoveImage={updateImage}
                onDropFile={onDropFile}
                pageIndex={index}
              />
              <p className="mt-2 text-center text-[0.64rem] uppercase tracking-[0.16em] text-muted/80">
                {index + 1} / {pages.length}
              </p>
            </div>
          ))}
        </div>

        {layouting && pages.length > 0 && (
          <div className="pointer-events-none fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-line bg-panel/95 px-3 py-1.5 text-[0.68rem] text-muted shadow">
            {t('preview.loading')}
          </div>
        )}
      </div>
    </div>
  );
}
