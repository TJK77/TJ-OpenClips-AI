import { useMemo, useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, EmptyState, Modal, ScoreRing, SectionHead, Segmented } from '../components/ui';
import { ClipThumb, CaptionPreview, Thumb } from '../components/Thumb';

const FILTERS = [
  { value: 'all', label: 'All clips' },
  { value: 'best', label: 'Best moments' },
  { value: 'score', label: 'Highest scores' },
  { value: 'short', label: 'Short clips' },
  { value: 'long', label: 'Long clips' },
];

function seconds(d = '0:42') {
  if (typeof d === 'number') return d;
  const parts = String(d).split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + (parts[1] || 0);
}

export default function Clips() {
  const { clips, selectedClips, toggleClip, setSelectedClips, clearClips, caption, navigate, toast } = useStore();
  const [filter, setFilter] = useState('all');
  const [preview, setPreview] = useState(null);

  const visible = useMemo(() => {
    const list = [...clips];
    if (filter === 'best') return list.filter((c) => c.score >= 88).sort((a, b) => b.score - a.score);
    if (filter === 'score') return list.sort((a, b) => b.score - a.score);
    if (filter === 'short') return list.filter((c) => seconds(c.duration) < 40).sort((a, b) => seconds(a.duration) - seconds(b.duration));
    if (filter === 'long') return list.filter((c) => seconds(c.duration) >= 40).sort((a, b) => seconds(b.duration) - seconds(a.duration));
    return list;
  }, [clips, filter]);

  const allSelected = visible.length > 0 && visible.every((c) => selectedClips.includes(c.id));
  const style = {
    ...caption,
    bg: caption.background,
    box: caption.position === 'boxed',
    gradient: caption.styleId === 'gradient-pop',
    caps: ['bold-viral', 'karaoke', 'tiktok', 'animated-pop', 'yellow-keyword'].includes(caption.styleId),
  };

  const download = (clip) => {
    if (!clip.rendered) {
      toast('This clip is still rendering on the server — try again once it is ready.', 'info');
      return;
    }
    window.open(clip.downloadUrl || `/api/clips/${clip.id}/file?download=1`, '_blank', 'noopener');
    toast(`Downloading “${clip.title}” — ${clip.width || 1080}×${clip.height || 1920} MP4.`, 'success');
  };

  return (
    <div className="space-y-4 pb-2">
      <SectionHead
        eyebrow="Step 04 · Generated clips"
        title="Generated clips"
        sub="Every candidate is scored for viral potential. Pick the ones worth posting."
        action={
          <div className="flex items-center gap-2">
            <Badge tone="violet">{clips.length} clips</Badge>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/analyze')}>
              <Icon name="refresh" size={13} /> Re-analyse
            </button>
          </div>
        }
      />

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-3.5 flex gap-1.5 overflow-x-auto px-3.5 pb-1 no-scrollbar sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition ${
                filter === f.value
                  ? 'border-violet-400/40 bg-violet-500/20 text-white'
                  : 'border-white/10 bg-white/[0.03] text-muted hover:text-white'
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[10px] opacity-60">
                {f.value === 'all' ? clips.length
                  : f.value === 'best' ? clips.filter((c) => c.score >= 88).length
                    : f.value === 'short' ? clips.filter((c) => seconds(c.duration) < 40).length
                      : f.value === 'long' ? clips.filter((c) => seconds(c.duration) >= 40).length
                        : clips.length}
              </span>
            </button>
          ))}
        </div>
        <button
          className="btn btn-secondary btn-sm shrink-0 self-start sm:self-auto"
          onClick={() => (allSelected ? clearClips() : setSelectedClips(visible.map((c) => c.id)))}
        >
          <Icon name={allSelected ? 'x' : 'check'} size={13} />
          {allSelected ? 'Clear selection' : 'Select all'}
        </button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon="film"
          title="No clips match this filter"
          body="Try another filter or re-analyse the source video to generate more candidates."
          action={<button className="btn btn-primary btn-sm" onClick={() => setFilter('all')}>Show all clips</button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 xl:grid-cols-4">
          {visible.map((clip) => {
            const selected = selectedClips.includes(clip.id);
            return (
              <article
                key={clip.id}
                className={`card group relative overflow-hidden transition ${selected ? 'ring-2 ring-violet-400/70' : 'hover:border-white/20'}`}
              >
                <div className="relative">
                  <button className="block w-full" onClick={() => setPreview(clip)} aria-label={`Preview ${clip.title}`}>
                    <ClipThumb clip={clip} ratio="9 / 16" showPlay />
                  </button>
                  <button
                    onClick={() => toggleClip(clip.id)}
                    aria-label={selected ? 'Deselect clip' : 'Select clip'}
                    aria-pressed={selected}
                    className={`absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md border backdrop-blur-md transition ${
                      selected ? 'border-violet-300 bg-violet-500 text-white' : 'border-white/30 bg-ink-950/50 text-transparent hover:border-white/60'
                    }`}
                  >
                    <Icon name="check" size={13} strokeWidth={3} />
                  </button>
                  <span className="absolute bottom-2 right-2 rounded-md border border-white/15 bg-ink-950/70 px-1.5 py-0.5 text-[9.5px] font-bold backdrop-blur-md">
                    {clip.duration}
                  </span>
                  {clip.score >= 90 && (
                    <span className="absolute bottom-2 left-2 rounded-md bg-gradient-to-r from-violet-500 to-cyan-400 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-ink-950">
                      Top pick
                    </span>
                  )}
                </div>

                <div className="p-2.5">
                  <h3 className="line-clamp-2 text-[11.5px] font-semibold leading-snug sm:text-[12.5px]">{clip.title}</h3>
                  <div className="mt-1 flex items-center gap-1.5 text-[9.5px] text-white/40">
                    <span className="font-mono">{clip.start}–{clip.end}</span>
                    <span>·</span>
                    <span className="truncate">{clip.speaker}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1">
                    <button className="icon-btn h-7 w-7 flex-1 justify-center rounded-lg border border-white/8" onClick={() => setPreview(clip)} aria-label="Preview">
                      <Icon name="play" size={12} />
                    </button>
                    <button className="icon-btn h-7 w-7 flex-1 justify-center rounded-lg border border-white/8" onClick={() => navigate('/editor')} aria-label="Edit clip">
                      <Icon name="edit" size={12} />
                    </button>
                    <button className="icon-btn h-7 w-7 flex-1 justify-center rounded-lg border border-white/8" onClick={() => download(clip)} aria-label="Download clip">
                      <Icon name="download" size={12} />
                    </button>
                    <span className="ml-auto flex items-center gap-1 pl-1">
                      <ScoreRing score={clip.score} size={26} label={false} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Selection action bar */}
      {selectedClips.length > 0 && (
        <div className="sticky bottom-[76px] z-20 lg:bottom-4">
          <div className="glass flex items-center gap-2.5 rounded-2xl border border-violet-400/25 p-2.5 shadow-panel">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-violet-500/20 text-violet-200">
              <Icon name="check" size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] font-bold">{selectedClips.length} clip{selectedClips.length > 1 ? 's' : ''} selected</div>
              <div className="truncate text-[10px] text-white/50">Ready for captions and scheduling</div>
            </div>
            <button className="btn btn-ghost btn-sm hidden sm:inline-flex" onClick={clearClips}>Clear</button>
            <button className="btn btn-primary btn-sm shrink-0" onClick={() => navigate('/composer')}>
              Continue <Icon name="arrow-right" size={13} />
            </button>
          </div>
        </div>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title}
        subtitle={preview ? `${preview.duration} · ${preview.start}–${preview.end} · ${preview.speaker}` : ''}
        size="lg"
        footer={
          preview && (
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn btn-ghost btn-sm" onClick={() => { toggleClip(preview.id); setPreview(null); }}>
                <Icon name="check" size={13} /> {selectedClips.includes(preview.id) ? 'Deselect' : 'Select clip'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => navigate('/editor')}>
                <Icon name="edit" size={13} /> Open editor
              </button>
              <button className="btn btn-primary btn-sm ml-auto" onClick={() => { navigate('/composer'); }}>
                <Icon name="send" size={13} /> Schedule
              </button>
            </div>
          )
        }
      >
        {preview && (
          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="relative mx-auto w-[180px] shrink-0 overflow-hidden rounded-2xl border border-white/10">
              <Thumb hue={preview.hue} hue2={preview.hue2} seed={preview.id} ratio="9 / 16" rounded="rounded-2xl" showGrid />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
              <div className="absolute inset-x-0 bottom-[26%] px-3">
                <CaptionPreview text={preview.caption || preview.title} style={style} />
              </div>
              <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-2.5">
                <span className="text-[9px] font-bold text-white/70">{preview.start}</span>
                <span className="rounded bg-emerald-400/20 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-200">{preview.score} score</span>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone="violet">{preview.tag}</Badge>
                <Badge tone="mint">{preview.duration}</Badge>
                <Badge tone="cyan">{preview.speaker}</Badge>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">Suggested caption</div>
                <p className="mt-1 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-[12px] leading-relaxed text-white/80">
                  {preview.caption || preview.title}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['Hook strength', preview.score],
                  ['Retention', Math.min(99, preview.score + 3)],
                  ['Shareability', Math.max(60, preview.score - 7)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/8 bg-white/[0.02] p-2">
                    <div className="text-[9px] uppercase tracking-wide text-white/35">{label}</div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <span className="font-display text-[15px] font-extrabold">{value}</span>
                      <span className="text-[9px] text-white/30">/100</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-white/40">
                <Icon name="captions" size={12} /> Captions: {caption.styleId.replace(/-/g, ' ')} · {caption.timing} timing
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
