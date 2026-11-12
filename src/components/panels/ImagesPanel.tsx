import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2, Upload } from 'lucide-react';
import type { ImageFilter } from '@/engine/types';
import { useDocStore } from '@/store/documentStore';
import { useUiStore } from '@/store/uiStore';
import { imageUrl } from '@/store/imageStore';
import { importImage } from '@/lib/importImage';
import { useI18n } from '@/i18n';
import { Section, Segmented } from '../ui';

function Thumb({ blobKey }: { blobKey: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let alive = true;
    imageUrl(blobKey).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [blobKey]);
  return url ? (
    <img src={url} alt="" className="h-10 w-10 rounded-md border border-line object-cover" />
  ) : (
    <div className="h-10 w-10 rounded-md border border-line bg-panel-2" />
  );
}

export function ImagesPanel({ pages }: { pages: number }) {
  const { t } = useI18n();
  const doc = useDocStore((s) => s.doc);
  const addImage = useDocStore((s) => s.addImage);
  const updateImage = useDocStore((s) => s.updateImage);
  const removeImage = useDocStore((s) => s.removeImage);
  const selectedId = useUiStore((s) => s.selectedImageId);
  const setSelected = useUiStore((s) => s.setSelectedImageId);
  const currentPage = useUiStore((s) => s.currentPage);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const selected = doc.images.find((i) => i.id === selectedId) ?? null;

  const upload = async (files: FileList | File[]) => {
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const placed = await importImage(file, Math.min(currentPage, Math.max(0, pages - 1)), doc);
        addImage(placed);
        setSelected(placed.id);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <Section title={t('images.title')}>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong bg-panel-2/50 px-4 py-6 text-center transition-colors hover:border-accent/60 hover:bg-accent-soft/30"
        >
          <ImagePlus size={20} className="text-muted" />
          <span className="text-[0.8rem] font-medium text-ink">{t('images.drop')}</span>
          <span className="text-[0.7rem] text-muted">{t('images.or')}</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) void upload(e.target.files);
            e.target.value = '';
          }}
        />
        <button className="btn w-full" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={13} />
          {t('images.add')}
        </button>
      </Section>

      <Section>
        {doc.images.length === 0 ? (
          <p className="rounded-xl bg-panel-2/70 px-3 py-2.5 text-[0.72rem] text-muted">{t('images.empty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {doc.images.map((img) => (
              <li key={img.id}>
                <button
                  onClick={() => setSelected(img.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-2 py-2 text-left transition-colors ${
                    selectedId === img.id
                      ? 'border-ink bg-panel-2'
                      : 'border-line bg-panel hover:border-line-strong'
                  }`}
                >
                  <Thumb blobKey={img.blobKey} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.75rem] font-medium text-ink">
                      {t('images.page')} {img.page + 1}
                    </span>
                    <span className="block truncate text-[0.65rem] text-muted">
                      {Math.round(img.widthMm)} × {Math.round(img.heightMm)} mm · {Math.round(img.rotation)}°
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selected && (
        <Section title={t('images.selected')}>
          <div className="space-y-3 rounded-xl border border-line bg-panel-2/40 p-3">
            <div>
              <span className="label">{t('images.filter')}</span>
              <Segmented
                full
                value={selected.filter}
                options={[
                  { value: 'none' as ImageFilter, label: t('images.none') },
                  { value: 'grayscale' as ImageFilter, label: t('images.grayscale') },
                  { value: 'printed' as ImageFilter, label: t('images.printed') },
                ]}
                onChange={(filter) => updateImage(selected.id, { filter })}
              />
            </div>
            <label className="block">
              <span className="label">{t('images.page')}</span>
              <select
                className="field"
                value={selected.page}
                onChange={(e) => updateImage(selected.id, { page: Number(e.target.value) })}
              >
                {Array.from({ length: Math.max(1, pages) }, (_, i) => (
                  <option key={i} value={i}>
                    {t('images.page')} {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="btn w-full !text-accent hover:!bg-accent-soft/60"
              onClick={() => {
                removeImage(selected.id);
                setSelected(null);
              }}
            >
              <Trash2 size={13} />
              {t('images.delete')}
            </button>
          </div>
          <p className="text-[0.68rem] leading-relaxed text-muted">{t('images.hint')}</p>
        </Section>
      )}
    </div>
  );
}
