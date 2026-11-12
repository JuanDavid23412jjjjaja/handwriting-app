import { Check, Download, Languages, PenLine, RotateCcw } from 'lucide-react';
import { useDocStore } from '@/store/documentStore';
import { useI18n } from '@/i18n';
import { useUiStore } from '@/store/uiStore';

export function Header({ layouting }: { layouting: boolean }) {
  const { t, lang, setLang } = useI18n();
  const setExportOpen = useUiStore((s) => s.setExportOpen);
  const reset = useDocStore((s) => s.reset);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-panel/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-panel shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
          <PenLine size={17} strokeWidth={1.7} />
        </div>
        <div className="leading-tight">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-[1.45rem] tracking-tight text-ink">{t('app.name')}</h1>
            <span className="hidden text-[0.68rem] text-muted sm:inline">{t('app.tagline')}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[0.66rem] text-muted">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors ${layouting ? 'bg-accent' : 'bg-sea'}`}
            />
            {layouting ? t('preview.loading') : t('header.saved')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          className="btn btn-ghost hidden sm:inline-flex"
          onClick={() => {
            if (confirm(lang === 'es' ? '¿Empezar un documento nuevo? Se perderá el actual.' : 'Start a new document? The current one will be lost.')) {
              reset();
              useUiStore.getState().setCurrentPage(0);
            }
          }}
        >
          <RotateCcw size={14} />
          {t('header.new')}
        </button>
        <button
          className="btn btn-ghost !px-2.5"
          onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
          aria-label={t('header.language')}
          title={t('header.language')}
        >
          <Languages size={15} />
          <span className="text-[0.72rem] font-semibold uppercase tracking-wide">{lang}</span>
        </button>
        <button className="btn btn-accent" onClick={() => setExportOpen(true)}>
          <Download size={14} />
          {t('header.export')}
        </button>
      </div>
    </header>
  );
}

export function AutosaveBadge({ done }: { done: boolean }) {
  return (
    <span className="chip">
      <Check size={11} className={done ? 'text-sea' : 'text-muted'} />
      autosave
    </span>
  );
}
