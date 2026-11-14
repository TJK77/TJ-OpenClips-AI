import { useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, Field, InfoNote, Modal, SectionHead, Switch } from '../components/ui';

const DESTINATIONS = [
  { id: 'instagram', name: 'Instagram Reels', note: 'Business or Creator account required' },
  { id: 'tiktok', name: 'TikTok', note: 'Direct publish or reminder' },
  { id: 'youtube', name: 'YouTube Shorts', note: 'Verified channel required' },
  { id: 'linkedin', name: 'LinkedIn', note: 'Company page or personal profile' },
  { id: 'x', name: 'X (Twitter)', note: 'Video up to 2:20 on free tier' },
  { id: 'facebook', name: 'Facebook Reels', note: 'Page with Reels access' },
  { id: 'threads', name: 'Threads', note: 'Text + video posts' },
  { id: 'pinterest', name: 'Pinterest', note: 'Video pins, Idea Pins' },
];

export default function Buffer() {
  const { buffer, connectBuffer, disconnectBuffer, toggleChannel, navigate, toast, posts } = useStore();
  const [showConnect, setShowConnect] = useState(false);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const connected = buffer.channels.filter((c) => c.connected);
  const queued = posts.filter((p) => p.status === 'scheduled').length;

  const doConnect = async () => {
    if (token.trim().length < 8) {
      toast('Enter a Buffer access token with at least 8 characters.', 'error');
      return;
    }
    try {
      const result = await connectBuffer(token.trim());
      setToken('');
      setShowConnect(false);
      toast(
        result?.channels?.length
          ? `Buffer connected — ${result.channels.length} channel${result.channels.length === 1 ? '' : 's'} synced.`
          : 'Buffer connected. That account has no channels attached yet.',
        'success'
      );
    } catch (error) {
      toast(error.message, 'error');
    }
  };

  return (
    <div className="space-y-5">
      <SectionHead
        eyebrow="Step 09 · Publishing"
        title="Social accounts"
        sub="Buffer handles scheduling and delivery. Your AI provider handles analysis and caption generation — the two stay independent."
        action={
          <Badge tone={buffer.connected ? 'mint' : 'slate'} icon={buffer.connected ? 'check' : 'alert'}>
            {buffer.connected ? 'Connected' : 'Not connected'}
          </Badge>
        }
      />

      {/* Buffer hero card */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0B1226] via-[#0A0F20] to-[#07101F] p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/12 bg-white/[0.06] shadow-glow">
              <BrandIcon name="buffer" size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-bold">Buffer</h2>
                <Badge tone={buffer.connected ? 'mint' : 'slate'}>{buffer.connected ? 'Active' : 'Inactive'}</Badge>
              </div>
              <p className="text-[11.5px] text-muted">Publishing &amp; scheduling engine · {connected.length} channels connected</p>
            </div>
          </div>
          <div className="sm:ml-auto flex flex-wrap items-center gap-2">
            {buffer.connected ? (
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowConnect(true)}>
                  <Icon name="refresh" size={13} /> Re-authorise
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => {
                    disconnectBuffer();
                    toast('Buffer disconnected. Scheduled posts moved to drafts.', 'error');
                  }}
                >
                  <Icon name="logout" size={13} /> Disconnect
                </button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowConnect(true)}>
                <Icon name="link" size={15} /> Connect Buffer
              </button>
            )}
          </div>
        </div>

        <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { label: 'Workspace', value: buffer.workspace },
            { label: 'Access token', value: buffer.tokenMask },
            { label: 'Queued posts', value: `${queued} scheduled` },
          ].map((row) => (
            <div key={row.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
              <div className="text-[9.5px] uppercase tracking-wider text-white/40">{row.label}</div>
              <div className="mt-0.5 truncate font-mono text-[11.5px] font-semibold text-white/85">{row.value}</div>
            </div>
          ))}
        </div>

        <InfoNote tone="violet" icon="shield" className="relative mt-3">
          Credentials are stored masked and never displayed in full. Buffer manages publishing and scheduling; the AI provider you configure handles video analysis and content generation.
        </InfoNote>
      </section>

      {/* Channels */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-[15px] font-bold">Connected channels</h2>
            <p className="text-[11px] text-muted">Channels are provided by Buffer and depend on your account eligibility.</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => toast('Channel sync requested from Buffer.', 'info')}>
            <Icon name="refresh" size={13} /> Sync
          </button>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          {buffer.channels.map((ch) => (
            <div
              key={ch.id}
              className={`card flex items-center gap-3 p-3 transition ${ch.connected ? '' : 'opacity-60'}`}
            >
              <div
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10"
                style={{ background: `hsl(${ch.hue} 80% 55% / 0.16)`, color: `hsl(${ch.hue} 90% 72%)` }}
              >
                <BrandIcon name={ch.id} size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[12.5px] font-bold">{ch.name}</span>
                  <span className={`dot ${ch.connected ? 'dot-live' : 'bg-white/25'}`} />
                </div>
                <div className="truncate text-[10px] text-white/45">{ch.handle} · {ch.audience}</div>
                <div className="truncate text-[9.5px] text-white/30">{ch.format}</div>
              </div>
              <Switch checked={ch.connected} onChange={() => {
                toggleChannel(ch.id);
                toast(`${ch.name} ${ch.connected ? 'disconnected' : 'connected'} in Buffer.`, ch.connected ? 'error' : 'success');
              }} label={ch.name} />
            </div>
          ))}
        </div>
      </section>

      {/* Supported destinations */}
      <section className="card p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <Icon name="globe" size={14} className="text-cyan-300" />
          <h2 className="font-display text-[14px] font-bold">Supported destinations</h2>
          <Badge tone="slate" className="ml-auto">via Buffer</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted">
          Availability depends on Buffer's current channel support, your connected account type and each platform's publishing rules.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {DESTINATIONS.map((d) => (
            <div key={d.id} className="rounded-xl border border-white/8 bg-white/[0.02] p-2.5">
              <div className="flex items-center gap-1.5">
                <BrandIcon name={d.id} size={14} className="text-white/70" />
                <span className="truncate text-[11px] font-semibold">{d.name}</span>
              </div>
              <p className="mt-1 text-[9px] leading-snug text-white/35">{d.note}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button className="btn btn-primary flex-1" onClick={() => navigate('/composer')} disabled={!connected.length}>
          <Icon name="send" size={15} /> Compose a post
        </button>
        <button className="btn btn-secondary flex-1" onClick={() => navigate('/queue')}>
          <Icon name="clock" size={15} /> View publishing queue
        </button>
      </div>

      <Modal open={showConnect} onClose={() => setShowConnect(false)} title="Connect Buffer" subtitle="Paste a personal access token from your Buffer developer settings.">
        <div className="space-y-3">
          <Field label="Buffer access token" hint="Stored masked · never shown in full after saving">
            <div className="relative">
              <input
                className="input pr-20"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="1/abcdef1234567890…"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowToken((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-[10px] font-bold text-violet-300 hover:bg-white/5">
                {showToken ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <InfoNote tone="cyan" icon="lock">
            Tokens are stored locally in this workspace demo. In production, keep them in server-side secrets and never in client storage.
          </InfoNote>
          <div className="flex gap-2">
            <button className="btn btn-secondary flex-1" onClick={() => setShowConnect(false)}>Cancel</button>
            <button className="btn btn-primary flex-1" onClick={doConnect}><Icon name="link" size={14} /> Connect</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
