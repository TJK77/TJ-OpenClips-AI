import { useMemo, useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Field, InfoNote, Progress, SectionHead, Segmented, Select, Switch } from '../components/ui';
import { CaptionPreview, Thumb, Waveform } from '../components/Thumb';

const RATIOS = [
  { value: '9:16', label: '9:16', hint: 'Reels · TikTok · Shorts' },
  { value: '16:9', label: '16:9', hint: 'YouTube' },
  { value: '1:1', label: '1:1', hint: 'Feed' },
  { value: '4:5', label: '4:5', hint: 'Instagram' },
];

const TRACK_COLORS = { video: '#7C5CFF', captions: '#22D3EE', music: '#34D399', voice: '#F472B6' };

export default function Editor() {
  const { caption, clips, navigate, toast } = useStore();
  const clip = clips[0];
  const [tab, setTab] = useState('trim');
  const [ratio, setRatio] = useState('9:16');
  const [trimStart, setTrimStart] = useState(12);
  const [trimEnd, setTrimEnd] = useState(88);
  const [watermark, setWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('@openclips.ai');
  const [corner, setCorner] = useState('bottom-right');
  const [music, setMusic] = useState('Midnight Drive — 92 BPM');
  const [musicVol, setMusicVol] = useState(22);
  const [voiceVol, setVoiceVol] = useState(100);
  const [recording, setRecording] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showSafe, setShowSafe] = useState(true);

  const previewStyle = useMemo(() => ({
    font: caption.font,
    weight: caption.weight,
    size: Math.max(15, caption.size * 0.72),
    color: caption.color,
    highlight: caption.highlight,
    bg: caption.background,
    box: caption.position === 'boxed',
    caps: ['bold-viral', 'karaoke', 'tiktok', 'animated-pop', 'yellow-keyword'].includes(caption.styleId),
    stroke: true,
    position: caption.position === 'boxed' ? 'bottom' : caption.position,
    gradient: caption.styleId === 'gradient-pop',
  }), [caption]);

  const aspect = ratio === '9:16' ? '9 / 16' : ratio === '16:9' ? '16 / 9' : ratio === '1:1' ? '1 / 1' : '4 / 5';
  const frameWidth = ratio === '16:9' ? '100%' : ratio === '1:1' ? '78%' : ratio === '4:5' ? '72%' : '60%';
  const trimDuration = ((trimEnd - trimStart) / 100 * 46).toFixed(1);

  return (
    <div className="space-y-4">
      <SectionHead
        eyebrow="Step 06 · Video editor"
        title="Clip editor"
        sub={clip ? `${clip.title} · ${clip.duration} · ${clip.speaker}` : 'Select a clip to edit.'}
        action={
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => toast('Project saved as draft.', 'success')}>
              <Icon name="cloud" size={13} /> Save
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => { toast('Export queued — 1080×1920, captions burned in.', 'success'); navigate('/buffer'); }}>
              <Icon name="download" size={13} /> Export
            </button>
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        {/* Preview + timeline */}
        <div className="space-y-3">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 border-b border-white/8 px-2.5 py-2">
              <span className="mr-0.5 text-[9.5px] font-semibold tracking-wide text-white/40">Aspect ratio</span>
              {RATIOS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRatio(r.value)}
                  className={`rounded-lg border px-2 py-1 text-[10.5px] font-bold transition ${
                    ratio === r.value ? 'border-violet-400/50 bg-violet-500/20 text-white' : 'border-white/10 text-white/50 hover:text-white'
                  }`}
                  title={r.hint}
                >
                  {r.label}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <button className="icon-btn" onClick={() => toast('Auto reframe keeps the active speaker centred.', 'info')} aria-label="Auto reframe">
                  <Icon name="crop" size={14} />
                </button>
                <button className="icon-btn" onClick={() => toast('Frame reset to source.', 'info')} aria-label="Reset frame">
                  <Icon name="refresh" size={14} />
                </button>
                <button className="icon-btn" onClick={() => setShowSafe((s) => !s)} aria-label="Toggle safe area" aria-pressed={showSafe}>
                  <Icon name="grid" size={14} />
                </button>
                <button className="icon-btn" onClick={() => toast('Preview expanded.', 'info')} aria-label="Expand preview">
                  <Icon name="maximize" size={14} />
                </button>
              </div>
            </div>

            <div className="relative grid place-items-center bg-[#05070F] p-3 sm:p-5">
              <div className="relative overflow-hidden rounded-xl border border-white/12 shadow-panel" style={{ width: frameWidth, aspectRatio: aspect, maxWidth: 300 }}>
                <Thumb hue={clip?.hue ?? 262} hue2={clip?.hue2 ?? 190} seed={clip?.id ?? 'editor'} ratio={aspect} rounded="rounded-none" showGrid={false} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
                {showSafe && (
                  <>
                    <div className="pointer-events-none absolute inset-[6%] rounded-lg border border-dashed border-white/20" />
                    <div className="pointer-events-none absolute inset-x-[6%] top-1/2 border-t border-dashed border-white/10" />
                  </>
                )}
                <CaptionPreview text={clip?.caption || 'Your first three seconds decide everything'} style={previewStyle} />
                {watermark && (
                  <span
                    className={`absolute rounded bg-black/40 px-1.5 py-0.5 text-[8.5px] font-bold text-white/85 backdrop-blur ${
                      corner === 'top-left' ? 'left-2 top-2' : corner === 'top-right' ? 'right-2 top-2' : corner === 'bottom-left' ? 'bottom-2 left-2' : 'bottom-2 right-2'
                    }`}
                  >
                    {watermarkText}
                  </span>
                )}
                <div className="absolute inset-x-0 top-2 flex justify-center">
                  <span className="rounded-full bg-ink-950/60 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white/70 backdrop-blur">
                    {ratio} · 1080p
                  </span>
                </div>
              </div>
            </div>

            {/* Transport */}
            <div className="flex items-center gap-2 border-t border-white/8 px-3 py-2">
              <button className="icon-btn" aria-label="Skip back"><Icon name="chevron-left" size={15} /></button>
              <button className="grid h-9 w-9 place-items-center rounded-full bg-violet-500 text-white shadow-glow" aria-label="Play">
                <Icon name="play" size={15} className="ml-0.5" />
              </button>
              <button className="icon-btn" aria-label="Skip forward"><Icon name="chevron-right" size={15} /></button>
              <span className="ml-1 font-mono text-[10.5px] text-white/55">00:12.4 / 00:46.0</span>
              <div className="ml-auto flex items-center gap-1">
                <button className="icon-btn" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out"><Icon name="minus" size={13} /></button>
                <span className="text-[10px] font-semibold text-white/45">{zoom}×</span>
                <button className="icon-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} aria-label="Zoom in"><Icon name="plus" size={13} /></button>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
              <Icon name="layers" size={13} className="text-violet-300" />
              <h3 className="text-[12px] font-bold">Timeline</h3>
              <Badge tone="slate" className="ml-auto">{trimDuration}s trimmed</Badge>
            </div>
            <div className="overflow-x-auto scroll-thin">
              <div className="min-w-[520px] p-3" style={{ transform: `scale(${1})`, transformOrigin: 'left top' }}>
                {/* ruler */}
                <div className="mb-1 flex justify-between px-0.5 font-mono text-[8.5px] text-white/30">
                  {['0:00', '0:10', '0:20', '0:30', '0:40', '0:46'].map((t) => <span key={t}>{t}</span>)}
                </div>

                {/* video track */}
                <div className="mb-1.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold text-white/45"><Icon name="video" size={9} /> Video</div>
                  <div className="relative h-11 overflow-hidden rounded-lg border border-white/10 bg-ink-900">
                    <div className="flex h-full">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="relative flex-1 border-r border-ink-950/60">
                          <Thumb hue={(clip?.hue ?? 262) + i * 5} hue2={clip?.hue2 ?? 190} seed={`tl-${i}`} ratio="auto" rounded="rounded-none" showGrid={false} className="h-full w-full" person={i % 2 === 0} />
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-y-0 left-0 bg-ink-950/70" style={{ width: `${trimStart}%` }} />
                    <div className="absolute inset-y-0 right-0 bg-ink-950/70" style={{ width: `${100 - trimEnd}%` }} />
                    <div className="absolute inset-y-0 border-x-2 border-violet-400" style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }}>
                      <span className="absolute -top-0.5 left-0 h-2 w-1.5 rounded-sm bg-violet-400" />
                      <span className="absolute -top-0.5 right-0 h-2 w-1.5 rounded-sm bg-violet-400" />
                    </div>
                    <div className="absolute inset-y-0 w-px bg-rose-400" style={{ left: '38%' }} />
                  </div>
                </div>

                {/* subtitle track */}
                <div className="mb-1.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[9px] font-semibold text-white/45"><Icon name="captions" size={9} /> Captions</div>
                  <div className="flex gap-1">
                    {['Hook', 'Promise', 'Proof', 'Payoff', 'CTA'].map((w, i) => (
                      <div
                        key={w}
                        className="flex-1 truncate rounded border border-cyan-400/25 bg-cyan-500/15 px-1 py-1 text-center text-[8.5px] font-semibold text-cyan-100"
                        style={{ flexGrow: [3, 4, 3, 2, 2][i] }}
                      >
                        {w}
                      </div>
                    ))}
                  </div>
                </div>

                {/* audio tracks */}
                <div className="mb-1.5">
                  <div className="mb-0.5 flex items-center justify-between text-[9px] font-semibold text-white/45">
                    <span className="flex items-center gap-1"><Icon name="music" size={9} /> Audio</span>
                    <span className="font-mono text-white/25">-6.2 dB</span>
                  </div>
                  <div className="rounded-lg border border-white/8 bg-ink-900 px-2 py-1">
                    <Waveform bars={90} progress={0.38} height={30} hue={262} seed={4} />
                  </div>
                </div>
                <div>
                  <div className="mb-0.5 flex items-center justify-between text-[9px] font-semibold text-white/45">
                    <span className="flex items-center gap-1"><Icon name="music" size={9} /> Music · {music.split('—')[0].trim()}</span>
                    <span className="font-mono text-white/25">{musicVol}%</span>
                  </div>
                  <div className="rounded-lg border border-emerald-400/20 bg-emerald-500/[0.06] px-2 py-1">
                    <Waveform bars={90} progress={0.38} height={20} hue={152} seed={9} />
                  </div>
                </div>

                {/* trim sliders */}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <label className="text-[10px] text-white/45">
                    <span className="mb-1 flex justify-between"><span>In point</span><span className="font-mono text-white/70">{trimStart}%</span></span>
                    <input type="range" min="0" max={trimEnd - 5} value={trimStart} onChange={(e) => setTrimStart(Number(e.target.value))} className="w-full accent-violet-500" />
                  </label>
                  <label className="text-[10px] text-white/45">
                    <span className="mb-1 flex justify-between"><span>Out point</span><span className="font-mono text-white/70">{trimEnd}%</span></span>
                    <input type="range" min={trimStart + 5} max="100" value={trimEnd} onChange={(e) => setTrimEnd(Number(e.target.value))} className="w-full accent-violet-500" />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Inspector */}
        <div className="space-y-3">
          <Segmented
            className="w-full"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'trim', label: 'Trim', icon: 'scissors' },
              { value: 'frame', label: 'Frame', icon: 'crop' },
              { value: 'audio', label: 'Audio', icon: 'volume' },
              { value: 'brand', label: 'Brand', icon: 'image' },
            ]}
          />

          <section className="card p-3.5">
            {tab === 'trim' && (
              <div className="space-y-3">
                <h3 className="text-[12.5px] font-bold">Trim &amp; duration</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[['Start', clip?.start ?? '00:12'], ['End', clip?.end ?? '00:38']].map(([l, v]) => (
                    <Field key={l} label={l}><div className="input font-mono text-[12px]">{v}</div></Field>
                  ))}
                </div>
                <Field label="Clip length">
                  <div className="flex items-center gap-2">
                    <Progress value={((trimEnd - trimStart))} className="flex-1" />
                    <span className="text-[11px] font-bold">{trimDuration}s</span>
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setTrimStart(12); setTrimEnd(88); toast('Trim reset to AI cut points.', 'info'); }}>
                    <Icon name="refresh" size={13} /> Reset
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => toast('AI re-cut keeps the hook and payoff intact.', 'success')}>
                    <Icon name="wand" size={13} /> Smart cut
                  </button>
                </div>
                <InfoNote tone="violet" icon="sparkles">Smart cut preserves the spoken hook, removes dead air and keeps sentence boundaries intact.</InfoNote>
              </div>
            )}

            {tab === 'frame' && (
              <div className="space-y-3">
                <h3 className="text-[12.5px] font-bold">Crop &amp; resize</h3>
                <Field label="Aspect ratio">
                  <div className="grid grid-cols-2 gap-2">
                    {RATIOS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => setRatio(r.value)}
                        className={`rounded-xl border p-2 text-left transition ${ratio === r.value ? 'border-violet-400/50 bg-violet-500/12' : 'border-white/10 hover:border-white/25'}`}
                      >
                        <div className="text-[12px] font-bold">{r.label}</div>
                        <div className="text-[9px] text-white/40">{r.hint}</div>
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Zoom"><input type="range" min="80" max="140" defaultValue="100" className="mt-2 w-full accent-violet-500" /></Field>
                  <Field label="Rotate"><Select defaultValue="0°"><option>0°</option><option>90°</option><option>180°</option></Select></Field>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-2">
                  <span className="text-[11px] font-semibold">Speaker tracking</span>
                  <Switch checked onChange={() => {}} label="Speaker tracking" />
                </div>
              </div>
            )}

            {tab === 'audio' && (
              <div className="space-y-3">
                <h3 className="text-[12.5px] font-bold">Music &amp; voice</h3>
                <Field label="Background music">
                  <Select value={music} onChange={(e) => setMusic(e.target.value)}>
                    {['Midnight Drive — 92 BPM', 'Neon Pulse — 110 BPM', 'Soft Focus — 84 BPM', 'No music'].map((m) => <option key={m}>{m}</option>)}
                  </Select>
                </Field>
                <Field label={`Music volume · ${musicVol}%`}>
                  <input type="range" min="0" max="100" value={musicVol} onChange={(e) => setMusicVol(Number(e.target.value))} className="mt-2 w-full accent-emerald-400" />
                </Field>
                <Field label={`Voiceover · ${voiceVol}%`}>
                  <input type="range" min="0" max="100" value={voiceVol} onChange={(e) => setVoiceVol(Number(e.target.value))} className="mt-2 w-full accent-violet-500" />
                </Field>
                <button
                  className={`btn w-full ${recording ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => { setRecording((r) => !r); toast(recording ? 'Voiceover recorded (00:14).' : 'Recording voiceover…', recording ? 'success' : 'info'); }}
                >
                  <Icon name={recording ? 'pause' : 'mic'} size={14} /> {recording ? 'Stop recording' : 'Record voiceover'}
                </button>
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-2">
                  <span className="text-[11px] font-semibold">Duck music under voice</span>
                  <Switch checked onChange={() => {}} label="Duck music" />
                </div>
              </div>
            )}

            {tab === 'brand' && (
              <div className="space-y-3">
                <h3 className="text-[12.5px] font-bold">Branding &amp; watermark</h3>
                <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-2">
                  <span className="text-[11px] font-semibold">Show watermark</span>
                  <Switch checked={watermark} onChange={setWatermark} label="Watermark" />
                </div>
                <Field label="Watermark text">
                  <input className="input" value={watermarkText} onChange={(e) => setWatermarkText(e.target.value)} maxLength={24} />
                </Field>
                <Field label="Position">
                  <Select value={corner} onChange={(e) => setCorner(e.target.value)}>
                    <option value="top-left">Top left</option>
                    <option value="top-right">Top right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                  </Select>
                </Field>
                <button className="btn btn-secondary btn-sm w-full" onClick={() => toast('Logo upload accepts PNG or SVG up to 1 MB.', 'info')}>
                  <Icon name="upload" size={13} /> Upload logo
                </button>
                <InfoNote tone="cyan" icon="image">Branding is applied to every export, including clips published through Buffer.</InfoNote>
              </div>
            )}
          </section>

          <div className="card p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/60">Estimated export</span>
              <span className="text-[11px] font-bold">24 MB · MP4</span>
            </div>
            <Progress value={100} className="mt-2" />
            <p className="mt-1.5 text-[10px] text-white/40">H.264 · 1080×1920 · 30 fps · captions burned in</p>
            <button className="btn btn-primary mt-2.5 w-full" onClick={() => { toast('Export queued for Buffer publishing.', 'success'); navigate('/composer'); }}>
              <Icon name="send" size={14} /> Continue to publishing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
