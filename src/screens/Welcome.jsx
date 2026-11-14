import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Thumb, PlayOverlay } from '../components/Thumb';
import { Badge, Logo } from '../components/ui';

const FEATURES = [
  {
    icon: 'sparkles',
    title: 'AI moment detection',
    body: 'Every pause, punchline and payoff is scored 0–100 so you cut the clips that actually hold attention.',
    tone: 'from-violet-500/25 to-cyan-400/10 text-violet-200',
  },
  {
    icon: 'captions',
    title: '10 caption styles',
    body: 'Karaoke word highlights, bold viral caps, podcast boxes — styled once, applied to every clip.',
    tone: 'from-cyan-400/25 to-violet-500/10 text-cyan-200',
  },
  {
    icon: 'crop',
    title: 'Smart reframe',
    body: '9:16, 16:9, 1:1 and 4:5 exports with speaker-aware cropping and safe-zone awareness.',
    tone: 'from-fuchsia-500/25 to-violet-500/10 text-fuchsia-200',
  },
  {
    icon: 'share',
    title: 'Buffer publishing',
    body: 'Push clips into your Buffer queue, pick channels, schedule the slot — no manual re-uploading.',
    tone: 'from-emerald-400/25 to-cyan-400/10 text-emerald-200',
  },
  {
    icon: 'key',
    title: 'Bring your own keys',
    body: 'Groq, OpenRouter and Gemini. Your API keys stay in your workspace and are never displayed in full.',
    tone: 'from-amber-400/25 to-orange-500/10 text-amber-200',
  },
  {
    icon: 'chart',
    title: 'Performance loop',
    body: 'See which hooks earned reach, then feed those patterns back into the next batch of clips.',
    tone: 'from-violet-500/25 to-fuchsia-500/10 text-violet-200',
  },
];

const STEPS = [
  { n: '01', title: 'Import', body: 'Paste a YouTube link or drop a file.' },
  { n: '02', title: 'Analyse', body: 'Transcribe, score and rank highlights.' },
  { n: '03', title: 'Style', body: 'Captions, reframe and brand polish.' },
  { n: '04', title: 'Publish', body: 'Schedule to Buffer in one pass.' },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[880px]">
      <div className="absolute -inset-6 -z-10 rounded-[36px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(124,92,255,0.35),transparent_70%)] blur-2xl" />
      <div className="glass overflow-hidden rounded-3xl p-2 shadow-panel">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-ink-950">
          <Thumb hue={262} hue2={190} ratio="16 / 9" rounded="rounded-none" seed="hero" className="w-full">
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/10 to-ink-950/30" />
            <div className="absolute inset-0 grid place-items-center">
              <div className="group flex flex-col items-center gap-3">
                <span className="grid h-16 w-16 place-items-center rounded-full border border-white/25 bg-white/10 text-white shadow-[0_0_40px_rgba(124,92,255,0.55)] backdrop-blur-xl transition group-hover:scale-105 group-hover:bg-violet-500/80">
                  <Icon name="play" size={22} className="ml-1" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">Watch the 48s demo</span>
              </div>
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-ink-950/70 px-2 py-1 text-[10px] font-bold text-rose-200 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 dot-live" /> SOURCE · 1:12:38
              </span>
              <span className="hidden rounded-lg border border-white/15 bg-ink-950/70 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur sm:block">
                Ep. 42 — Scaling Without Burnout
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-violet-500/90 px-1.5 py-0.5 text-[9.5px] font-extrabold tracking-wide text-white">AI</span>
                <span className="text-[10.5px] font-medium text-white/75">8 viral candidates found · best score 96</span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/15">
                <div className="absolute inset-y-0 left-0 w-[42%] rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" />
                {[18, 34, 46, 58, 71, 86].map((p) => (
                  <span key={p} className="absolute top-1/2 h-2.5 w-1 -translate-y-1/2 rounded-full bg-white/70" style={{ left: `${p}%` }} />
                ))}
              </div>
            </div>
          </Thumb>
        </div>
      </div>

      <div className="pointer-events-none absolute -right-2 -top-8 hidden w-[104px] rotate-6 sm:block lg:-right-10">
        <div className="rounded-2xl border border-white/15 bg-ink-900/80 p-1.5 shadow-panel backdrop-blur-xl">
          <Thumb hue={190} hue2={262} ratio="9 / 16" seed="float1" showGrid={false} rounded="rounded-xl">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5 pt-4">
              <div className="text-[8px] font-extrabold uppercase leading-tight text-white">Stop chasing virality</div>
            </div>
            <span className="absolute right-1 top-1 rounded bg-emerald-400 px-1 text-[8px] font-extrabold text-ink-950">92</span>
          </Thumb>
        </div>
      </div>
      <div className="pointer-events-none absolute -left-3 bottom-6 hidden w-[96px] -rotate-6 sm:block lg:-left-12">
        <div className="rounded-2xl border border-white/15 bg-ink-900/80 p-1.5 shadow-panel backdrop-blur-xl">
          <Thumb hue={320} hue2={262} ratio="9 / 16" seed="float2" showGrid={false} rounded="rounded-xl">
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-1.5 pt-4">
              <div className="text-[8px] font-extrabold uppercase leading-tight text-white">Price the outcome</div>
            </div>
            <span className="absolute right-1 top-1 rounded bg-violet-400 px-1 text-[8px] font-extrabold text-ink-950">93</span>
          </Thumb>
        </div>
      </div>
    </div>
  );
}

