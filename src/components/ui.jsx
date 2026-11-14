import { useEffect, useMemo } from 'react';
import Icon, { BrandIcon } from '../lib/icons';

export function Logo({ size = 36, withText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative grid shrink-0 place-items-center rounded-[13px] shadow-glow"
        style={{ width: size, height: size, background: 'linear-gradient(140deg,#A78BFA,#7C5CFF 52%,#22D3EE)' }}
      >
        <span className="font-display font-extrabold text-ink-950" style={{ fontSize: size * 0.4, letterSpacing: '-0.04em' }}>
          TJ
        </span>
        <span className="absolute inset-0 rounded-[13px] ring-1 ring-inset ring-white/40" />
      </div>
      {withText && (
        <div className="leading-none">
          <div className="font-display font-extrabold tracking-tight" style={{ fontSize: size * 0.4 }}>
            TJ OpenClips
          </div>
          <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.26em] text-violet-300/80">AI Studio</div>
        </div>
      )}
    </div>
  );
}

export function SectionHead({ eyebrow, title, sub, action, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-violet-300/90">
            <span className="h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
            {eyebrow}
          </div>
        )}
        <h1 className="font-display text-[24px] font-extrabold leading-tight sm:text-[30px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted sm:text-sm">{sub}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function Field({ label, hint, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label className="label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

export function TextInput({ icon, className = '', ...props }) {
  if (!icon) return <input className={`input ${className}`} {...props} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
        <Icon name={icon} size={16} />
      </span>
      <input className={`input pl-10 ${className}`} {...props} />
    </div>
  );
}

export function Select({ children, className = '', ...props }) {
  return (
    <select className={`input ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`switch ${checked ? 'on' : ''}`}
    />
  );
}

export function Badge({ children, tone = 'slate', className = '', icon }) {
  return (
    <span className={`badge badge-${tone} ${className}`}>
      {icon && <Icon name={icon} size={11} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

export function ScoreRing({ score, size = 46, label = true }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const tone = score >= 90 ? '#34D399' : score >= 80 ? '#A78BFA' : '#FBBF24';
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * c} ${c}`}
          style={{ filter: `drop-shadow(0 0 5px ${tone}80)` }}
        />
      </svg>
      <span className="absolute font-display text-[11px] font-extrabold" style={{ color: tone }}>
        {label ? score : ''}
      </span>
    </div>
  );
}

export function Progress({ value, className = '', showLabel = false }) {
  return (
    <div className={className}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      {showLabel && <div className="mt-1.5 text-right text-[11px] font-semibold text-muted">{Math.round(value)}%</div>}
    </div>
  );
}

export function Sparkline({ data, hue = 262, height = 34, className = '' }) {
  const path = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const span = max - min || 1;
    return data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - 4 - ((v - min) / span) * (height - 10);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }, [data, height]);
  const id = `spark-${hue}`;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={`hsl(${hue} 90% 68%)`} />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke={`url(#${id})`} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function StatCard({ icon, label, value, delta, tone = 'violet', spark, onClick }) {
  const hues = { violet: 262, cyan: 190, mint: 152, amber: 40, rose: 350 };
  const toneCls = { violet: 'text-violet-300', cyan: 'text-cyan-300', mint: 'text-emerald-300', amber: 'text-amber-300', rose: 'text-rose-300' };
  return (
    <button
      type="button"
      onClick={onClick}
      className="card card-hover w-full p-4 text-left sm:p-5"
      aria-label={label}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.05] ${toneCls[tone]}`}>
          <Icon name={icon} size={17} />
        </span>
        {delta && (
          <span className={`text-[11px] font-bold ${delta.startsWith('-') ? 'text-rose-300' : 'text-emerald-300'}`}>{delta}</span>
        )}
      </div>
      <div className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight">{value}</div>
      <div className="mt-1 text-[11.5px] font-medium text-muted">{label}</div>
      {spark && <Sparkline data={spark} hue={hues[tone]} height={26} className="mt-3 opacity-80" />}
    </button>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button aria-label="Close dialog" className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[92dvh] w-full ${widths[size]} animate-pop overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900/95 p-5 shadow-panel backdrop-blur-2xl scroll-thin sm:rounded-3xl sm:p-6`}
        style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20 sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold">{title}</h3>
            {subtitle && <p className="mt-1 text-[12.5px] text-muted">{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
            value === opt.value ? 'bg-white/12 text-white shadow-sm' : 'text-muted hover:text-white'
          }`}
        >
          {opt.icon && <Icon name={opt.icon} size={13} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={`no-scrollbar flex gap-1 overflow-x-auto border-b border-white/8 ${className}`}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`tab-underline relative whitespace-nowrap px-3 py-3 text-[12.5px] font-semibold transition ${
            value === t.value ? 'active text-white' : 'text-muted hover:text-white'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon = 'film', title, body, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-violet-300">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-[13px] text-muted">{body}</p>
      {action}
    </div>
  );
}

export function Avatar({ initials = 'TJ', size = 34, hue = 262 }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-display font-bold text-white ring-1 ring-inset ring-white/25"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, hsl(${hue} 85% 62%), hsl(${(hue + 60) % 360} 85% 55%))`,
      }}
    >
      {initials}
    </span>
  );
}

export function PlatformPill({ id, size = 26 }) {
  const map = {
    instagram: '#E1306C',
    tiktok: '#22D3EE',
    youtube: '#FF0033',
    linkedin: '#0A66C2',
    x: '#E7E9F5',
    facebook: '#1877F2',
    threads: '#E7E9F5',
    pinterest: '#E60023',
  };
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg border border-white/10"
      style={{ width: size, height: size, background: `${map[id] || '#7C5CFF'}1F`, color: map[id] || '#A78BFA' }}
    >
      <BrandIcon name={id} size={size * 0.56} />
    </span>
  );
}

export function CopyChip({ value, label = 'Copy', onCopied }) {
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          /* clipboard may be blocked */
        }
        onCopied?.();
      }}
    >
      <Icon name="copy" size={13} />
      {label}
    </button>
  );
}

export function InfoNote({ children, tone = 'violet', icon = 'info' }) {
  const tones = {
    violet: 'border-violet-500/25 bg-violet-500/[0.08] text-violet-100',
    cyan: 'border-cyan-400/25 bg-cyan-400/[0.07] text-cyan-50',
    amber: 'border-amber-400/25 bg-amber-400/[0.07] text-amber-50',
    mint: 'border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-50',
  };
  const iconTone = { violet: 'text-violet-300', cyan: 'text-cyan-300', amber: 'text-amber-300', mint: 'text-emerald-300' };
  return (
    <div className={`flex gap-2.5 rounded-xl border p-3 text-[12px] leading-relaxed ${tones[tone]}`}>
      <span className={`mt-0.5 shrink-0 ${iconTone[tone]}`}>
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ToastHost() {
  return null;
}
