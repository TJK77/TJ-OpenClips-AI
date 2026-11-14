import { useMemo, useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, EmptyState, SectionHead, Segmented } from '../components/ui';
import { addDays, isoDate, pad } from '../lib/data';

const STATUS = {
  scheduled: { label: 'Scheduled', tone: 'violet', dot: 'bg-violet-400', ring: 'border-violet-400/40 bg-violet-500/12 text-violet-100' },
  draft: { label: 'Draft', tone: 'slate', dot: 'bg-white/40', ring: 'border-white/15 bg-white/[0.05] text-white/70' },
  published: { label: 'Published', tone: 'mint', dot: 'bg-emerald-400', ring: 'border-emerald-400/40 bg-emerald-500/12 text-emerald-100' },
  failed: { label: 'Failed', tone: 'rose', dot: 'bg-rose-400', ring: 'border-rose-400/40 bg-rose-500/12 text-rose-100' },
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function Calendar() {
  const { posts, buffer, navigate, toast, updatePost } = useStore();
  const today = new Date();
  const [mode, setMode] = useState('month');
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(isoDate(today));

  const byDate = useMemo(() => {
    const map = {};
    posts.forEach((p) => {
      map[p.date] = map[p.date] || [];
      map[p.date].push(p);
    });
    return map;
  }, [posts]);

  const counts = useMemo(() => {
    const c = { scheduled: 0, draft: 0, published: 0, failed: 0 };
    posts.forEach((p) => { c[p.status] = (c[p.status] || 0) + 1; });
    return c;
  }, [posts]);

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i += 1) cells.push(null);
    for (let d = 1; d <= days; d += 1) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const weekDays = useMemo(() => {
    const base = new Date(selected + 'T12:00:00');
    const start = new Date(base);
    start.setDate(base.getDate() - base.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [selected]);

  const selectedPosts = byDate[selected] || [];
  const channelOf = (id) => buffer.channels.find((c) => c.id === id);

  const shift = (dir) => {
    if (mode === 'month') {
      setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    } else {
      setSelected(addDays(dir * 7, new Date(selected + 'T12:00:00')));
    }
  };

  return (
    <div className="space-y-4">
      <SectionHead
        eyebrow="Step 12 · Scheduling"
        title="Publishing calendar"
        sub="Everything scheduled, drafted, published or failed — in one timeline."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/composer')}>
            <Icon name="plus" size={13} /> New post
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Object.entries(STATUS).map(([key, meta]) => (
          <div key={key} className="card flex items-center gap-2 p-2.5">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <div className="min-w-0">
              <div className="text-[15px] font-bold leading-none">{counts[key] || 0}</div>
              <div className="truncate text-[9.5px] uppercase tracking-wide text-white/40">{meta.label}</div>
            </div>
          </div>
        ))}
      </div>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/8 px-3 py-2.5">
          <div className="flex items-center gap-1">
            <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous"><Icon name="chevron-left" size={15} /></button>
            <button className="icon-btn" onClick={() => shift(1)} aria-label="Next"><Icon name="chevron-right" size={15} /></button>
          </div>
          <h2 className="font-display text-[13.5px] font-bold">
            {mode === 'month' ? `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}` : `Week of ${MONTHS[new Date(selected + 'T12:00:00').getMonth()]} ${new Date(selected + 'T12:00:00').getDate()}`}
          </h2>
          <button className="btn btn-ghost btn-sm ml-auto" onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(isoDate(today)); }}>
            Today
          </button>
          <Segmented value={mode} onChange={setMode} options={[{ value: 'month', label: 'Month' }, { value: 'week', label: 'Week' }]} />
        </div>

        {mode === 'month' ? (
          <div className="p-2 sm:p-3">
            <div className="mb-1 grid grid-cols-7 gap-1">
              {DOW.map((d, i) => <div key={i} className="py-1 text-center text-[9px] font-bold uppercase tracking-wider text-white/30">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthCells.map((cell, i) => {
                if (!cell) return <div key={i} className="min-h-[62px] rounded-lg bg-white/[0.01]" />;
                const key = isoDate(cell);
                const list = byDate[key] || [];
                const isToday = key === isoDate(today);
                const isSel = key === selected;
                return (
                  <button
                    key={i}
                    onClick={() => setSelected(key)}
                    className={`relative min-h-[62px] rounded-lg border p-1 text-left transition ${
                      isSel ? 'border-violet-400/60 bg-violet-500/10' : 'border-white/6 bg-white/[0.02] hover:border-white/20'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${isToday ? 'grid h-4 w-4 place-items-center rounded-full bg-violet-500 text-white' : 'text-white/55'}`}>
                      {cell.getDate()}
                    </span>
                    <div className="mt-0.5 space-y-0.5">
                      {list.slice(0, 2).map((p) => (
                        <span key={p.id} className={`block truncate rounded px-1 text-[7.5px] font-semibold leading-[11px] ${STATUS[p.status].ring}`}>
                          {p.time} {p.title}
                        </span>
                      ))}
                      {list.length > 2 && <span className="block pl-1 text-[7.5px] font-bold text-white/40">+{list.length - 2} more</span>}
                    </div>
                    {list.length > 0 && (
                      <span className="absolute right-1 top-1 flex gap-0.5">
                        {[...new Set(list.map((p) => p.status))].slice(0, 3).map((s) => (
                          <span key={s} className={`h-1 w-1 rounded-full ${STATUS[s].dot}`} />
                        ))}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto scroll-thin">
            <div className="grid min-w-[680px] grid-cols-7 divide-x divide-white/6">
              {weekDays.map((d) => {
                const key = isoDate(d);
                const list = byDate[key] || [];
                const isToday = key === isoDate(today);
                return (
                  <div key={key} className={`min-h-[260px] p-1.5 ${isToday ? 'bg-violet-500/[0.06]' : ''}`}>
                    <div className="mb-1.5 flex items-center gap-1">
                      <span className="text-[8.5px] font-bold uppercase text-white/30">{DOW[d.getDay()]}</span>
                      <span className={`text-[11px] font-bold ${isToday ? 'text-violet-300' : 'text-white/70'}`}>{d.getDate()}</span>
                    </div>
                    <div className="space-y-1">
                      {list.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setSelected(key)}
                          className={`w-full rounded-lg border p-1.5 text-left ${STATUS[p.status].ring}`}
                        >
                          <div className="truncate text-[9px] font-bold leading-tight">{p.title}</div>
                          <div className="mt-0.5 flex items-center gap-1 text-[8px] opacity-70">
                            <Icon name="clock" size={7} /> {p.time}
                          </div>
                        </button>
                      ))}
                      {!list.length && <p className="px-1 text-[8.5px] text-white/20">No posts</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-white/8 px-3 py-2">
          {Object.entries(STATUS).map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1 text-[9px] text-white/45">
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} /> {meta.label}
            </span>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[9px] text-white/35">
            <BrandIcon name="buffer" size={10} /> Synced with Buffer
          </span>
        </div>
      </section>

      {/* Selected day */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-[13.5px] font-bold">
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
          <Badge tone="slate">{selectedPosts.length} post{selectedPosts.length === 1 ? '' : 's'}</Badge>
        </div>

        {selectedPosts.length ? (
          <div className="space-y-2">
            {selectedPosts.map((p) => (
              <div key={p.id} className="card flex flex-wrap items-center gap-3 p-2.5">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-white/10" style={{ background: `linear-gradient(135deg, hsl(${p.hue} 70% 30%), hsl(${p.hue2 ?? 190} 70% 25%))` }}>
                  <Icon name="play" size={14} className="text-white/80" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12px] font-bold">{p.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[9.5px] text-white/45">
                    <span className="flex items-center gap-1"><Icon name="clock" size={9} /> {p.time}</span>
                    {p.queueId && <span className="font-mono text-white/30">{p.queueId}</span>}
                    <span className="flex items-center gap-1">
                      {p.channels.map((c) => <BrandIcon key={c} name={c} size={10} />)}
                    </span>
                  </div>
                </div>
                <span className={`badge badge-${STATUS[p.status].tone}`}>{STATUS[p.status].label}</span>
                {p.status === 'draft' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => { updatePost(p.id, { status: 'scheduled', queueId: `BQ-${Math.floor(1000 + Math.random() * 8999)}` }); toast('Draft added to Buffer queue.', 'success'); }}>
                    <Icon name="send" size={12} /> Queue
                  </button>
                )}
                {p.status === 'failed' && (
                  <button className="btn btn-danger btn-sm" onClick={() => { updatePost(p.id, { status: 'scheduled', error: null }); toast('Retry submitted to Buffer.', 'info'); }}>
                    <Icon name="refresh" size={12} /> Retry
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="calendar"
            title="Nothing scheduled this day"
            sub="Pick another date or compose a new post from your generated clips."
            action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/composer')}><Icon name="plus" size={13} /> Compose post</button>}
          />
        )}
      </section>
    </div>
  );
}
