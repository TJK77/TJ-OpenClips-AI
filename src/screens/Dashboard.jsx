import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Progress, ScoreRing, SectionHead, StatCard, Avatar } from '../components/ui';
import { ClipThumb, Thumb } from '../components/Thumb';
import { PIPELINE_STAGES, WEEK_ACTIVITY } from '../lib/data';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function fmtTime(t = '') {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, '0')} ${suffix}`;
}

const STATUS_TONE = { Ready: 'mint', Processing: 'violet', Draft: 'slate', Failed: 'rose' };

export default function Dashboard() {
  const { user, projects, clips, posts, buffer, providers, analysis, navigate, caption, settings } = useStore();

  const scheduled = posts.filter((p) => p.status === 'scheduled');
  const drafts = posts.filter((p) => p.status === 'draft');
  const connectedChannels = buffer.channels.filter((c) => c.connected);
  const liveProject = projects.find((p) => p.status === 'Processing');
  const activeProvider = providers.find((p) => p.connected) || providers[0];
  const avgScore = Math.round(clips.reduce((a, c) => a + c.score, 0) / Math.max(1, clips.length));

  const setup = [
    { label: 'Connect an AI provider', done: providers.some((p) => p.connected), path: '/models', icon: 'cpu' },
    { label: 'Import your first video', done: projects.length > 0, path: '/import', icon: 'video' },
    { label: 'Choose a caption style', done: !!caption.styleId, path: '/captions', icon: 'captions' },
    { label: 'Connect Buffer', done: buffer.connected, path: '/buffer', icon: 'share' },
  ];
  const setupDone = setup.filter((s) => s.done).length;

  const sparkClips = WEEK_ACTIVITY.map((d) => d.clips);
  const sparkViews = WEEK_ACTIVITY.map((d) => d.views);
  const sparkPosts = WEEK_ACTIVITY.map((d) => d.clips * 0.6 + d.views / 6);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-600/25 via-ink-800/70 to-cyan-500/10 p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="dot-live h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                {activeProvider.connected ? `${activeProvider.name} · ${activeProvider.model}` : 'No AI provider connected'}
              </span>
            </div>
            <h1 className="mt-2 font-display text-[24px] font-extrabold leading-tight tracking-tight sm:text-[30px]">
              {greeting()}, {user.name.split(' ')[0]}
            </h1>
            <p className="mt-1.5 max-w-lg text-[12.5px] leading-relaxed text-white/60 sm:text-[13.5px]">
              {liveProject
                ? `“${liveProject.title}” is being analysed — ${liveProject.progress}% complete.`
                : 'You have a fresh video to cut? Drop a link and OpenClips will find the moments worth posting.'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className="btn btn-primary" onClick={() => navigate('/import')}>
                <Icon name="plus" size={16} /> Create new project
              </button>
              <button className="btn btn-secondary" onClick={() => navigate(liveProject ? '/analyze' : '/clips')}>
                <Icon name={liveProject ? 'sparkles' : 'film'} size={15} />
                {liveProject ? 'View processing' : 'Review clips'}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/calendar')}>
                <Icon name="calendar" size={15} /> Calendar
              </button>
            </div>
          </div>

          <div className="shrink-0 rounded-2xl border border-white/10 bg-ink-950/40 p-3.5 backdrop-blur-xl lg:w-[248px]">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-white/45">Workspace setup</span>
              <span className="text-[11px] font-extrabold text-violet-300">{setupDone}/4</span>
            </div>
            <Progress value={(setupDone / 4) * 100} className="mt-2" />
            <div className="mt-2.5 space-y-1">
              {setup.map((s) => (
                <button key={s.label} onClick={() => navigate(s.path)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left transition hover:bg-white/5">
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${s.done ? 'border-emerald-400/50 bg-emerald-400/20 text-emerald-300' : 'border-white/20 text-transparent'}`}>
                    <Icon name="check" size={9} strokeWidth={3} />
                  </span>
                  <span className={`truncate text-[11px] ${s.done ? 'text-white/45 line-through' : 'font-medium text-white/80'}`}>{s.label}</span>
                  {!s.done && <Icon name="chevron-right" size={11} className="ml-auto shrink-0 text-white/25" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatCard icon="video" label="Videos processed" value={projects.length} delta="+3 this week" tone="violet" spark={sparkViews} onClick={() => navigate('/videos')} />
        <StatCard icon="film" label="Clips generated" value={clips.length} delta={`avg score ${avgScore}`} tone="cyan" spark={sparkClips} onClick={() => navigate('/clips')} />
        <StatCard icon="clock" label="Scheduled posts" value={scheduled.length} delta={`${drafts.length} drafts`} tone="mint" spark={sparkPosts} onClick={() => navigate('/queue')} />
        <StatCard icon="share" label="Connected accounts" value={connectedChannels.length} delta={buffer.connected ? 'Buffer live' : 'Buffer offline'} tone="amber" spark={sparkClips} onClick={() => navigate('/buffer')} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* Recent projects */}
          <section>
            <SectionHead
              title="Recent projects"
              sub="Long videos currently in your studio"
              action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/videos')}>All videos <Icon name="arrow-right" size={13} /></button>}
            />
            <div className="space-y-2">
              {projects.slice(0, 4).map((p) => {
                const stage = PIPELINE_STAGES[Math.min(8, Math.max(0, Math.round((p.progress / 100) * 9) - 1))];
                return (
                  <button
                    key={p.id}
                    onClick={() => navigate(p.status === 'Processing' ? '/analyze' : '/clips')}
                    className="card card-hover flex w-full items-center gap-3 p-2.5 text-left sm:p-3"
                  >
                    <div className="relative w-[74px] shrink-0 sm:w-[92px]">
                      <Thumb hue={p.hue} hue2={p.hue2} seed={p.id} ratio="16 / 9" rounded="rounded-lg" showGrid={false} />
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[8.5px] font-bold">{p.duration}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="line-clamp-2 flex-1 text-[12.5px] font-semibold leading-snug sm:text-[13px]">{p.title}</h3>
                        <Badge tone={STATUS_TONE[p.status] || 'slate'} className="shrink-0">{p.status}</Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-white/45">
                        <span className="inline-flex items-center gap-1"><Icon name="film" size={10} /> {p.clips} clips</span>
                        <span>·</span>
                        <span>{p.source}</span>
                        <span>·</span>
                        <span>{p.created}</span>
                      </div>
                      {p.status === 'Processing' ? (
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={p.progress} className="flex-1" />
                          <span className="shrink-0 text-[9.5px] font-bold text-violet-300">{p.progress}%</span>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-white/35">
                          <Icon name="captions" size={10} /> {p.language || 'English (US)'} · 1080×1920
                        </div>
                      )}
                      {p.status === 'Processing' && stage && (
                        <div className="mt-1 text-[9.5px] font-medium text-white/40">{stage.label}</div>
                      )}
                    </div>
                    <Icon name="chevron-right" size={15} className="shrink-0 text-white/20" />
                  </button>
                );
              })}
            </div>
          </section>

          {/* Recent clips */}
          <section>
            <SectionHead
              title="Recent clips"
              sub="Ranked by viral potential"
              action={<button className="btn btn-ghost btn-sm" onClick={() => navigate('/clips')}>Gallery <Icon name="arrow-right" size={13} /></button>}
            />
            <div className="-mx-3.5 flex gap-2.5 overflow-x-auto px-3.5 pb-1 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-4">
              {clips.slice(0, 4).map((c) => (
                <div key={c.id} className="group relative w-[142px] shrink-0 sm:w-auto">
                  <button onClick={() => navigate('/clips')} className="block w-full text-left">
                    <ClipThumb clip={c} ratio="9 / 16" className="transition group-hover:brightness-110" />
                  </button>
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-[11px] font-semibold leading-snug">{c.title}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-[9.5px] text-white/40">
                        <Icon name="clock" size={9} /> {c.duration} · {c.speaker}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-4">
          {/* Processing activity */}
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
              <span className={`h-1.5 w-1.5 rounded-full ${liveProject ? 'bg-violet-400 dot-live' : 'bg-white/25'}`} />
              <h3 className="text-[12px] font-bold">Processing activity</h3>
              <button className="ml-auto text-[10.5px] font-semibold text-violet-300" onClick={() => navigate('/analyze')}>Open</button>
            </div>
            {liveProject ? (
              <div className="p-3.5">
                <div className="text-[12px] font-semibold leading-snug">{liveProject.title}</div>
                <div className="mt-0.5 text-[10.5px] text-white/45">{liveProject.duration} · {liveProject.source}</div>
                <div className="mt-3 flex items-center justify-between text-[10.5px]">
                  <span className="font-semibold text-violet-200">
                    {PIPELINE_STAGES[Math.min(8, Math.max(0, Math.round((liveProject.progress / 100) * 9) - 1))]?.label}
                  </span>
                  <span className="font-bold text-white/60">{liveProject.progress}%</span>
                </div>
                <Progress value={liveProject.progress} className="mt-1.5" />
                <div className="mt-3 space-y-1">
                  {PIPELINE_STAGES.slice(0, 5).map((s, i) => {
                    const activeIndex = Math.max(0, Math.round((liveProject.progress / 100) * 9) - 1);
                    const done = i < activeIndex;
                    const active = i === activeIndex;
                    return (
                      <div key={s.id} className="flex items-center gap-2">
                        <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${done ? 'bg-emerald-400/20 text-emerald-300' : active ? 'bg-violet-500/25 text-violet-200' : 'bg-white/6 text-white/25'}`}>
                          <Icon name={done ? 'check' : s.icon} size={9} strokeWidth={2.6} />
                        </span>
                        <span className={`truncate text-[10.5px] ${active ? 'font-semibold text-white' : done ? 'text-white/45' : 'text-white/30'}`}>{s.label}</span>
                        {active && <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider text-violet-300">live</span>}
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn-secondary btn-sm mt-3 w-full" onClick={() => navigate('/analyze')}>View pipeline</button>
              </div>
            ) : (
              <div className="p-3.5">
                <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] p-3 text-center">
                  <Icon name="sparkles" size={18} className="mx-auto text-violet-300" />
                  <p className="mt-1.5 text-[11.5px] font-semibold">No jobs running</p>
                  <p className="mt-0.5 text-[10.5px] text-white/45">Import a video to start the AI pipeline.</p>
                  <button className="btn btn-primary btn-sm mt-2.5 w-full" onClick={() => navigate('/import')}>Import video</button>
                </div>
                <div className="mt-3 space-y-2">
                  {[
                    { icon: 'check', tone: 'text-emerald-300', label: 'Ep. 41 batch complete', meta: '12 clips · 8m ago' },
                    { icon: 'check', tone: 'text-emerald-300', label: 'Captions rendered', meta: 'Bold Viral · 22m ago' },
                    { icon: 'clock', tone: 'text-violet-300', label: 'Scheduled to Buffer', meta: '3 posts · 1h ago' },
                  ].map((a) => (
                    <div key={a.label} className="flex items-center gap-2">
                      <span className={`${a.tone}`}><Icon name={a.icon} size={12} /></span>
                      <span className="truncate text-[11px]">{a.label}</span>
                      <span className="ml-auto shrink-0 text-[9.5px] text-white/35">{a.meta}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Next to publish */}
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
              <Icon name="clock" size={13} className="text-cyan-300" />
              <h3 className="text-[12px] font-bold">Publishing next</h3>
              <button className="ml-auto text-[10.5px] font-semibold text-violet-300" onClick={() => navigate('/queue')}>Queue</button>
            </div>
            <div className="divide-y divide-white/6">
              {scheduled.slice(0, 3).map((post) => {
                const clip = clips.find((c) => c.id === post.clipId);
                return (
                  <div key={post.id} className="flex items-center gap-2.5 px-3 py-2.5">
                    <Thumb hue={post.hue} hue2={post.hue2} seed={post.clipId} ratio="9 / 16" rounded="rounded-md" className="w-8 shrink-0" showGrid={false} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-semibold">{post.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] text-white/45">
                        <span>{post.date === new Date().toISOString().slice(0, 10) ? 'Today' : post.date}</span>
                        <span>·</span>
                        <span>{fmtTime(post.time)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 -space-x-1">
                      {post.channels.slice(0, 2).map((ch) => (
                        <span key={ch} className="grid h-5 w-5 place-items-center rounded-full bg-ink-700 ring-1 ring-ink-950"><BrandIcon name={ch} size={10} /></span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {scheduled.length === 0 && <div className="px-3 py-5 text-center text-[11px] text-white/40">Nothing scheduled yet.</div>}
            </div>
            <button className="w-full border-t border-white/8 py-2 text-[10.5px] font-semibold text-violet-300 hover:bg-white/5" onClick={() => navigate('/composer')}>
              Schedule a clip
            </button>
          </section>

          {/* Provider + Buffer health */}
          <section className="card p-3.5">
            <h3 className="text-[12px] font-bold">Integrations</h3>
            <div className="mt-2.5 space-y-2">
              <button className="flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-left transition hover:bg-white/6" onClick={() => navigate('/models')}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${activeProvider.accent}1f`, color: activeProvider.accent }}>
                  <Icon name={activeProvider.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold">{activeProvider.name}</div>
                  <div className="truncate text-[10px] text-white/45">{activeProvider.model}</div>
                </div>
                <Badge tone={activeProvider.connected ? 'mint' : 'rose'}>{activeProvider.connected ? 'Live' : 'Off'}</Badge>
              </button>
              <button className="flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] p-2.5 text-left transition hover:bg-white/6" onClick={() => navigate('/buffer')}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                  <BrandIcon name="buffer" size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11.5px] font-semibold">Buffer</div>
                  <div className="truncate text-[10px] text-white/45">{connectedChannels.length} channels · {buffer.workspace}</div>
                </div>
                <Badge tone={buffer.connected ? 'mint' : 'rose'}>{buffer.connected ? 'Live' : 'Off'}</Badge>
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-violet-500/[0.07] px-2.5 py-2">
              <Avatar initials={user.initials} size={24} />
              <span className="text-[10.5px] leading-tight text-white/60">
                {settings.quality} exports · {caption.styleId.replace('-', ' ')} captions
              </span>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
