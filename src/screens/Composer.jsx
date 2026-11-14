import { useMemo, useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Field, InfoNote, Progress, SectionHead, Select } from '../components/ui';
import { CaptionPreview, ClipThumb } from '../components/Thumb';
import { addDays, isoDate } from '../lib/data';

const CAPTION_SEEDS = [
  'Your first three seconds decide everything. Here is the hook formula I use on every clip 👇',
  'Most creators lose 60% of viewers before the promise lands. Fix the order, not the edit.',
  'Confusion is a retention mechanic. Ask the question before you answer it.',
];
const HASHTAG_SETS = [
  '#contentstrategy #shorts #creatoreconomy #hookformula',
  '#podcastclips #viralvideo #growthmarketing #reels',
  '#aitools #videoediting #socialmedia #openclips',
];

export default function Composer() {
  const { clips, selectedClips, toggleClip, buffer, posts, addPost, sendPost, generateCaption: generateCaptionAI, navigate, toast, caption } = useStore();
  const connectedChannels = buffer.channels.filter((c) => c.connected);
  const chosen = clips.filter((c) => selectedClips.includes(c.id));
  const [channels, setChannels] = useState(connectedChannels.slice(0, 2).map((c) => c.id));
  const [text, setText] = useState(CAPTION_SEEDS[0]);
  const [hashtags, setHashtags] = useState(HASHTAG_SETS[0]);
  const [description, setDescription] = useState('Full episode: Scaling without burnout — link in bio.');
  const [date, setDate] = useState(addDays(1));
  const [time, setTime] = useState('18:30');
  const [generating, setGenerating] = useState(false);
  const [firstComment, setFirstComment] = useState(true);

  const totalChars = text.length + hashtags.length + 2;
  const activeClip = chosen[0] || clips[0];

  const previewStyle = useMemo(() => ({
    font: caption.font, weight: caption.weight, size: Math.max(11, caption.size * 0.5),
    color: caption.color, highlight: caption.highlight, bg: caption.background,
    box: caption.position === 'boxed', caps: true, stroke: true,
    position: caption.position === 'boxed' ? 'bottom' : caption.position,
    gradient: caption.styleId === 'gradient-pop',
  }), [caption]);

  const generateCaption = async () => {
    if (!activeClip) {
      toast('Select a clip first so the AI has a real transcript to work from.', 'error');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateCaptionAI({ clipId: activeClip.id });
      const copy = result.caption || result.description?.description || '';
      if (copy) setText(copy);
      if (result.hashtags?.length) setHashtags(result.hashtags.join(' '));
      if (result.aiGenerated) {
        toast(`Description written by ${result.provider}${result.model ? ` (${result.model})` : ''}.`, 'success');
      } else {
        toast(result.note || 'No AI key configured — description built locally from the real transcript.', 'info');
      }
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setGenerating(false);
    }
  };

  const buildPost = async (status) => {
    if (!activeClip) {
      toast('Select at least one clip first.', 'error');
      return null;
    }
    if (!channels.length) {
      toast('Select at least one destination channel.', 'error');
      return null;
    }
    if (!text.trim()) {
      toast('Write or generate a caption before scheduling.', 'error');
      return null;
    }
    const destination = channels
      .map((id) => connectedChannels.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ id: c.id, name: c.name, service: c.service || 'buffer' }));
    const when = new Date(`${date}T${time}:00`);
    try {
      const post = await addPost({
        clipIds: [activeClip.id],
        channels: destination,
        caption: text.trim(),
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        description,
        scheduledAt: status === 'scheduled' ? when.toISOString() : null,
        action: status === 'scheduled' ? 'schedule' : 'draft',
      });
      return { post, queueId: post?.queueId || null };
    } catch (error) {
      toast(error.message, 'error');
      return null;
    }
  };

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Step 11 · Composer"
        title="Publishing composer"
        sub="Choose clips, write the caption, pick destinations and schedule through Buffer."
        action={<Badge tone="violet" icon="layers">{chosen.length} selected</Badge>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-4">
          {/* Clip selection */}
          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="film" size={14} className="text-violet-300" />
              <h2 className="text-[12.5px] font-bold">1 · Select clips</h2>
              <span className="ml-auto text-[10px] text-white/40">{chosen.length} of {clips.length}</span>
            </div>
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {clips.slice(0, 8).map((c) => {
                const on = selectedClips.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleClip(c.id)}
                    className={`relative w-[92px] shrink-0 overflow-hidden rounded-xl border text-left transition ${
                      on ? 'border-violet-400/70 ring-2 ring-violet-500/25' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <ClipThumb clip={c} ratio="9 / 16" rounded="rounded-none" showMeta={false} />
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8.5px] font-bold">{c.duration}</span>
                    <span className={`absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full ${on ? 'bg-violet-500' : 'bg-black/50 border border-white/30'}`}>
                      {on && <Icon name="check" size={9} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Destinations */}
          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="share" size={14} className="text-cyan-300" />
              <h2 className="text-[12.5px] font-bold">2 · Destinations</h2>
              <button className="ml-auto text-[10px] font-semibold text-violet-300" onClick={() => navigate('/buffer')}>Manage</button>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {connectedChannels.map((ch) => {
                const on = channels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    onClick={() => setChannels((prev) => (on ? prev.filter((x) => x !== ch.id) : [...prev, ch.id]))}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                      on ? 'border-cyan-400/40 bg-cyan-500/10' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <BrandIcon name={ch.id} size={15} style={{ color: `hsl(${ch.hue} 90% 70%)` }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold">{ch.name}</span>
                      <span className="block truncate text-[9px] text-white/40">{ch.handle}</span>
                    </span>
                    <span className={`grid h-4 w-4 place-items-center rounded-full ${on ? 'bg-cyan-400 text-ink-950' : 'border border-white/25'}`}>
                      {on && <Icon name="check" size={9} strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Caption */}
          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="edit" size={14} className="text-violet-300" />
              <h2 className="text-[12.5px] font-bold">3 · Caption &amp; hashtags</h2>
              <Badge tone={totalChars > 2200 ? 'rose' : 'slate'} className="ml-auto">{totalChars} chars</Badge>
            </div>

            <div className="mt-2.5">
              <Field label="Post caption">
                <textarea
                  className="input min-h-[86px] resize-y leading-relaxed"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={2200}
                  placeholder="Write the hook, the promise and the CTA…"
                />
              </Field>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <button className="btn btn-secondary btn-sm" onClick={generateCaption} disabled={generating}>
                  <Icon name={generating ? 'refresh' : 'sparkles'} size={12} className={generating ? 'animate-spin' : ''} />
                  {generating ? 'Generating…' : 'Generate with AI'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setHashtags(HASHTAG_SETS[Math.floor(Math.random() * HASHTAG_SETS.length)])}>
                  <Icon name="hash" size={12} /> Generate hashtags
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setText(''); setHashtags(''); }}>
                  <Icon name="trash" size={12} /> Clear
                </button>
              </div>
            </div>

            <div className="mt-3">
              <Field label="Hashtags">
                <input className="input text-[12px]" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="#shorts #reels" />
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Video description" hint="Used for YouTube Shorts and LinkedIn">
                <textarea className="input min-h-[54px] resize-y text-[12px]" value={description} onChange={(e) => setDescription(e.target.value)} />
              </Field>
            </div>

            <label className="mt-3 flex items-center gap-2 text-[11px] text-white/60">
              <input type="checkbox" checked={firstComment} onChange={(e) => setFirstComment(e.target.checked)} className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-violet-500" />
              Add hashtags as first comment on Instagram
            </label>
          </section>

          {/* Schedule */}
          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="calendar" size={14} className="text-emerald-300" />
              <h2 className="text-[12.5px] font-bold">4 · Schedule</h2>
            </div>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
              <Field label="Publishing date">
                <input type="date" className="input" value={date} min={isoDate(new Date())} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Publishing time">
                <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {['09:00', '12:30', '18:30', '21:00'].map((t) => (
                <button key={t} onClick={() => setTime(t)} className={`chip ${time === t ? 'chip-active' : ''}`}>{t}</button>
              ))}
              <span className="ml-auto self-center text-[9.5px] text-white/35">Times shown in your local timezone</span>
            </div>
            <InfoNote tone="cyan" icon="info" className="mt-2.5">
              Scheduling sends the clip to Buffer's queue. It is not published until Buffer delivers it at the scheduled time.
            </InfoNote>
          </section>
        </div>

        {/* Preview column */}
        <div className="space-y-3">
          <section className="card sticky top-16 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
              <Icon name="eye" size={13} className="text-violet-300" />
              <h2 className="text-[12px] font-bold">Post preview</h2>
              <Badge tone="slate" className="ml-auto">{channels.length} channel{channels.length === 1 ? '' : 's'}</Badge>
            </div>

            <div className="p-3">
              <div className="mx-auto w-full max-w-[250px] overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-400 text-[9px] font-black">TJ</span>
                  <div className="min-w-0">
                    <div className="truncate text-[10px] font-bold">openclips.ai</div>
                    <div className="text-[8px] text-white/40">Sponsored · Reels</div>
                  </div>
                  <Icon name="more" size={13} className="ml-auto text-white/50" />
                </div>
                <div className="relative">
                  <ClipThumb clip={activeClip} ratio="9 / 16" rounded="rounded-none" showMeta={false} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <CaptionPreview text={activeClip?.caption || 'Your first three seconds decide everything'} style={previewStyle} />
                  <span className="absolute right-2 top-2 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-bold backdrop-blur">
                    {activeClip?.duration}
                  </span>
                </div>
                <div className="space-y-1.5 p-2.5">
                  <div className="flex items-center gap-2 text-white/70">
                    <Icon name="heart" size={13} /><Icon name="send" size={12} /><Icon name="copy" size={12} />
                  </div>
                  <p className="line-clamp-3 text-[9.5px] leading-snug text-white/75">
                    <span className="font-bold">openclips.ai</span> {text}
                  </p>
                  <p className="line-clamp-1 text-[9px] text-cyan-300">{hashtags}</p>
                  <p className="text-[8px] uppercase tracking-wide text-white/30">Scheduled · {date} at {time}</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/8 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px]">
                <span className="text-white/45">Buffer queue readiness</span>
                <span className="font-bold text-emerald-300">{buffer.connected && channels.length ? 'Ready' : 'Incomplete'}</span>
              </div>
              <Progress value={buffer.connected ? Math.min(100, 20 + channels.length * 25 + (text ? 30 : 0)) : 15} />
              <div className="mt-3 space-y-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={async () => {
                    const res = await buildPost('scheduled');
                    if (!res) return;
                    toast('Post scheduled and saved to your queue.', 'success');
                    navigate('/success');
                  }}
                >
                  <Icon name="send" size={14} /> Schedule post
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={async () => {
                      const res = await buildPost('scheduled');
                      if (!res) return;
                      try {
                        await sendPost(res.post.id);
                        toast('Sent to your Buffer queue.', 'success');
                      } catch (error) {
                        toast(`${error.message} The post is saved as scheduled — retry it from the Publishing Queue.`, 'error');
                      }
                      navigate('/queue');
                    }}
                  >
                    <Icon name="layers" size={13} /> Add to Buffer Queue
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      const res = await buildPost('draft');
                      if (!res) return;
                      toast('Saved as draft. Nothing was sent to Buffer.', 'info');
                      navigate('/calendar');
                    }}
                  >
                    <Icon name="folder" size={13} /> Save draft
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