export default function Welcome() {
  const { navigate, signedIn } = useStore();
  return (
    <div className="relative min-h-dvh overflow-hidden bg-ink-950 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute right-[-120px] top-[120px] h-[380px] w-[380px] rounded-full bg-cyan-500/20 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[320px] w-[520px] rounded-full bg-fuchsia-600/10 blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(4,6,15,0)_0%,rgba(4,6,15,0.65)_60%,#04060f_100%)]" />
      </div>

      <header className="safe-top mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo size={34} />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-white/70 md:flex">
          <a className="transition hover:text-white" href="#features">Features</a>
          <a className="transition hover:text-white" href="#how">How it works</a>
          <a className="transition hover:text-white" href="#open">Open source</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm hidden sm:inline-flex" onClick={() => navigate('/signin')}>
            Sign in
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate(signedIn ? '/dashboard' : '/register')}>
            {signedIn ? 'Open studio' : 'Get started'}
            <Icon name="arrow-right" size={14} />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pt-14">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/75 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 dot-live" />
            Free &amp; open-source pipeline · Groq + OpenRouter + Gemini
          </div>
          <h1 className="font-display text-[34px] font-extrabold leading-[1.06] tracking-tight sm:text-[56px] lg:text-[64px]">
            Turn Long Videos Into{' '}
            <span className="text-gradient">Viral-Ready Clips.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[14.5px] leading-relaxed text-white/65 sm:text-base">
            TJ OpenClips AI Studio watches your podcast, webinar or stream, finds the moments worth sharing,
            captions them in your style and schedules them straight into Buffer — all from one workspace.
          </p>
          <div className="mt-7 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              <Icon name="sparkles" size={17} />
              Get Started Free
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/signin')}>
              Sign In
              <Icon name="arrow-right" size={16} />
            </button>
          </div>
          <p className="mt-3 text-[11.5px] text-white/45">
            No credit card. Bring your own AI keys. Cancel or self-host anytime.
          </p>
        </div>

        <div className="mt-12 sm:mt-16">
          <HeroPreview />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
          <span>Powered by</span>
          <span className="flex items-center gap-1.5 text-white/70"><Icon name="zap" size={13} className="text-orange-400" /> Groq Whisper</span>
          <span className="flex items-center gap-1.5 text-white/70"><Icon name="layers" size={13} className="text-violet-300" /> OpenRouter</span>
          <span className="flex items-center gap-1.5 text-white/70"><Icon name="sparkles" size={13} className="text-cyan-300" /> Gemini</span>
          <span className="flex items-center gap-1.5 text-white/70"><BrandIcon name="buffer" size={13} /> Buffer</span>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.22em] text-violet-300/90">Everything in one studio</div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            The clipping workflow, finished.
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-white/60">
            Not a demo dashboard — a complete pipeline from source video to scheduled post, with the controls a real editor needs.
          </p>
        </div>
        <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover group relative overflow-hidden p-5">
              <div className={`mb-4 grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-gradient-to-br ${f.tone}`}>
                <Icon name={f.icon} size={18} />
              </div>
              <h3 className="font-display text-[15px] font-bold">{f.title}</h3>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/55">{f.body}</p>
              <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-violet-500/10 blur-2xl transition group-hover:bg-violet-500/20" />
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="card relative overflow-hidden p-5 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_10%_0%,rgba(124,92,255,0.16),transparent_60%)]" />
          <div className="relative">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-cyan-300/90">Four moves</div>
                <h2 className="mt-1 font-display text-xl font-extrabold sm:text-2xl">From 72 minutes to eight clips</h2>
              </div>
              <Badge tone="mint" icon="clock">~6 min average processing</Badge>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="font-display text-[11px] font-extrabold text-violet-300/80">{s.n}</div>
                  <div className="mt-1.5 font-display text-sm font-bold">{s.title}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-white/55">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="open" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="glass relative overflow-hidden rounded-3xl p-6 text-center sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(34,211,238,0.18),transparent_65%)]" />
          <div className="relative">
            <h2 className="mx-auto max-w-xl font-display text-2xl font-extrabold leading-tight sm:text-3xl">
              Free, open-source technology. Your keys, your data.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[13px] leading-relaxed text-white/60">
              The analysis pipeline runs on open models you configure yourself. Credentials are masked in the UI and stored in your workspace — never printed, never shared.
            </p>
            <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
                Create free account
                <Icon name="arrow-right" size={16} />
              </button>
              <button className="btn btn-ghost btn-lg" onClick={() => navigate('/dashboard')}>
                Explore the studio
              </button>
            </div>
          </div>
        </div>
        <footer className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/8 pt-6 text-[11.5px] text-white/40 sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={22} withText={false} />
            <span>© {new Date().getFullYear()} TJ OpenClips AI Studio</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Icon name="shield" size={12} /> Keys stay local</span>
            <span className="flex items-center gap-1.5"><Icon name="globe" size={12} /> Cloudflare-ready</span>
          </div>
        </footer>
      </section>
    </div>
  );
}
