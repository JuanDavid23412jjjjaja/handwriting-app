import { useEffect, useRef, useState } from 'react';
import { Bold, Eraser, FlaskConical, Minus, Table2, Underline, SplitSquareVertical } from 'lucide-react';
import { DEFAULT_TEXT, useDocStore } from '@/store/documentStore';
import { useI18n } from '@/i18n';

export function EditorPanel({ pages }: { pages: number }) {
  const { t } = useI18n();
  const text = useDocStore((s) => s.doc.text);
  const setText = useDocStore((s) => s.setText);
  const [value, setValue] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (text !== value) setValue(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  const commit = (next: string) => {
    setValue(next);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setText(next), 220);
  };

  const apply = (before: string, after = '', placeholder = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    commit(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    });
  };

  const insertBlock = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const before = value.slice(0, start);
    const separator = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const next = before + separator + snippet + value.slice(start);
    commit(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = (before + separator + snippet).length;
      el.setSelectionRange(pos, pos);
    });
  };

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="card flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-3">
          <h2 className="font-display text-xl leading-none text-ink">{t('editor.title')}</h2>
          <div className="flex items-center gap-1">
            <button
              className="btn btn-ghost !px-2 !py-1.5"
              title={t('editor.bold')}
              aria-label={t('editor.bold')}
              onClick={() => apply('**', '**', 'importante')}
            >
              <Bold size={14} />
            </button>
            <button
              className="btn btn-ghost !px-2 !py-1.5"
              title={t('editor.underline')}
              aria-label={t('editor.underline')}
              onClick={() => apply('__', '__', 'subrayado')}
            >
              <Underline size={14} />
            </button>
            <button
              className="btn btn-ghost !px-2 !py-1.5"
              title={t('editor.math')}
              aria-label={t('editor.math')}
              onClick={() => apply('$', '$', 'x^2 + y^2 = r^2')}
            >
              <Minus size={14} className="rotate-90" />
            </button>
            <button
              className="btn btn-ghost !px-2 !py-1.5"
              title={t('editor.table')}
              aria-label={t('editor.table')}
              onClick={() => insertBlock('| Concepto | Valor |\n| --- | --- |\n| Uno | 12 |\n| Dos | 24 |\n')}
            >
              <Table2 size={14} />
            </button>
            <button
              className="btn btn-ghost !px-2 !py-1.5"
              title={t('editor.pagebreak')}
              aria-label={t('editor.pagebreak')}
              onClick={() => insertBlock('---page---\n')}
            >
              <SplitSquareVertical size={14} />
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => commit(e.target.value)}
          placeholder={t('editor.placeholder')}
          spellCheck={false}
          className="min-h-0 flex-1 resize-none bg-transparent px-4 py-4 font-mono text-[0.79rem] leading-[1.75] text-ink-soft outline-none placeholder:text-muted/60"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-panel-2/50 px-3.5 py-2.5">
          <p className="text-[0.66rem] leading-snug text-muted">{t('editor.help')}</p>
          <div className="flex items-center gap-2 text-[0.68rem] tabular-nums text-muted">
            <span>{words} {t('editor.words')}</span>
            <span className="text-line-strong">·</span>
            <span>{value.length} {t('editor.chars')}</span>
            <span className="text-line-strong">·</span>
            <span>{pages} {t('editor.pages')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn flex-1" onClick={() => apply('$', '$', '\\frac{a}{b}')}>
          <FlaskConical size={13} />
          {t('editor.math')}
        </button>
        <button className="btn" onClick={() => commit(DEFAULT_TEXT)}>
          {t('editor.sample')}
        </button>
        <button className="btn !px-2.5" title={t('editor.clear')} aria-label={t('editor.clear')} onClick={() => commit('')}>
          <Eraser size={14} />
        </button>
      </div>

      <p className="px-1 text-[0.68rem] leading-relaxed text-muted">{t('editor.tip')}</p>
    </div>
  );
}
