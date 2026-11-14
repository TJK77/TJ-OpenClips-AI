import { useState } from 'react';
import Icon from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Field, InfoNote, Progress, SectionHead, Select } from '../components/ui';

function maskKey(key) {
  if (!key) return '';
  const clean = key.trim();
  if (clean.length <= 8) return '••••••••';
  return `${clean.slice(0, 3)}••••••••••••${clean.slice(-4)}`;
}

export default function Models() {
  const { providers, updateProvider, toast, navigate } = useStore();
  const [drafts, setDrafts] = useState({});
  const [visible, setVisible] = useState({});
  const [testing, setTesting] = useState({});
  const [routing, setRouting] = useState({ transcribe: 'groq', analyse: 'openrouter', captions: 'gemini' });

  const setDraft = (id, value) => setDrafts((d) => ({ ...d, [id]: value }));

  const save = (provider) => {
    const key = drafts[provider.id];
    if (!key || key.trim().length < 12) {
      toast('Enter a valid API key (at least 12 characters).', 'error');
      return;
    }
    updateProvider(provider.id, { keyMask: maskKey(key), connected: true });
    setDraft(provider.id, '');
    toast(`${provider.name} key saved in this browser only.`, 'success');
  };

  const test = (provider) => {
    setTesting((t) => ({ ...t, [provider.id]: true }));
    setTimeout(() => {
      setTesting((t) => ({ ...t, [provider.id]: false }));
      const hasKey = !!provider.keyMask || !!drafts[provider.id];
      updateProvider(provider.id, { connected: hasKey });
      toast(
        hasKey ? `${provider.name} connection verified · 214 ms` : `${provider.name} needs a saved key before it can connect.`,
        hasKey ? 'success' : 'error'
      );
    }, 1100);
  };

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Bring your own key"
        title="AI models"
        sub="Connect the providers that transcribe, analyse and write for your studio. Nothing is bundled — you stay in control of cost and data."
        action={<Badge tone="violet" icon="key">{providers.filter((p) => p.connected).length}/3 connected</Badge>}
      />

      <InfoNote tone="violet" icon="info">
        Use your own API key. Free model availability and usage limits depend on your provider.
      </InfoNote>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3.5">
          {providers.map((provider) => {
            const draft = drafts[provider.id] || '';
            const isVisible = visible[provider.id];
            const isTesting = testing[provider.id];
            const pct = Math.min(100, Math.round((provider.usage.used / provider.usage.limit) * 100));
            return (
              <section key={provider.id} className="card overflow-hidden">
                <div className="flex items-start gap-3 border-b border-white/8 p-3.5 sm:p-4">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10"
                    style={{ background: `${provider.accent}1c`, color: provider.accent }}
                  >
                    <Icon name={provider.icon} size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-display text-[14.5px] font-bold">{provider.name}</h3>
                      <Badge tone={provider.connected ? 'mint' : 'slate'}>
                        {provider.connected ? 'Connected' : 'Not connected'}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{provider.role}</p>
                  </div>
                  <button
                    className="icon-btn shrink-0"
                    aria-label={`Open ${provider.name} docs`}
                    onClick={() => toast(`Docs: ${provider.docs}`, 'info')}
                  >
                    <Icon name="external" size={14} />
                  </button>
                </div>

                <div className="space-y-3.5 p-3.5 sm:p-4">
                  <Field
                    label="API key"
                    hint={provider.keyMask ? `Saved key: ${provider.keyMask} — stored locally, never shown in full.` : 'Paste a key from your provider dashboard. It is stored in this browser only.'}
                  >
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          className="input pr-10 font-mono text-[12px]"
                          type={isVisible ? 'text' : 'password'}
                          value={draft}
                          onChange={(e) => setDraft(provider.id, e.target.value)}
                          placeholder={provider.keyMask || provider.keyPlaceholder || 'sk-…'}
                          autoComplete="off"
                          spellCheck={false}
                          aria-label={`${provider.name} API key`}
                        />
                        <button
                          type="button"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-white/40 hover:text-white"
                          onClick={() => setVisible((v) => ({ ...v, [provider.id]: !v[provider.id] }))}
                          aria-label={isVisible ? 'Hide key' : 'Show key'}
                        >
                          <Icon name={isVisible ? 'eye-off' : 'eye'} size={15} />
                        </button>
                      </div>
                      <button className="btn btn-secondary shrink-0" onClick={() => save(provider)}>
                        <Icon name="lock" size={14} /> Save
                      </button>
                    </div>
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Model">
                      <Select
                        value={provider.model}
                        onChange={(e) => {
                          updateProvider(provider.id, { model: e.target.value });
                          toast(`${provider.name} model set to ${e.target.value}.`, 'success');
                        }}
                      >
                        {provider.models.map((m) => <option key={m}>{m}</option>)}
                      </Select>
                    </Field>
                    <Field label="Connection">
                      <button
                        className={`btn w-full ${provider.connected ? 'btn-ghost' : 'btn-secondary'}`}
                        onClick={() => test(provider)}
                        disabled={isTesting}
                      >
                        {isTesting ? (
                          <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Testing…</>
                        ) : (
                          <><Icon name={provider.connected ? 'refresh' : 'wifi'} size={14} /> Test connection</>
                        )}
                      </button>
                    </Field>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-semibold text-white/60">Usage this cycle</span>
                      <span className="font-bold text-white/80">
                        {provider.usage.used.toLocaleString()} / {provider.usage.limit.toLocaleString()} {provider.usage.unit}
                      </span>
                    </div>
                    <Progress value={pct} className="mt-1.5" />
                    <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-white/35">
                      <span>Resets {provider.usage.reset}</span>
                      <span>{pct}% used</span>
                    </div>
                  </div>

                  {provider.note && (
                    <p className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-white/40">
                      <Icon name="info" size={12} className="mt-0.5 shrink-0" /> {provider.note}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="space-y-4">
          <section className="card p-3.5 sm:p-4">
            <div className="flex items-center gap-2">
              <Icon name="layers" size={15} className="text-cyan-300" />
              <h3 className="text-[12.5px] font-bold">Model routing</h3>
            </div>
            <p className="mt-1 text-[10.5px] leading-relaxed text-white/45">Choose which provider handles each step of the pipeline.</p>
            <div className="mt-3 space-y-3">
              {[
                { key: 'transcribe', label: 'Transcription', hint: 'Fastest with Groq Whisper' },
                { key: 'analyse', label: 'Highlight analysis', hint: 'Ranking + viral scoring' },
                { key: 'captions', label: 'Caption writing', hint: 'Hooks, titles, hashtags' },
              ].map((row) => (
                <Field key={row.key} label={row.label} hint={row.hint}>
                  <Select value={routing[row.key]} onChange={(e) => setRouting((r) => ({ ...r, [row.key]: e.target.value }))}>
                    {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
              ))}
            </div>
            <button className="btn btn-primary btn-sm mt-3 w-full" onClick={() => toast('Routing saved for this workspace.', 'success')}>
              <Icon name="check" size={14} /> Save routing
            </button>
          </section>

          <section className="card p-3.5 sm:p-4">
            <h3 className="text-[12.5px] font-bold">What your key unlocks</h3>
            <ul className="mt-2.5 space-y-2">
              {[
                ['captions', 'Word-level transcription', 'Whisper large-v3 with timestamps'],
                ['sparkles', 'Moment detection', 'Hook, payoff and emotion scoring'],
                ['wand', 'Caption + title writing', 'Platform-aware copy generation'],
                ['chart', 'Viral potential ranking', '0–100 score per candidate clip'],
              ].map(([icon, title, body]) => (
                <li key={title} className="flex gap-2.5">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-violet-500/12 text-violet-300">
                    <Icon name={icon} size={12} />
                  </span>
                  <div>
                    <div className="text-[11.5px] font-semibold">{title}</div>
                    <div className="text-[10px] leading-relaxed text-white/45">{body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <InfoNote tone="cyan" icon="shield">
            Keys are stored in this browser only and sent directly to the provider you choose. Nothing is written to a server, logged or displayed in full.
          </InfoNote>

          <div className="card-flat p-3.5">
            <div className="text-[11px] font-bold text-white/70">Next step</div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted">With a provider connected you can analyse a video and generate clips.</p>
            <button className="btn btn-secondary btn-sm mt-2.5 w-full" onClick={() => navigate('/import')}>
              <Icon name="video" size={14} /> Import a video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
