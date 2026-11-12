import type { PageSizeId, PaperTemplate } from '@/engine/types';
import { PAGE_SIZES } from '@/engine/units';
import { useDocStore } from '@/store/documentStore';
import { useI18n } from '@/i18n';
import { ColorPicker, Segmented, Section, Slider, Toggle } from '../ui';

const PAPER_TEMPLATES: PaperTemplate[] = ['blank', 'ruled', 'graph', 'dotted'];

const PAPER_COLORS = ['#fffdf7', '#ffffff', '#fbf6e9', '#f7efe2', '#f2f5f1', '#eef2f7', '#fdf3f3'];
const LINE_COLORS = ['#b9d2e8', '#a8c5a0', '#d8c6a8', '#b9b3c9', '#d9b3b3', '#a9b8c9'];

export function PaperPanel() {
  const { t } = useI18n();
  const paper = useDocStore((s) => s.doc.paper);
  const patchPaper = useDocStore((s) => s.patchPaper);
  const patchMargins = useDocStore((s) => s.patchMargins);

  return (
    <div className="space-y-6">
      <Section title={t('paper.template')}>
        <div className="grid grid-cols-2 gap-2">
          {PAPER_TEMPLATES.map((template) => (
            <button
              key={template}
              onClick={() => patchPaper({ template })}
              className={`group overflow-hidden rounded-xl border p-1.5 text-left transition-all ${
                paper.template === template
                  ? 'border-ink bg-panel-2 shadow-[0_6px_18px_-14px_rgba(40,28,12,0.8)]'
                  : 'border-line bg-panel hover:border-line-strong'
              }`}
            >
              <span
                className="block h-14 w-full rounded-lg border border-line/60"
                style={{
                  backgroundColor: paper.paperColor,
                  backgroundImage: templateBackground(template, paper.lineColor),
                  backgroundSize: template === 'dotted' ? '7px 7px' : undefined,
                }}
              />
              <span className="mt-1.5 flex items-center justify-between px-0.5 text-[0.72rem] font-medium text-ink-soft">
                {t(`paper.${template}` as const)}
                <span
                  className={`h-1.5 w-1.5 rounded-full ${paper.template === template ? 'bg-accent' : 'bg-transparent'}`}
                />
              </span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('paper.size')}>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="field"
            value={paper.size}
            onChange={(e) => patchPaper({ size: e.target.value as PageSizeId })}
          >
            {(Object.keys(PAGE_SIZES) as PageSizeId[]).map((size) => (
              <option key={size} value={size}>
                {PAGE_SIZES[size].label}
              </option>
            ))}
          </select>
          <Segmented
            full
            value={paper.orientation}
            options={[
              { value: 'portrait', label: t('paper.portrait') },
              { value: 'landscape', label: t('paper.landscape') },
            ]}
            onChange={(orientation) => patchPaper({ orientation })}
          />
        </div>
      </Section>

      <Section title={t('paper.margins')}>
        <div className="grid grid-cols-4 gap-1.5">
          {(
            [
              ['top', t('paper.top')],
              ['right', t('paper.right')],
              ['bottom', t('paper.bottom')],
              ['left', t('paper.left')],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="mb-1 block text-[0.63rem] uppercase tracking-wide text-muted">{label}</span>
              <input
                type="number"
                min={5}
                max={60}
                className="field !px-2 !py-1.5 tabular-nums"
                value={paper.margins[key]}
                onChange={(e) => patchMargins({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Slider
            label={t('paper.lineSpacing')}
            value={paper.lineSpacingMm}
            min={5}
            max={12}
            step={0.1}
            format={(v) => `${v.toFixed(1)} mm`}
            onChange={(lineSpacingMm) => patchPaper({ lineSpacingMm })}
          />
          <Slider
            label={t('paper.grid')}
            value={paper.gridSizeMm}
            min={3}
            max={10}
            step={1}
            format={(v) => `${v} mm`}
            onChange={(gridSizeMm) => patchPaper({ gridSizeMm })}
          />
        </div>
      </Section>

      <Section title={t('paper.color')}>
        <ColorPicker colors={PAPER_COLORS} value={paper.paperColor} onChange={(paperColor) => patchPaper({ paperColor })} />
        <div className="pt-1">
          <span className="label">{t('paper.lineColor')}</span>
          <ColorPicker colors={LINE_COLORS} value={paper.lineColor} onChange={(lineColor) => patchPaper({ lineColor })} />
        </div>
        <Slider
          label={t('paper.texture')}
          value={paper.texture}
          onChange={(texture) => patchPaper({ texture })}
        />
      </Section>

      <Section title={t('paper.marginLine')}>
        <Toggle
          label={t('paper.marginLine')}
          checked={paper.marginLine.enabled}
          onChange={(enabled) => patchPaper({ marginLine: { ...paper.marginLine, enabled } })}
        />
        {paper.marginLine.enabled && (
          <Slider
            label={t('paper.marginLineAt')}
            value={paper.marginLine.xMm}
            min={8}
            max={60}
            step={1}
            format={(v) => `${v} mm`}
            onChange={(xMm) => patchPaper({ marginLine: { ...paper.marginLine, xMm } })}
          />
        )}
        <Toggle
          label={t('paper.headerLine')}
          checked={paper.headerLine}
          onChange={(headerLine) => patchPaper({ headerLine })}
        />
        {paper.headerLine && (
          <Slider
            label={t('paper.top')}
            value={paper.headerHeightMm}
            min={4}
            max={30}
            step={1}
            format={(v) => `${v} mm`}
            onChange={(headerHeightMm) => patchPaper({ headerHeightMm })}
          />
        )}
      </Section>
    </div>
  );
}

function templateBackground(template: PaperTemplate, lineColor: string): string | undefined {
  switch (template) {
    case 'ruled':
      return `repeating-linear-gradient(to bottom, transparent 0 8px, ${lineColor}b0 8px 9px)`;
    case 'graph':
      return `linear-gradient(to right, ${lineColor}90 1px, transparent 1px), linear-gradient(to bottom, ${lineColor}90 1px, transparent 1px)`;
    case 'dotted':
      return `radial-gradient(circle, ${lineColor} 1px, transparent 1.2px)`;
    default:
      return undefined;
  }
}
