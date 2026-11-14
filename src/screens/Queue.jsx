import { useMemo, useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, EmptyState, InfoNote, Modal, SectionHead, Segmented } from '../components/ui';
import { Thumb } from '../components/Thumb';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'draft', label: 'Drafts' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];

const STATUS = {
  scheduled: { tone: 'violet', label: 'Scheduled' },
  draft: { tone: 'slate', label: 'Draft' },
  published: { tone: 'mint', label: 'Published' },
  failed: { tone: 'rose', label: 'Failed' },
};

export default function Queue() {
  const { posts, buffer, clips, updatePost, removePost, navigate, toast } = useStore();
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [draftDate, setDraftDate] = useState('');
  const [draftTime, setDraftTime] = useState('');

  const list = useMemo(() => {
    const sorted = [...posts].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
    return filter === 'all' ? sorted : sorted.filter((p) => p.status === filter);
  }, [posts, filter]);

  const counts = useMemo(() => posts.reduce((acc, p) => ({ ...acc, [p.status]: (acc[p.status] || 0) + 1 }), {}), [posts]);

  const openEdit = (post) => {
    setEditing(post);
    setDraftDate(post.date);
    setDraftTime(post.time);
  };

  return (
    <div className="space-y-4">
      <SectionHead
        eyebrow="Step 14 · Buffer queue"
        title="Publishing queue"
        sub="Everything handed to Buffer, with its delivery state."
        action={
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/composer')}>
            <Icon name="plus" size={13} /> Compose
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {['scheduled', 'draft', 'published', 'failed'].map((s) => (
          <div key={s} className="card p-2.5">
            <div className="text-[15px] font-bold">{counts[s] || 0}</div>
            <div className="text-[9.5px] uppercase tracking-wide text-white/40">{STATUS[s].label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Segmented value={filter} onChange={setFilter} options={FILTERS} />
        <span className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-white/35">
          <BrandIcon name="buffer" size={11} /> {buffer.connected ? buffer.workspace : 'Buffer not connected'}
        </span>
      </div>

      {list.length ? (
        <div className="space-y-2">
          {list.map((p) => {
            const clip = clips.find((c) => c.id === p.clipId);
            return (
              <article key={p.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-start gap-3 p-2.5">
                  <div className="w-[54px] shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Thumb hue={p.hue} hue2={p.hue2} seed={p.title} ratio="9 / 16" rounded="rounded-none" showMeta={false} showGrid={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-[12px] font-bold">{p.title}</h3>
                      <Badge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</Badge>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-white/40">{p.caption}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9.5px] text-white/45">
                      <span className="flex items-center gap-1"><Icon name="calendar" size={9} /> {p.date}</span>
                      <span className="flex items-center gap-1"><Icon name="clock" size={9} /> {p.time}</span>
                      {p.queueId && <span className="font-mono text-white/30">{p.queueId}</span>}
                      <span className="flex items-center gap-1">{p.channels.map((c) => <BrandIcon key={c} name={c} size={10} />)}</span>
                      {clip && <span>{clip.duration}s</span>}
                    </div>
                    {p.status === 'failed' && p.error && (
                      <p className="mt-1.5 rounded-lg border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[9.5px] text-rose-200">{p.error}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 border-t border-white/6 px-2.5 py-2">
                  {p.status === 'draft' && (
                    <button className="btn btn-primary btn-sm" onClick={() => { updatePost(p.id, { status: 'scheduled', queueId: p.queueId || `BQ-${Math.floor(1000 + Math.random() * 8999)}` }); toast('Added to Buffer queue.', 'success'); }}>
                      <Icon name="send" size={11} /> Add to Buffer
                    </button>
                  )}
                  {p.status === 'failed' && (
                    <button className="btn btn-danger btn-sm" onClick={() => { updatePost(p.id, { status: 'scheduled', error: null }); toast('Retry sent to Buffer.', 'info'); }}>
                      <Icon name="refresh" size={11} /> Retry
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(p)}><Icon name="edit" size={11} /> Reschedule</button>
                  {p.status === 'scheduled' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { updatePost(p.id, { status: 'draft' }); toast('Moved back to draft.', 'info'); }}>Move to draft</button>
                  )}
                  <button className="btn btn-ghost btn-sm ml-auto text-rose-300" onClick={() => { removePost(p.id); toast('Removed from queue.', 'info'); }}>
                    <Icon name="trash" size={11} /> Remove
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon="clock" title="Nothing in this state" body="Try another filter or schedule a new post." action={<button className="btn btn-secondary btn-sm" onClick={() => setFilter('all')}>Show everything</button>} />
      )}

      <InfoNote tone="violet" icon="info">
        Scheduled items are held by Buffer until their time slot. They are not published yet, and can be edited or removed here first.
      </InfoNote>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Reschedule post"
        subtitle={editing?.title}
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Cancel</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                updatePost(editing.id, { date: draftDate, time: draftTime, status: editing.status === 'failed' ? 'scheduled' : editing.status });
                setEditing(null);
                toast('Schedule updated in Buffer.', 'success');
              }}
            >
              Save new time
            </button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="label">Date</span>
            <input type="date" className="input" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Time</span>
            <input type="time" className="input" value={draftTime} onChange={(e) => setDraftTime(e.target.value)} />
          </label>
        </div>
      </Modal>
    </div>
  );
}
