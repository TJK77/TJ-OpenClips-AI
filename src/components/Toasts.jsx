import Icon from '../lib/icons';
import { useStore } from '../lib/store';

const TONES = {
  default: 'border-white/12 bg-ink-800/95 text-white',
  success: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-50',
  error: 'border-rose-400/30 bg-rose-500/15 text-rose-50',
  info: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-50',
};
const ICONS = { default: 'info', success: 'check', error: 'alert', info: 'info' };
const ICON_TONE = { default: 'text-violet-300', success: 'text-emerald-300', error: 'text-rose-300', info: 'text-cyan-300' };

export default function Toasts() {
  const { toasts, dismissToast } = useStore();
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[120] flex flex-col items-center gap-2 px-3 sm:left-auto sm:right-4 sm:top-4 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-panel backdrop-blur-xl animate-pop ${TONES[t.tone] || TONES.default}`}
        >
          <span className={`mt-0.5 shrink-0 ${ICON_TONE[t.tone] || ICON_TONE.default}`}>
            <Icon name={ICONS[t.tone] || ICONS.default} size={16} />
          </span>
          <p className="min-w-0 flex-1 text-[12.5px] font-medium leading-relaxed">{t.message}</p>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="shrink-0 text-white/40 hover:text-white">
            <Icon name="x" size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
