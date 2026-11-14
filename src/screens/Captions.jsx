import { useMemo, useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Field, InfoNote, SectionHead, Segmented, Select } from '../components/ui';
import { CaptionPreview, Thumb } from '../components/Thumb';
import { CAPTION_STYLES } from '../lib/data';

const FONTS = ['Inter', 'Sora', 'Poppins', 'Montserrat', 'Georgia', 'Arial Black'];
const ANIMATIONS = ['Pop', 'Word highlight', 'Fade', 'Slide up', 'Bounce', 'Typewriter'];
const POSITIONS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
];

function toPreviewStyle(caption, style) {
  const box = style ? style.box : caption.position === 'boxed';
  return {
    font: caption.font,
    weight: caption.weight,
    size: caption.size,
    color: caption.color,
    highlight: caption.highlight,
    bg: caption.background,
    box,
    caps: style ? style.caps : ['bold-viral', 'karaoke', 'tiktok', 'animated-pop', 'yellow-keyword'].includes(caption.styleId),
    stroke: style ? style.stroke : true,
    position: caption.position === 'boxed' ? 'bottom' : caption.position,
    gradient: style ? style.id === 'gradient-pop' : caption.styleId === 'gradient-pop',
  };
}

export default function Captions() {
  const { caption, setCaption, applyCaptionToAll, toast, navigate, clips } = useStore();
  const activeStyle = CAPTION_STYLES.find((s) => s.id === caption.styleId) || CAPTION_STYLES[0];
  const previewStyle = useMemo(() => toPreviewStyle(caption, activeStyle), [caption, activeStyle]);
  const [sample, setSample] = useState(0);

  const samples = [
    'Your first three seconds decide everything',
    'Confusion is a retention mechanic',
    'Three seconds to promise, eight to prove it',
  ];

  const chooseStyle = (style) => {
    setCaption({
      styleId: style.id,
      font: style.font,
      weight: style.weight,
      size: style.size,
      color: style.color,
      highlight: style.highlight,
      background: style.bg,
      position: style.position,
      animation: style.animation,
    });
  };

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Step 05 · Caption studio"
        title="Caption style studio"
        sub="Ten broadcast-ready caption systems. Pick one, tune it, then apply it across every clip in the project."
        action={<Badge tone="violet" icon="captions">{CAPTION_STYLES.length} styles</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_1.15fr]">
        {/* Preview */}
        <div className="space-y-3">
          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] font-semibold text-white/40">Live preview · 9:16</span>
              <Badge tone="slate" className="ml-auto">{caption.timing} timing</Badge>
            </div>
            <div className="relative mx-auto w-full max-w-[320px] p-3">
              <div className="relative overflow-hidden rounded-2xl border border-white/10">
                <Thumb hue={activeStyle.hue} hue2={190} seed="caption-preview" ratio="9 / 16" rounded="rounded-2xl" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25" />
                <CaptionPreview text={samples[sample]} style={previewStyle} />
                <div className="absolute inset-x-0 top-2 flex justify-between px-2.5">
                  <span className="rounded bg-black/55 px-1.5 py-0.5 text-[9px] font-bold backdrop-blur">@openclips.ai</span>
                  <span className="rounded bg-violet-500/80 px-1.5 py-0.5 text-[9px] font-bold">{activeStyle.name}</span>
                </div>
                <div className="absolute inset-x-0 bottom-2 flex items-center justify-between px-2.5">
                  <span className="text-[9px] font-semibold text-white/60">00:04</span>
                  <span className="text-[9px] font-semibold text-white/60">00:38</span>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {samples.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setSample(i)}
                    className={`h-1.5 rounded-full transition-all ${i === sample ? 'w-6 bg-violet-400' : 'w-1.5 bg-white/20'}`}
                    aria-label={`Sample line ${i + 1}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-white/8 p-2.5">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => { applyCaptionToAll(); toast(`“${activeStyle.name}” applied to all ${clips.length} clips.`, 'success'); }}>
                <Icon name="layers" size={13} /> Apply to all clips
              </button>
              <button className="btn btn-primary btn-sm flex-1" onClick={() => toast('Caption style saved to your library.', 'success')}>
                <Icon name="check" size={13} /> Save style
              </button>
            </div>
          </section>

          <InfoNote tone="cyan" icon="info">
            Captions are generated from word-level timestamps, so highlighting follows the speaker exactly — no manual retiming.
          </InfoNote>
        </div>

        {/* Controls + gallery */}
        <div className="space-y-4">
          <section className="card p-3.5 sm:p-4">
            <div className="flex items-center gap-2">
              <Icon name="sliders" size={14} className="text-violet-300" />
              <h3 className="text-[12.5px] font-bold">Style controls</h3>
              <span className="ml-auto text-[10px] text-white/40">{activeStyle.name}</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Font">
                <Select value={caption.font} onChange={(e) => setCaption({ font: e.target.value })}>
                  {FONTS.map((f) => <option key={f}>{f}</option>)}
                </Select>
              </Field>
              <Field label={`Font size · ${caption.size}px`}>
                <input
                  type="range"
                  min="14"
                  max="40"
                  value={caption.size}
                  onChange={(e) => setCaption({ size: Number(e.target.value) })}
                  className="mt-2.5 w-full accent-violet-500"
                  aria-label="Font size"
                />
              </Field>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2.5">
              {[
                { key: 'color', label: 'Text' },
                { key: 'highlight', label: 'Highlight' },
                { key: 'background', label: 'Background' },
              ].map((c) => (
                <Field key={c.key} label={c.label}>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={caption[c.key]?.startsWith('#') ? caption[c.key] : '#0A0F20'}
                      onChange={(e) => setCaption({ [c.key]: e.target.value })}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-white/12 bg-transparent p-0.5"
                      aria-label={`${c.label} colour`}
                    />
                    <span className="truncate font-mono text-[10px] text-white/45">{caption[c.key]?.startsWith('#') ? caption[c.key] : 'none'}</span>
                  </div>
                </Field>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Position">
                <Segmented
                  className="w-full"
                  value={caption.position}
                  onChange={(v) => setCaption({ position: v })}
                  options={POSITIONS}
                />
              </Field>
              <Field label="Animation">
                <Select value={caption.animation} onChange={(e) => setCaption({ animation: e.target.value })}>
                  {ANIMATIONS.map((a) => <option key={a}>{a}</option>)}
                </Select>
              </Field>
            </div>

            <div className="mt-3">
              <Field label="Subtitle timing">
                <Segmented
                  className="w-full"
                  value={caption.timing}
                  onChange={(v) => setCaption({ timing: v })}
                  options={[
                    { value: 'word', label: 'Word' },
                    { value: 'phrase', label: 'Phrase' },
                    { value: 'line', label: 'Line' },
                  ]}
                />
              </Field>
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-2.5 py-2">
              <Icon name="wand" size={13} className="text-violet-300" />
              <span className="text-[10.5px] text-white/55">Word-level emphasis follows loudness and punctuation.</span>
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[12.5px] font-bold">Style library</h3>
              <span className="text-[10px] text-white/40">Tap to apply</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {CAPTION_STYLES.map((style) => {
                const isActive = caption.styleId === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => chooseStyle(style)}
                    className={`group overflow-hidden rounded-2xl border text-left transition ${
                      isActive ? 'border-violet-400/60 ring-2 ring-violet-500/30' : 'border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="relative">
                      <Thumb hue={style.hue} hue2={(style.hue + 70) % 360} seed={style.id} ratio="16 / 10" rounded="rounded-none" showGrid={false} person={false} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute inset-x-0 bottom-[22%] px-2">
                        <CaptionPreview text="Hook them in 3s" style={{ ...style, size: Math.max(11, style.size * 0.42), position: 'center' }} compact />
                      </div>
                      {isActive && (
                        <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-violet-500 text-white">
                          <Icon name="check" size={11} strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <div className="p-2">
                      <div className="truncate text-[11px] font-bold">{style.name}</div>
                      <div className="truncate text-[9px] text-white/40">{style.tag} · {style.animation}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <button className="btn btn-primary w-full" onClick={() => navigate('/editor')}>
            <Icon name="scissors" size={15} /> Continue to editor
          </button>
        </div>
      </div>
    </div>
  );
}
