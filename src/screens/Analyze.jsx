import { useEffect, useMemo, useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Progress, ScoreRing, SectionHead, Avatar, InfoNote } from '../components/ui';
import { Thumb, Waveform } from '../components/Thumb';
import { PIPELINE_STAGES, TRANSCRIPT } from '../lib/data';

const SPEAKERS = [
  { name: 'Maya', role: 'Host', hue: 262, talk: 62 },
  { name: 'Dev', role: 'Co-host', hue: 190, talk: 38 },
];

export default function Analyze() {
  const { analysis, setAnalysisStage, completeAnalysis, toast, navigate, projects, clips, providers, caption } = useStore();
  const [running, setRunning] = useState(!analysis.done);
  const project = projects[0];
  const stage = analysis.stage;
  const done = analysis.done || stage >= 9;
  const provider = providers.find((p) => p.connected) || providers[0];

  useEffect(() => {
    if (!running || analysis.done) return undefined;
    const timer = setInterval(() => {
      setAnalysisStage(Math.min(9, analysis.stage + 1));
    }, 1150);
    return () => clearInterval(timer);
  }, [running, analysis.stage, analysis.done, setAnalysisStage]);

  useEffect(() => {
    if (analysis.stage >= 9 && !analysis.done) {
      completeAnalysis();
      setRunning(false);
      toast('Analysis complete — 8 clips ready to review.', 'success');
    }
  }, [analysis.stage, analysis.done, completeAnalysis, toast]);

  const pct = Math.round((Math.min(9, stage) / 9) * 100);
  const visibleTranscript = useMemo(() => TRANSCRIPT.slice(0, Math.min(TRANSCRIPT.length, Math.max(1, stage - 1))), [stage]);
  const moments = useMemo(() => [...clips].sort((a, b) => b.score - a.score).slice(0, 4), [clips]);

  const restart = () => {
    setAnalysisStage(0);
    setRunning(true);
  };

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Step 03 · AI analysis"
        title="Analysing your video"
        sub={project ? `${project.title} · ${project.duration} · ${project.source}` : 'Import a video to begin.'}
        action={
          <div className="flex items-center gap-2">
            <Badge tone={done ? 'mint' : 'violet'} icon={done ? 'check' : 'sparkles'}>
              {done ? 'Complete' : `Stage ${Math.min(9, Math.max(1, stage))} of 9`}
            </Badge>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        {/* Preview + progress */}
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="relative">
              <Thumb hue={project?.hue ?? 262} hue2={project?.hue2 ?? 190} seed="analyze-source" ratio="16 / 9" rounded="rounded-none" showGrid />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-transparent" />
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-ink-950/60 px-2 py-1 backdrop-blur-md">
                <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-rose-400 dot-live'}`} />
                <span className="text-[9.5px] font-bold uppercase tracking-wider">{done ? 'Source ready' : 'Processing source'}</span>
              </div>
              <div className="absolute right-3 top-3 rounded-md border border-white/15 bg-ink-950/60 px-1.5 py-0.5 text-[9.5px] font-bold backdrop-blur-md">1080p · {project?.duration ?? '1:24:18'}</div>
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4">
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-display text-[14px] font-bold sm:text-[16px]">{project?.title ?? 'Untitled project'}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-white/55">
                      <Icon name="cpu" size={10} /> {provider.name} · {provider.model}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-[22px] font-extrabold leading-none text-gradient">{pct}%</div>
                    <div className="text-[9px] font-semibold uppercase tracking-wider text-white/45">{done ? 'done' : 'analysed'}</div>
                  </div>
                </div>
                <Progress value={pct} className="mt-2.5" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-white/8 p-3">
              <button className="btn btn-primary btn-sm" onClick={() => setRunning((r) => !r)} disabled={done}>
                <Icon name={running && !done ? 'pause' : 'play'} size={13} /> {done ? 'Finished' : running ? 'Pause' : 'Resume'}
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setAnalysisStage(9); setRunning(false); }} disabled={done}>
                <Icon name="refresh" size={13} /> Skip to end
              </button>
              <button className="btn btn-ghost btn-sm" onClick={restart}>
                <Icon name="refresh" size={13} /> Re-run
              </button>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-white/40">
                <Icon name="clock" size={11} /> {done ? 'Finished in 2m 14s' : `~${Math.max(1, 9 - stage) * 14}s remaining`}
              </span>
            </div>
          </section>

          {/* Live transcript */}
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
              <Icon name="captions" size={14} className="text-cyan-300" />
              <h3 className="text-[12px] font-bold">Live transcript</h3>
              <Badge tone="cyan" className="ml-auto">Whisper large-v3</Badge>
            </div>
            <div className="max-h-[218px] space-y-2 overflow-y-auto p-3.5 scroll-thin">
              {visibleTranscript.map((line) => (
                <div key={line.t} className="flex gap-2">
                  <span className="mt-0.5 shrink-0 font-mono text-[9.5px] text-white/30">{line.t}</span>
                  <div className="min-w-0">
                    <span className={`mr-1.5 rounded px-1 py-0.5 text-[9px] font-bold ${line.speaker === 'Maya' ? 'bg-violet-500/20 text-violet-200' : 'bg-cyan-500/20 text-cyan-200'}`}>{line.speaker}</span>
                    <span className="text-[11.5px] leading-relaxed text-white/75">{line.text}</span>
                  </div>
                </div>
              ))}
              {!done && (
                <div className="flex items-center gap-1.5 pt-1 text-[10.5px] text-white/35">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
                  Transcribing with word-level timestamps…
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 border-t border-white/8 px-3.5 py-2">
              <span className="text-[10px] text-white/40">Language</span>
              <Badge tone="slate">{project?.language || 'English (US)'}</Badge>
              <span className="ml-auto text-[10px] text-white/40">142 words · 2 speakers</span>
            </div>
          </section>
        </div>

        {/* Pipeline */}
        <div className="space-y-4">
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3.5 py-2.5">
              <Icon name="layers" size={14} className="text-violet-300" />
              <h3 className="text-[12px] font-bold">Processing pipeline</h3>
              <span className="ml-auto text-[10px] font-semibold text-white/40">{Math.min(9, stage)}/9</span>
            </div>
            <ol className="p-2">
              {PIPELINE_STAGES.map((s, i) => {
                const isDone = i < stage || done;
                const isActive = i === stage - 1 && !done;
                return (
                  <li key={s.id} className={`flex items-start gap-2.5 rounded-xl px-2 py-2 transition ${isActive ? 'bg-violet-500/[0.09]' : ''}`}>
                    <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                      isDone ? 'border-emerald-400/35 bg-emerald-400/15 text-emerald-300'
                        : isActive ? 'border-violet-400/45 bg-violet-500/20 text-violet-200'
                          : 'border-white/10 bg-white/[0.03] text-white/25'}`}>
                      {isActive ? (
                        <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-violet-200/40 border-t-violet-200" />
                      ) : (
                        <Icon name={isDone ? 'check' : s.icon} size={11} strokeWidth={2.6} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11.5px] font-semibold ${isDone ? 'text-white/55' : isActive ? 'text-white' : 'text-white/35'}`}>{s.label}</span>
                        {isActive && <span className="rounded bg-violet-500/25 px-1 text-[8px] font-extrabold uppercase tracking-wider text-violet-200">running</span>}
                      </div>
                      <div className={`text-[10px] leading-snug ${isActive ? 'text-white/55' : 'text-white/28'}`}>{s.detail}</div>
                      {isActive && <Progress value={((stage % 1) + 0.4) * 100} className="mt-1.5 h-1" />}
                    </div>
                    <span className="shrink-0 pt-1 text-[9px] font-mono text-white/25">{isDone ? '✓' : `0${s.id}`}</span>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="user" size={14} className="text-cyan-300" />
              <h3 className="text-[12px] font-bold">Speaker identification</h3>
            </div>
            <div className="mt-2.5 space-y-2">
              {SPEAKERS.map((sp) => (
                <div key={sp.name} className="flex items-center gap-2.5">
                  <Avatar initials={sp.name.slice(0, 1)} size={26} hue={sp.hue} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold">{sp.name} <span className="font-normal text-white/35">· {sp.role}</span></span>
                      <span className="text-[9.5px] font-bold text-white/45">{sp.talk}%</span>
                    </div>
                    <Progress value={sp.talk} className="mt-1 h-1" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-3.5">
            <div className="flex items-center gap-2">
              <Icon name="sparkles" size={14} className="text-violet-300" />
              <h3 className="text-[12px] font-bold">Detected highlights</h3>
              <span className="ml-auto text-[10px] text-white/40">{done ? '8 found' : `${Math.max(1, stage - 3)} found`}</span>
            </div>
            <div className="mt-2.5 space-y-1.5">
              {moments.slice(0, 4).map((m) => (
                <div key={m.id} className="flex items-center gap-2 rounded-lg border border-white/7 bg-white/[0.02] p-1.5">
                  <ScoreRing score={m.score} size={30} label={false} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[10.5px] font-semibold">{m.title}</div>
                    <div className="text-[9px] text-white/35">{m.start}–{m.end} · {m.tag}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <InfoNote tone="violet" icon="info">
            Analysis runs on your own {provider.name} key. Nothing leaves this browser except the request to your provider.
          </InfoNote>

          {done && (
            <button className="btn btn-primary w-full" onClick={() => navigate('/clips')}>
              <Icon name="film" size={16} /> Review {clips.length} generated clips
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
