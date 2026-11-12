import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Section({
  title,
  children,
  right,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`space-y-3 ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between gap-3">
          {title && <h3 className="text-[0.72rem] font-semibold tracking-[0.12em] uppercase text-muted">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  format,
  disabled,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2 mb-1.5">
        <span className="text-[0.78rem] text-ink-soft">{label}</span>
        <span className="text-[0.7rem] tabular-nums text-muted">{format ? format(value) : Math.round(value * 100) + '%'}</span>
      </span>
      <input
        type="range"
        className="range"
        style={{ ['--pct' as string]: `${pct}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
    </label>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-panel-2/60 px-3 py-2.5 text-left transition-colors hover:bg-panel-2"
    >
      <span>
        <span className="block text-[0.8rem] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-[0.7rem] text-muted">{description}</span>}
      </span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink' : 'bg-line-strong'}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-panel shadow transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  full,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className={`seg ${full ? 'flex w-full' : ''}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          data-active={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={full ? 'flex-1 justify-center' : undefined}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function ColorPicker({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ background: color }}
          data-active={value.toLowerCase() === color.toLowerCase()}
          onClick={() => onChange(color)}
          aria-label={color}
        />
      ))}
      <label className="relative inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full border-2 border-panel shadow-[0_0_0_1px_var(--color-line-strong)]">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(#e46b6b, #e4c06b, #7bc47f, #6bb4e4, #a07be4, #e46bb4, #e46b6b)`,
          }}
        />
        <span className="absolute inset-[3px] rounded-full bg-panel" />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="custom color"
        />
      </label>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#221a11]/35 backdrop-blur-[3px]" onClick={onClose} />
      <div className="animate-fadeup relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_30px_80px_-20px_rgba(40,28,12,0.55)]">
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-2xl leading-none text-ink">{title}</h2>
            {subtitle && <p className="mt-1.5 text-[0.78rem] text-muted">{subtitle}</p>}
          </div>
          <button className="btn btn-ghost !p-2" onClick={onClose} aria-label="close">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-line bg-panel-2/50 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
