import { useMemo, useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { useStore } from '../lib/store';
import { Badge, EmptyState, InfoNote, Modal, SectionHead, Switch } from '../components/ui';

const TABS = [
  { id: 'profile', label: 'Profile', icon: 'user' },
  { id: 'security', label: 'Security', icon: 'lock' },
  { id: 'ai', label: 'AI providers', icon: 'cpu' },
  { id: 'buffer', label: 'Buffer', icon: 'share' },
  { id: 'storage', label: 'Storage', icon: 'database' },
  { id: 'processing', label: 'Processing', icon: 'sliders' },
  { id: 'notifications', label: 'Notifications', icon: 'bell' },
  { id: 'data', label: 'Data', icon: 'shield' },
];

function Row({ title, body, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-3 py-3 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold">{title}</div>
        {body && <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/40">{body}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, settings, patch, providers, buffer, clips, posts, projects, toast, navigate, signOut, resetDemo } = useStore();
  const [tab, setTab] = useState('profile');
  const [confirmReset, setConfirmReset] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, email: user.email, workspace: 'TJ OpenClips Studio', timezone: 'America/New_York' });
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });

  const set = (key, value) => patch({ settings: { ...settings, [key]: value } });
  const connectedProviders = useMemo(() => providers.filter((p) => p.connected), [providers]);
  const usageMb = useMemo(() => clips.length * 18.4 + projects.length * 96, [clips, projects]);

  return (
    <div className="space-y-4">
      <SectionHead eyebrow="Workspace" title="Settings" sub="Profile, providers, storage and publishing preferences." />

      <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
              tab === t.id ? 'border-violet-400/50 bg-violet-500/15 text-violet-100' : 'border-white/8 bg-white/[0.02] text-white/55 hover:text-white'
            }`}
          >
            <Icon name={t.icon} size={12} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <section className="card divide-y divide-white/6">
          <div className="flex items-center gap-3 p-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 font-display text-lg font-extrabold">
              {profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-bold">{profile.name}</div>
              <div className="truncate text-[10.5px] text-white/40">{user.plan} · Free & open-source stack</div>
            </div>
            <button className="btn btn-secondary btn-sm ml-auto" onClick={() => toast('Avatar upload is available on Starter.', 'info')}>Change</button>
          </div>
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <label className="block">
              <span className="label">Full name</span>
              <input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Email address</span>
              <input className="input" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Workspace name</span>
              <input className="input" value={profile.workspace} onChange={(e) => setProfile({ ...profile, workspace: e.target.value })} />
            </label>
            <label className="block">
              <span className="label">Timezone</span>
              <select className="input" value={profile.timezone} onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}>
                {['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Kolkata', 'Australia/Sydney'].map((tz) => <option key={tz}>{tz}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2 p-3">
            <button className="btn btn-ghost btn-sm" onClick={() => setProfile({ name: user.name, email: user.email, workspace: 'TJ OpenClips Studio', timezone: 'America/New_York' })}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => { patch({ user: { ...user, name: profile.name, email: profile.email, initials: profile.name.split(' ').map((n) => n[0]).slice(0, 2).join('') } }); toast('Profile updated.', 'success'); }}>
              Save changes
            </button>
          </div>
        </section>
      )}

      {tab === 'security' && (
        <section className="card">
          <div className="border-b border-white/8 px-3 py-2 text-[12px] font-bold">Password</div>
          <div className="grid gap-3 p-3 sm:grid-cols-3">
            {[['current', 'Current password'], ['next', 'New password'], ['confirm', 'Confirm new password']].map(([k, label]) => (
              <label key={k} className="block">
                <span className="label">{label}</span>
                <input type="password" className="input" value={pw[k]} onChange={(e) => setPw({ ...pw, [k]: e.target.value })} placeholder="••••••••" />
              </label>
            ))}
          </div>
          <div className="flex justify-end px-3 pb-3">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (pw.next.length < 8) return toast('Use at least 8 characters.', 'error');
                if (pw.next !== pw.confirm) return toast('Passwords do not match.', 'error');
                setPw({ current: '', next: '', confirm: '' });
                toast('Password updated for this demo session.', 'success');
              }}
            >
              Update password
            </button>
          </div>
          <Row title="Two-factor authentication" body="Require a one-time code from your authenticator app at sign-in.">
            <Switch checked={!!settings.twoFactor} onChange={(v) => { set('twoFactor', v); toast(v ? 'Two-factor enabled (demo).' : 'Two-factor disabled.', v ? 'success' : 'info'); }} label={settings.twoFactor ? 'On' : 'Off'} />
          </Row>
          <Row title="Active sessions" body="iPhone 14 Pro · Safari · this device">
            <button className="btn btn-ghost btn-sm" onClick={() => { signOut(); toast('Signed out of this demo workspace.', 'info'); }}>Sign out</button>
          </Row>
        </section>
      )}

      {tab === 'ai' && (
        <section className="card">
          <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
            <span className="text-[12px] font-bold">Configured providers</span>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/models')}>Manage</button>
          </div>
          {providers.map((p) => (
            <Row key={p.id} title={p.name} body={p.role}>
              <div className="flex items-center gap-2">
                <Badge tone={p.connected ? 'mint' : 'slate'} icon={p.connected ? 'check' : 'key'}>{p.connected ? p.keyMask : 'No key'}</Badge>
                <span className="text-[10px] text-white/40">{p.model}</span>
              </div>
            </Row>
          ))}
          <div className="p-3">
            <InfoNote tone="violet" icon="key">
              Keys stay on your device in this demo. {connectedProviders.length} of {providers.length} providers connected — use your own API key; free model limits depend on the provider.
            </InfoNote>
          </div>
        </section>
      )}

      {tab === 'buffer' && (
        <section className="card">
          <Row title="Buffer workspace" body={buffer.connected ? `${buffer.workspace} · token ${buffer.tokenMask}` : 'Not connected'}>
            <Badge tone={buffer.connected ? 'mint' : 'amber'} icon={buffer.connected ? 'check' : 'alert'}>{buffer.connected ? 'Connected' : 'Disconnected'}</Badge>
          </Row>
          <Row title="Channels" body="Buffer controls which destinations are eligible for your account.">
            <div className="flex gap-1">{buffer.channels.filter((c) => c.connected).map((c) => <BrandIcon key={c.id} name={c.id} size={16} />)}</div>
          </Row>
          <div className="flex justify-end p-3">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/buffer')}>{buffer.connected ? 'Manage integration' : 'Connect Buffer'}</button>
          </div>
        </section>
      )}

      {tab === 'storage' && (
        <section className="card">
          <Row title="Storage location" body="Where uploaded source files and rendered clips are kept.">
            <select className="input w-auto py-1.5 text-[11px]" value={settings.storage} onChange={(e) => set('storage', e.target.value)}>
              <option value="browser">Browser only (private)</option>
              <option value="cloud">Cloud bucket (S3 / R2)</option>
            </select>
          </Row>
          <div className="p-3">
            <div className="mb-1 flex items-center justify-between text-[10.5px]">
              <span className="text-white/50">Workspace usage</span>
              <span className="font-semibold">{(usageMb / 1024).toFixed(2)} GB / 5 GB</span>
            </div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(96, (usageMb / 5120) * 100)}%` }} /></div>
            <p className="mt-1.5 text-[10px] text-white/35">{projects.length} source videos · {clips.length} rendered clips · auto-delete sources after 30 days</p>
          </div>
          <Row title="Auto-delete source videos" body="Keep only clips after the retention window to save storage.">
            <Switch checked={!!settings.autoDeleteSources} onChange={(v) => set('autoDeleteSources', v)} label={settings.autoDeleteSources ? 'On' : 'Off'} />
          </Row>
        </section>
      )}

      {tab === 'processing' && (
        <section className="card">
          <Row title="Render quality" body="Higher quality takes longer and uses more storage.">
            <select className="input w-auto py-1.5 text-[11px]" value={settings.quality} onChange={(e) => set('quality', e.target.value)}>
              <option value="720p">720p · fastest</option>
              <option value="1080p">1080p · recommended</option>
              <option value="4k">4K · slow</option>
            </select>
          </Row>
          <Row title="Burn captions by default" body="Apply your saved caption style to every new clip.">
            <Switch checked={!!settings.autoCaptions} onChange={(v) => set('autoCaptions', v)} label={settings.autoCaptions ? 'On' : 'Off'} />
          </Row>
          <Row title="Auto reframe to 9:16" body="Track the speaker and keep faces in frame for vertical exports.">
            <Switch checked={!!settings.autoReframe} onChange={(v) => set('autoReframe', v)} label={settings.autoReframe ? 'On' : 'Off'} />
          </Row>
          <Row title="Loudness normalisation" body="Target −14 LUFS for social platforms.">
            <Switch checked={!!settings.loudness} onChange={(v) => set('loudness', v)} label={settings.loudness ? 'On' : 'Off'} />
          </Row>
        </section>
      )}

      {tab === 'notifications' && (
        <section className="card">
          <Row title="Weekly digest" body="Performance summary every Monday.">
            <Switch checked={!!settings.emailDigest} onChange={(v) => set('emailDigest', v)} label={settings.emailDigest ? 'On' : 'Off'} />
          </Row>
          <Row title="Publishing alerts" body="Notify me when Buffer publishes a scheduled post.">
            <Switch checked={!!settings.publishAlerts} onChange={(v) => set('publishAlerts', v)} label={settings.publishAlerts ? 'On' : 'Off'} />
          </Row>
          <Row title="Failure alerts" body="Notify me if a scheduled post fails.">
            <Switch checked={!!settings.failureAlerts} onChange={(v) => set('failureAlerts', v)} label={settings.failureAlerts ? 'On' : 'Off'} />
          </Row>
          <Row title="Anonymous usage telemetry" body="Share processing metrics to improve models.">
            <Switch checked={!!settings.telemetry} onChange={(v) => set('telemetry', v)} label={settings.telemetry ? 'On' : 'Off'} />
          </Row>
        </section>
      )}

      {tab === 'data' && (
        <section className="card">
          <Row title="Export workspace data" body="Projects, clips, captions and scheduled posts as JSON.">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const blob = new Blob([JSON.stringify({ projects, clips, posts, settings }, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tj-openclips-workspace.json';
                a.click();
                URL.revokeObjectURL(url);
                toast('Workspace export downloaded.', 'success');
              }}
            >
              <Icon name="download" size={12} /> Export
            </button>
          </Row>
          <Row title="Reset demo data" body="Restores the seeded projects, clips and schedule.">
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(true)}><Icon name="refresh" size={12} /> Reset</button>
          </Row>
          <Row title="Delete workspace" body="Permanently removes this demo workspace and its media.">
            <button className="btn btn-danger btn-sm" onClick={() => toast('Workspace deletion is disabled in the demo.', 'error')}><Icon name="trash" size={12} /> Delete</button>
          </Row>
          <div className="p-3">
            <InfoNote tone="amber" icon="shield">This build is a design prototype: analysis, rendering and Buffer calls are simulated locally. No media leaves your browser.</InfoNote>
          </div>
        </section>
      )}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Reset demo data?"
        subtitle="Your local changes will be replaced with the seeded workspace."
        footer={
          <>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn btn-danger btn-sm" onClick={() => { resetDemo(); setConfirmReset(false); toast('Demo workspace restored.', 'success'); navigate('/dashboard'); }}>Reset everything</button>
          </>
        }
      >
        <p className="text-[12px] leading-relaxed text-white/60">This clears saved caption styles, provider keys, Buffer connection and scheduled posts in this browser.</p>
      </Modal>
    </div>
  );
}
