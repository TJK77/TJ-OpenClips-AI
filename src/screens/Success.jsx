import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, InfoNote, SectionHead } from '../components/ui';
import { ClipThumb } from '../components/Thumb';

export default function Success() {
  const { posts, lastPostId, clips, buffer, navigate, toast } = useStore();
  const post = posts.find((p) => p.id === lastPostId) || posts[0];
  const clip = clips.find((c) => c.id === post?.clipId) || clips[0];
  const channels = (post?.channels || []).map((id) => buffer.channels.find((c) => c.id === id)).filter(Boolean);
  const scheduled = post?.status === 'scheduled';
  const dateLabel = post?.date
    ? new Date(`${post.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <SectionHead eyebrow="Step 13 · Confirmation" title="Publishing confirmation" sub="Everything below reflects the Buffer queue, not a delivered post." />

      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B1226] via-[#0A0F20] to-[#06101C] p-5 text-center sm:p-7">
        <div className="pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />

        <div className="relative mx-auto grid h-16 w-16 place-items-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-300 shadow-glow">
          <Icon name="check" size={30} strokeWidth={3} />
        </div>

        <h1 className="relative mt-3 font-display text-[21px] font-extrabold leading-tight sm:text-2xl">
          Your content has been added to Buffer.
        </h1>
        <p className="relative mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-muted">
          {scheduled
            ? `The clip is queued for ${dateLabel} at ${post?.time}. Buffer will deliver it to your connected channels at that time.`
            : 'This item is saved as a draft. Nothing has been sent to Buffer yet.'}
        </p>

        <div className="relative mt-3 flex flex-wrap items-center justify-center gap-2">
          <Badge tone={scheduled ? 'violet' : 'slate'} icon="clock">
            {scheduled ? 'Scheduled in Buffer' : 'Draft — not queued'}
          </Badge>
          {post?.queueId && <Badge tone="cyan" icon="layers">{post.queueId}</Badge>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
          <Icon name="film" size={13} className="text-violet-300" />
          <h2 className="text-[12px] font-bold">Scheduled content</h2>
          <span className="ml-auto text-[10px] text-white/35">Not yet published</span>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-[120px_1fr]">
          <div className="mx-auto w-[120px] overflow-hidden rounded-xl border border-white/10">
            <ClipThumb clip={clip} ratio="9 / 16" rounded="rounded-none" showMeta={false} />
          </div>
          <div className="min-w-0 space-y-2">
            <div>
              <div className="text-[13px] font-bold leading-snug">{post?.title || clip?.title}</div>
              <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-white/45">{post?.caption}</p>
            </div>

            <dl className="grid grid-cols-2 gap-2">
              {[
                ['Destination', channels.map((c) => c.name).join(', ') || '—'],
                ['Scheduled date', dateLabel],
                ['Scheduled time', post?.time || '—'],
                ['Status', scheduled ? 'Queued in Buffer' : 'Draft'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/8 bg-white/[0.02] px-2 py-1.5">
                  <dt className="text-[8.5px] uppercase tracking-wider text-white/35">{k}</dt>
                  <dd className="mt-0.5 truncate text-[10.5px] font-semibold text-white/85">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap items-center gap-1.5">
              {channels.map((c) => (
                <span key={c.id} className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[9.5px] font-semibold">
                  <BrandIcon name={c.id} size={11} /> {c.handle}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <InfoNote tone="amber" icon="info">
        Scheduled is not published. You can reschedule, edit or remove this item from the publishing queue before Buffer delivers it.
      </InfoNote>

      <div className="grid gap-2 sm:grid-cols-3">
        <button className="btn btn-primary" onClick={() => navigate('/queue')}>
          <Icon name="clock" size={15} /> View Buffer queue
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/composer')}>
          <Icon name="plus" size={15} /> Schedule another
        </button>
        <button className="btn btn-ghost" onClick={() => { toast('Calendar opened.', 'info'); navigate('/calendar'); }}>
          <Icon name="calendar" size={15} /> Open calendar
        </button>
      </div>
    </div>
  );
}
