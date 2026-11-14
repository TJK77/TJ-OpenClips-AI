import { useMemo } from 'react';
import Icon from '../lib/icons';

function hashSeed(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
}

export function Thumb({
  hue = 262,
  hue2,
  seed = 'tj',
  ratio = '9 / 16',
  className = '',
  children,
  rounded = 'rounded-2xl',
  showGrid = true,
  person = true,
}) {
  const h2 = hue2 ?? (hue + 58) % 360;
  const s = hashSeed(seed);
  const personX = 34 + (s % 32);
  return (
    <div
      className={`relative overflow-hidden ${rounded} ${className}`}
      style={{
        aspectRatio: ratio,
        background: `radial-gradient(120% 95% at 18% 8%, hsl(${hue} 88% 52% / 0.55), transparent 58%),
          radial-gradient(105% 85% at 88% 96%, hsl(${h2} 92% 52% / 0.42), transparent 55%),
          linear-gradient(165deg, #0a1024 0%, #101736 55%, #070b18 100%)`,
      }}
    >
      {showGrid && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)',
            backgroundSize: '34px 34px',
            maskImage: 'radial-gradient(80% 70% at 50% 40%, #000 20%, transparent 100%)',
          }}
        />
      )}
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] thumb-noise" />

      {/* studio key light */}
      <div
        className="pointer-events-none absolute -left-6 top-6 h-24 w-24 rounded-full blur-2xl"
        style={{ background: `hsl(${hue} 95% 68% / 0.55)` }}
      />
      <div
        className="pointer-events-none absolute -right-8 bottom-10 h-28 w-28 rounded-full blur-2xl"
        style={{ background: `hsl(${h2} 95% 62% / 0.4)` }}
      />

      {person && (
        <svg viewBox="0 0 200 260" className="pointer-events-none absolute inset-x-0 bottom-0 h-[86%] w-full" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id={`p-${s}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="rgba(255,255,255,0.34)" />
              <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
            </linearGradient>
          </defs>
          <ellipse cx={personX + 66} cy="246" rx="92" ry="18" fill="rgba(0,0,0,0.35)" />
          <circle cx={personX + 66} cy="104" r="31" fill={`url(#p-${s})`} />
          <path
            d={`M${personX - 12} 260c0-46 34-78 78-78s78 32 78 78z`}
            fill={`url(#p-${s})`}
          />
          <path d={`M${personX + 42} 104a31 31 0 0 1 48 26`} stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" />
        </svg>
      )}

      {/* desk light bar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      {children}
    </div>
  );
}

export function PlayOverlay({ size = 46, label = 'Preview clip' }) {
  return (
    <span
      className="grid place-items-center rounded-full border border-white/25 bg-ink-950/45 text-white shadow-lg backdrop-blur-md transition group-hover:scale-105 group-hover:bg-violet-500/80"
      style={{ width: size, height: size }}
      aria-label={label}
    >
      <Icon name="play" size={size * 0.34} className="ml-0.5" />
    </span>
  );
}

export function ClipThumb({ clip, className = '', ratio = '9 / 16', children, showPlay = true }) {
  return (
    <Thumb hue={clip.hue} hue2={clip.hue2} seed={clip.id} ratio={ratio} className={className}>
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-1 p-2.5">
        <span className="rounded-md border border-white/15 bg-ink-950/60 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white backdrop-blur-md">
          {clip.start}
        </span>
        <span className="rounded-md border border-emerald-300/30 bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-200 backdrop-blur-md">
          {clip.score}
        </span>
      </div>
      {showPlay && (
        <div className="absolute inset-0 grid place-items-center">
          <PlayOverlay />
        </div>
      )}
      {children}
    </Thumb>
  );
}

export function Waveform({ bars = 72, progress = 0.38, height = 54, hue = 262, seed = 3, className = '' }) {
  const values = useMemo(
    () =>
      Array.from({ length: bars }, (_, i) => {
        const a = Math.abs(Math.sin(i * 1.73 + seed) * 0.55 + Math.sin(i * 0.41 + seed * 2.3) * 0.45);
        return 0.16 + Math.min(1, a) * 0.84;
      }),
    [bars, seed]
  );
  return (
    <div className={`flex items-center gap-[2px] ${className}`} style={{ height }} aria-hidden="true">
      {values.map((v, i) => {
        const past = i / bars <= progress;
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-colors"
            style={{
              height: `${Math.round(v * 100)}%`,
              background: past
                ? `linear-gradient(180deg, hsl(${hue} 95% 72%), #22D3EE)`
                : 'rgba(255,255,255,0.16)',
              opacity: past ? 0.95 : 0.75,
            }}
          />
        );
      })}
    </div>
  );
}

export function CaptionPreview({ style, text, compact = false, className = '' }) {
  const words = (text || 'your first three seconds decide everything').split(' ');
  const highlightIndex = Math.max(0, Math.min(words.length - 1, Math.floor(words.length * 0.45)));
  const size = compact ? Math.max(13, style.size * 0.62) : style.size;

  return (
    <div className={`pointer-events-none absolute inset-x-0 ${className}`} style={{ bottom: style.position === 'bottom' ? '9%' : '38%' }}>
      <div className="mx-auto flex max-w-[92%] flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 text-center">
        {words.map((w, i) => {
          const isHi = i === highlightIndex;
          return (
            <span
              key={`${w}-${i}`}
              className="inline-block rounded-md px-0.5 leading-[1.12]"
              style={{
                fontFamily: `'${style.font}', Inter, sans-serif`,
                fontWeight: style.weight,
                fontSize: size,
                letterSpacing: '-0.02em',
                textTransform: style.caps ? 'uppercase' : 'none',
                color: isHi ? style.highlight : style.color,
                background: style.box ? style.bg : 'transparent',
                padding: style.box ? '2px 6px' : undefined,
                textShadow: style.stroke ? '0 2px 10px rgba(0,0,0,0.85), 0 1px 0 rgba(0,0,0,0.9)' : '0 1px 8px rgba(0,0,0,0.55)',
                WebkitTextStroke: style.stroke ? '0.4px rgba(0,0,0,0.35)' : undefined,
                ...(style.gradient
                  ? {
                      backgroundImage: 'linear-gradient(95deg,#FFFFFF,#C4B5FD 45%,#67E8F9)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      color: 'transparent',
                      filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                    }
                  : {}),
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function MiniFrame({ hue = 262, hue2, label, className = '' }) {
  return (
    <Thumb hue={hue} hue2={hue2} ratio="9 / 16" rounded="rounded-xl" className={className} showGrid={false}>
      {label && (
        <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-[9px] font-semibold text-white/90">
          {label}
        </span>
      )}
    </Thumb>
  );
}
