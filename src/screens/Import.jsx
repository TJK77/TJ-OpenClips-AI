import { useEffect, useRef, useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Field, InfoNote, Progress, SectionHead, Segmented, Select, TextInput } from '../components/ui';
import { Thumb } from '../components/Thumb';

const LANGUAGES = [
  'English (US)', 'English (UK)', 'Spanish', 'French', 'German', 'Portuguese (BR)',
  'Italian', 'Dutch', 'Hindi', 'Arabic', 'Japanese', 'Korean', 'Mandarin', 'Turkish',
];

const FORMATS = ['MP4', 'MOV', 'MKV', 'WEBM', 'AVI', 'M4V'];

function bytes(n) {
  if (!n) return '0 MB';
  const mb = n / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

export default function ImportVideo() {
  const { navigate, toast, projects, clips, uploadVideo, importVideoUrl, startAnalysis } = useStore();
  const [mode, setMode] = useState('link');
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [drag, setDrag] = useState(false);
  const [title, setTitle] = useState('How I built a 7-figure creator business in 12 months');
  const [projectName, setProjectName] = useState('Creator Business — Episode 42');
  const [language, setLanguage] = useState('English (US)');
  const [clipLength, setClipLength] = useState('Auto (15–60s)');
  const [targetClips, setTargetClips] = useState('8 clips');
  const [captionStyle, setCaptionStyle] = useState('Bold Viral');
  const [fetching, setFetching] = useState(false);
  const inputRef = useRef(null);
  const rawFile = useRef(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const startUpload = (f) => {
    if (f.size > 512 * 1024 * 1024) {
      toast('That file is larger than the 512 MB upload limit. Trim it first or paste a link.', 'error');
      return;
    }
    rawFile.current = f;
    setFile({ name: f.name, size: f.size, type: f.type || 'video/mp4' });
    setUploadPct(0);
    setUploading(false);
    if (!title || title.startsWith('How I built')) setTitle(f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) startUpload(f);
  };

  const fetchLink = () => {
    if (!/^https?:\/\/.+\..+/.test(url.trim())) {
      toast('Enter a valid video URL, for example a YouTube or Drive link.', 'error');
      return;
    }
    setFetching(false);
    toast('Link accepted — the server downloads and validates it when you analyse.', 'info');
  };

  const ready = mode === 'link' ? /^https?:\/\/.+\..+/.test(url.trim()) : !!file && !uploading;

  const analyze = async (localMode = false) => {
    if (!ready || busy) {
      toast(mode === 'link' ? 'Add a video link before analysing.' : 'Choose a video file before analysing.', 'error');
      return;
    }
    setBusy(true);
    const meta = {
      title: title.trim() || projectName.trim() || 'Untitled video',
      project: projectName.trim() || title.trim(),
      language,
    };
    try {
      let videoId;
      if (mode === 'link') {
        const result = await importVideoUrl({ url: url.trim(), ...meta });
        videoId = result.video.id;
      } else {
        setUploading(true);
        setUploadPct(0);
        const result = await uploadVideo(rawFile.current, meta, (pct) => setUploadPct(pct));
        videoId = result.video.id;
      }
      const wanted = Number((String(targetClips).match(/\d+/) || [8])[0]) || 8;
      await startAnalysis({ videoId, aspect: '9:16', targetClips: wanted, local: localMode });
      toast(
        localMode
          ? 'Queued — rendering with local speech detection. No AI key is used.'
          : 'Video queued — the server is running the real pipeline.',
        'info'
      );
      navigate('/analyze');
    } catch (error) {
      toast(error.message, 'error');
    } finally {
      setBusy(false);
      setUploading(false);
    }
  };

  const recentSources = projects.slice(0, 3);

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Step 1 of 6"
        title="Import a long video"
        sub="Paste a link or upload a file. OpenClips finds the moments worth clipping and turns them into vertical shorts."
        action={<Badge tone="violet" icon="zap">Free processing</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <div className="space-y-5">
          <div className="card p-4 sm:p-5">
            <Segmented
              className="w-full"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'link', label: 'Paste video link', icon: 'link' },
                { value: 'upload', label: 'Upload video', icon: 'upload' },
              ]}
            />

            {mode === 'link' ? (
              <div className="mt-4 space-y-3">
                <Field label="Video URL" hint="YouTube, Vimeo, Google Drive, Dropbox, direct MP4 or a podcast episode link.">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <TextInput
                      icon="link"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=…"
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                    />
                    <button className="btn btn-secondary shrink-0" onClick={fetchLink} disabled={fetching}>
                      {fetching ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Icon name="refresh" size={15} />}
                      {fetching ? 'Fetching' : 'Fetch'}
                    </button>
                  </div>
                </Field>
                <div className="flex flex-wrap items-center gap-1.5">
                  {['YouTube', 'Vimeo', 'Drive', 'Dropbox', 'Podcast RSS'].map((s) => (
                    <span key={s} className="chip">{s}</span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={onDrop}
                  onClick={() => inputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                  className={`relative flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed px-5 py-9 text-center transition ${
                    drag ? 'border-violet-400 bg-violet-500/10' : 'border-white/14 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && startUpload(e.target.files[0])}
                  />
                  <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-violet-500/15 text-violet-200">
                    <Icon name="upload" size={22} />
                  </span>
                  <div className="text-[13.5px] font-bold">Drag & drop your video</div>
                  <p className="max-w-xs text-[11.5px] leading-relaxed text-muted">
                    or <span className="font-semibold text-violet-300">browse files</span> from your device. Up to 2 GB per video.
                  </p>
                  <div className="mt-1 flex flex-wrap justify-center gap-1">
                    {FORMATS.map((f) => (
                      <span key={f} className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9.5px] font-bold text-white/55">{f}</span>
                    ))}
                  </div>
                </div>

                {file && (
                  <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-300"><Icon name="video" size={17} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-semibold">{file.name}</div>
                        <div className="text-[10.5px] text-white/45">{bytes(file.size)} · {uploading ? `Uploading ${uploadPct}%` : 'Upload complete'}</div>
                      </div>
                      <button className="icon-btn" aria-label="Remove file" onClick={(e) => { e.stopPropagation(); setFile(null); setUploadPct(0); }}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                    <Progress value={uploadPct} className="mt-2.5" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Icon name="sliders" size={16} className="text-violet-300" />
              <h3 className="text-[13px] font-bold">Project details</h3>
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Video title" className="sm:col-span-2">
                <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name this video" />
              </Field>
              <Field label="Project name">
                <TextInput value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project" />
              </Field>
              <Field label="Spoken language" hint="Improves transcription accuracy.">
                <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
                </Select>
              </Field>
              <Field label="Clip length">
                <Select value={clipLength} onChange={(e) => setClipLength(e.target.value)}>
                  {['Auto (15–60s)', 'Short (10–25s)', 'Medium (25–45s)', 'Long (45–90s)'].map((o) => <option key={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Clips to generate">
                <Select value={targetClips} onChange={(e) => setTargetClips(e.target.value)}>
                  {['4 clips', '8 clips', '12 clips', '20 clips'].map((o) => <option key={o}>{o}</option>)}
                </Select>
              </Field>
              <Field label="Default caption style" className="sm:col-span-2">
                <Select value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
                  {['Bold Viral', 'Karaoke Word', 'Minimal White', 'Yellow Keyword', 'Podcast Pro'].map((o) => <option key={o}>{o}</option>)}
                </Select>
              </Field>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
            <button className="btn btn-primary btn-lg w-full sm:w-auto" onClick={() => analyze()} disabled={busy}>
              <Icon name="wand" size={17} /> Analyze video
              <Icon name="arrow-right" size={16} />
            </button>
            <button className="btn btn-secondary btn-lg w-full sm:w-auto" onClick={() => analyze(true)} disabled={busy}>
              <Icon name="video" size={17} /> Render without AI
            </button>
            <p className="text-[11px] leading-relaxed text-muted sm:max-w-sm">
              <strong className="text-white/70">Analyze video</strong> uses your configured AI provider key for transcription and
              moment selection. <strong className="text-white/70">Render without AI</strong> skips transcription and cuts clips at
              detected speech boundaries — real rendered MP4s, no key required.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-white/45">Preview</span>
              <Badge tone="slate" icon="video">{mode === 'link' ? 'Source link' : 'Local file'}</Badge>
            </div>
            <div className="p-3">
              <Thumb ratio="16 / 9" seed={url || file?.name || 'import'} hue={262} hue2={190} rounded="rounded-xl">
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-ink-950/50 backdrop-blur-md">
                    <Icon name="play" size={16} className="ml-0.5" />
                  </span>
                </div>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2 pt-6">
                  <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold">42:18</span>
                  <span className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold">1080p</span>
                </div>
              </Thumb>
              <div className="mt-2.5 px-0.5">
                <div className="line-clamp-2 text-[12.5px] font-semibold leading-snug">{title || 'Untitled video'}</div>
                <div className="mt-1 flex items-center gap-2 text-[10.5px] text-white/45">
                  <Icon name="globe" size={11} /> {language}
                  <span>·</span>
                  <span>2.4 GB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-3.5">
            <div className="mb-2.5 flex items-center gap-2">
              <Icon name="folder" size={14} className="text-cyan-300" />
              <span className="text-[11.5px] font-bold">Recent sources</span>
              <button className="ml-auto text-[10.5px] font-semibold text-violet-300" onClick={() => navigate('/videos')}>View all</button>
            </div>
            <div className="space-y-1.5">
              {recentSources.map((p) => (
                <button key={p.id} className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition hover:bg-white/6" onClick={() => navigate('/videos')}>
                  <Thumb hue={p.hue} hue2={p.hue2} seed={p.id} ratio="16 / 9" rounded="rounded-md" className="w-12 shrink-0" showGrid={false} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[11.5px] font-medium">{p.title}</div>
                    <div className="text-[10px] text-white/40">{p.duration} · {p.clips} clips</div>
                  </div>
                  <Icon name="chevron-right" size={13} className="shrink-0 text-white/25" />
                </button>
              ))}
            </div>
          </div>

          <InfoNote tone="cyan" icon="shield">
            Videos are processed for this session only. Your AI keys never leave the browser and are never shown in the UI.
          </InfoNote>

          <div className="card-flat p-3.5">
            <div className="flex items-center gap-2 text-[11px] font-bold text-white/70">
              <Icon name="clock" size={13} /> Next: AI model check
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
              Analysis needs one connected provider. Groq handles transcription fastest; OpenRouter or Gemini can rank highlights.
            </p>
            <button className="btn btn-ghost btn-sm mt-2 w-full" onClick={() => navigate('/models')}>
              <Icon name="cpu" size={14} /> Open AI models
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
