import { FONTS } from '@/engine/fonts/catalogue';
import { PRESETS, useDocStore } from '@/store/documentStore';
import { useI18n } from '@/i18n';
import { ColorPicker, Section, Slider, Toggle } from '../ui';

const INK_COLORS = ['#16224f', '#1b1b1b', '#1f4e8c', '#2f6b46', '#8c2f2f', '#5b4a8a', '#7a5c3e'];

const HW_CSS: Record<string, string> = {
  patrick: 'HW Patrick',
  kalam: 'HW Kalam',
  indie: 'HW Indie',
  gochi: 'HW Gochi',
  architects: 'HW Architects',
  shadows: 'HW Shadows',
  caveat: 'HW Caveat',
  homemade: 'HW Homemade',
  dancing: 'HW Dancing',
  nothing: 'HW Nothing',
  cedarville: 'HW Cedarville',
  labelle: 'HW Labelle',
};

const SAMPLE = 'Hola, ¿qué tal?';

export function InkPanel() {
  const { t } = useI18n();
  const ink = useDocStore((s) => s.doc.ink);
  const imperfections = useDocStore((s) => s.doc.imperfections);
  const patchInk = useDocStore((s) => s.patchInk);
  const applyPreset = useDocStore((s) => s.applyPreset);

  const activePreset = (['neat', 'natural', 'messy'] as const).find((preset) =>
    Object.entries(PRESETS[preset]).every(
      ([key, value]) => Math.abs((imperfections[key as keyof typeof imperfections] as number) - value!) < 0.001,
    ),
  );

  return (
    <div className="space-y-6">
      <Section title={t('ink.presets')}>
        <div className="seg flex w-full">
          {(['neat', 'natural', 'messy'] as const).map((preset) => (
            <button
              key={preset}
              className="flex-1 justify-center"
              data-active={activePreset === preset}
              onClick={() => applyPreset(preset)}
              title={t(`ink.${preset}` as const)}
            >
              {t(`ink.${preset}` as const)}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('ink.font')}>
        <div className="grid grid-cols-2 gap-2">
          {FONTS.map((font) => {
            const active = ink.fontId === font.id;
            return (
              <button
                key={font.id}
                onClick={() => patchInk({ fontId: font.id })}
                className={`group rounded-xl border px-2.5 pb-1.5 pt-2 text-left transition-all ${
                  active
                    ? 'border-ink bg-panel-2 shadow-[0_6px_18px_-14px_rgba(40,28,12,0.8)]'
                    : 'border-line bg-panel hover:border-line-strong'
                }`}
                title={font.note}
              >
                <span
                  className="block truncate text-[1.28rem] leading-tight text-ink"
                  style={{ fontFamily: `${HW_CSS[font.id]}, serif` }}
                >
                  {SAMPLE}
                </span>
                <span className="mt-1 flex items-center justify-between gap-1">
                  <span className="truncate text-[0.63rem] uppercase tracking-wide text-muted">{font.name}</span>
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title={t('ink.size')}>
        <Slider
          label={t('ink.size')}
          value={ink.sizeMm}
          min={3.5}
          max={11}
          step={0.1}
          format={(v) => `${v.toFixed(1)} mm`}
          onChange={(sizeMm) => patchInk({ sizeMm })}
        />
        <Slider
          label={t('ink.opacity')}
          value={ink.opacity}
          min={0.4}
          max={1}
          onChange={(opacity) => patchInk({ opacity })}
        />
        <Slider
          label={t('ink.pressure')}
          value={ink.pressure}
          onChange={(pressure) => patchInk({ pressure })}
        />
      </Section>

      <Section title={t('ink.color')}>
        <ColorPicker colors={INK_COLORS} value={ink.color} onChange={(color) => patchInk({ color })} />
      </Section>

      <Section>
        <Toggle
          label={t('ink.bold')}
          checked={ink.bold}
          onChange={(bold) => patchInk({ bold })}
        />
      </Section>
    </div>
  );
}
