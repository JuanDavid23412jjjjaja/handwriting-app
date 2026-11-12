import { Dices } from 'lucide-react';
import { useDocStore } from '@/store/documentStore';
import { useI18n } from '@/i18n';
import { Section, Slider } from '../ui';

export function RealismPanel() {
  const { t } = useI18n();
  const imp = useDocStore((s) => s.doc.imperfections);
  const patch = useDocStore((s) => s.patchImperfections);
  const reroll = useDocStore((s) => s.reroll);

  const sliders: Array<[keyof typeof imp, string]> = [
    ['letterRotation', t('realism.rotation')],
    ['letterSize', t('realism.size')],
    ['baselineJitter', t('realism.baseline')],
    ['lineDrift', t('realism.drift')],
    ['lineSlant', t('realism.slant')],
    ['wordSpacing', t('realism.wordSpacing')],
    ['letterSpacing', t('realism.letterSpacing')],
    ['inkVariation', t('realism.ink')],
    ['marginWobble', t('realism.margin')],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl leading-none text-ink">{t('realism.title')}</h3>
          <p className="mt-1 text-[0.72rem] text-muted">{t('realism.subtitle')}</p>
        </div>
        <button className="btn shrink-0" onClick={reroll}>
          <Dices size={14} />
          {t('realism.reroll')}
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-line-strong bg-panel-2/60 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[0.68rem] uppercase tracking-[0.12em] text-muted">{t('realism.seed')}</span>
          <span className="font-mono text-[0.78rem] tabular-nums text-ink">{imp.seed}</span>
        </div>
      </div>

      <Section>
        <div className="space-y-3.5">
          {sliders.map(([key, label]) => (
            <Slider
              key={key}
              label={label}
              value={imp[key] as number}
              onChange={(v) => patch({ [key]: v })}
            />
          ))}
        </div>
      </Section>

      <p className="rounded-xl bg-sea-soft/60 px-3 py-2.5 text-[0.7rem] leading-relaxed text-sea">{t('realism.hint')}</p>
    </div>
  );
}
