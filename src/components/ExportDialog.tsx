import { useState } from 'react';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import type { HandDocument, PagePlan } from '@/engine/types';
import { downloadBlob, exportDocument, type ExportFormat } from '@/export/exportDocument';
import { useUiStore } from '@/store/uiStore';
import { useI18n } from '@/i18n';
import { Modal, Segmented, Slider } from './ui';

export function ExportDialog({ pages, doc }: { pages: PagePlan[]; doc: HandDocument }) {
  const { t } = useI18n();
  const open = useUiStore((s) => s.exportOpen);
  const setOpen = useUiStore((s) => s.setExportOpen);
  const currentPage = useUiStore((s) => s.currentPage);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [dpi, setDpi] = useState(300);
  const [quality, setQuality] = useState(0.92);
  const [range, setRange] = useState<'all' | 'current'>('all');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const selected = range === 'all' ? pages.map((p) => p.index) : [Math.min(currentPage, pages.length - 1)];

  const run = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    setProgress(0);
    try {
      const { blob, filename } = await exportDocument(pages, doc, {
        format,
        dpi,
        quality,
        pages: selected.filter((i) => i >= 0),
        onProgress: (d, total) => setProgress(d / total),
      });
      downloadBlob(blob, filename);
      setDone(filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title={t('export.title')}
      subtitle={t('export.subtitle')}
      footer={
        <>
          <button className="btn" onClick={() => setOpen(false)}>
            {t('export.close')}
          </button>
          <button className="btn btn-accent min-w-[130px]" onClick={run} disabled={busy || pages.length === 0}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {busy ? t('export.exporting') : t('export.download')}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <span className="label">{t('export.format')}</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['pdf', FileText, t('export.pdf'), t('export.pdfNote')],
                ['png', FileImage, t('export.png'), t('export.pngNote')],
                ['jpg', FileImage, t('export.jpg'), t('export.jpgNote')],
              ] as const
            ).map(([value, Icon, label, note]) => (
              <button
                key={value}
                onClick={() => setFormat(value)}
                className={`rounded-xl border px-2.5 py-2.5 text-left transition-all ${
                  format === value ? 'border-ink bg-panel-2 shadow-[0_6px_18px_-14px_rgba(40,28,12,0.8)]' : 'border-line hover:border-line-strong'
                }`}
              >
                <Icon size={16} className={format === value ? 'text-accent' : 'text-muted'} />
                <span className="mt-1.5 block text-[0.8rem] font-semibold text-ink">{label}</span>
                <span className="mt-0.5 block text-[0.63rem] leading-tight text-muted">{note}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="label">{t('export.range')}</span>
            <Segmented
              full
              value={range}
              options={[
                { value: 'all', label: `${t('export.all')} (${pages.length})` },
                { value: 'current', label: t('export.current') },
              ]}
              onChange={setRange}
            />
          </div>
          <div>
            <span className="label">{t('export.dpi')}</span>
            <Segmented
              full
              value={String(dpi)}
              options={[
                { value: '150', label: '150' },
                { value: '300', label: '300' },
              ]}
              onChange={(v) => setDpi(Number(v))}
            />
          </div>
        </div>

        {format === 'jpg' && (
          <Slider
            label={t('export.quality')}
            value={quality}
            min={0.5}
            max={1}
            step={0.01}
            onChange={setQuality}
          />
        )}

        <p className="rounded-xl bg-panel-2/70 px-3 py-2.5 text-[0.7rem] leading-relaxed text-muted">{t('export.note')}</p>

        {busy && (
          <div className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-ink transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
            <p className="text-right text-[0.65rem] tabular-nums text-muted">
              {Math.round(progress * 100)}%
            </p>
          </div>
        )}

        {done && (
          <p className="rounded-xl bg-sea-soft/70 px-3 py-2 text-[0.72rem] text-sea">
            {t('export.fileReady')}: {done}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-accent-soft/60 px-3 py-2 text-[0.72rem] text-accent-2">{error}</p>
        )}
      </div>
    </Modal>
  );
}
