import { useEffect, useMemo, useState } from 'react';
import Icon, { BrandIcon } from '../lib/icons';
import { NAV } from '../lib/data';
import { useStore } from '../lib/store';
import { Avatar, Badge, Logo, Progress } from './ui';

const BOTTOM = [
  { id: 'dashboard', label: 'Home', icon: 'home', path: '/dashboard' },
  { id: 'videos', label: 'Videos', icon: 'video', path: '/videos' },
  { id: 'new', label: 'Create', icon: 'plus', path: '/import', primary: true },
  { id: 'clips', label: 'Clips', icon: 'film', path: '/clips' },
  { id: 'calendar', label: 'Publish', icon: 'calendar', path: '/calendar' },
];

const TITLES = NAV.flatMap((g) => g.items).reduce((acc, item) => {
  acc[item.path] = item.label;
  return acc;
}, {});

function NavLink({ item, active, onClick, collapsed = false }) {
  return (
    <button
      onClick={onClick}
      className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
      aria-current={active ? 'page' : undefined}
      title={item.label}
    >
      <Icon name={item.icon} size={17} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge && (
        <span className={`ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-violet-500/30 text-violet-100' : 'bg-white/8 text-white/55'}`}>
          {item.badge}
        </span>
      )}
    </button>
  );
}

function BufferStatusCard() {
  const { buffer, navigate } = useStore();
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/[0.10] to-cyan-500/[0.04] p-3.5">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/8 text-emerald-300">
          <BrandIcon name="buffer" size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-bold leading-none">Buffer</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-300">
            <span className={`h-1.5 w-1.5 rounded-full ${buffer.connected ? 'bg-emerald-400 dot-live' : 'bg-rose-400'}`} />
            {buffer.connected ? 'Connected' : 'Not connected'}
          </div>
        </div>
      </div>
      <div className="mt-2.5 text-[10.5px] leading-relaxed text-white/50">
        {buffer.channels.filter((c) => c.connected).length} channels ready to schedule
      </div>
      <button className="mt-2.5 w-full rounded-lg border border-white/12 bg-white/[0.05] py-1.5 text-[11px] font-semibold text-white/80 transition hover:bg-white/10" onClick={() => navigate('/buffer')}>
        Manage channels
      </button>
    </div>
  );
}

function NotificationsPanel({ onClose }) {
  const { markNotificationsRead, navigate } = useStore();
  useEffect(() => {
    markNotificationsRead();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const items = [
    { icon: 'check', tone: 'text-emerald-300', title: 'Batch finished', body: '8 clips generated for Ep. 42', time: '12m ago' },
    { icon: 'clock', tone: 'text-violet-300', title: 'Post scheduled', body: 'Hook clip → TikTok, Instagram · 6:30 PM', time: '1h ago' },
    { icon: 'alert', tone: 'text-rose-300', title: 'Channel token expired', body: 'Reconnect TikTok in Buffer to resume posting', time: '3h ago' },
  ];
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] animate-pop overflow-hidden rounded-2xl border border-white/12 bg-ink-900/97 shadow-panel backdrop-blur-2xl">
      <div className="flex items-center justify-between border-b border-white/8 px-3.5 py-2.5">
        <span className="text-[12px] font-bold">Notifications</span>
        <button className="text-[10.5px] font-semibold text-violet-300" onClick={onClose}>Close</button>
      </div>
      <div className="divide-y divide-white/6">
        {items.map((n) => (
          <div key={n.title} className="flex gap-2.5 px-3.5 py-3">
            <span className={`mt-0.5 ${n.tone}`}><Icon name={n.icon} size={14} /></span>
            <div className="min-w-0">
              <div className="text-[11.5px] font-semibold">{n.title}</div>
              <div className="mt-0.5 text-[10.5px] leading-relaxed text-white/50">{n.body}</div>
              <div className="mt-1 text-[9.5px] uppercase tracking-wider text-white/30">{n.time}</div>
            </div>
          </div>
        ))}
      </div>
      <button className="w-full border-t border-white/8 py-2.5 text-[11px] font-semibold text-violet-300 hover:bg-white/5" onClick={() => { onClose(); navigate('/queue'); }}>
        Open publishing queue
      </button>
    </div>
  );
}

function SearchModal({ open, onClose }) {
  const { navigate, projects, clips } = useStore();
  const [q, setQ] = useState('');
  const navResults = useMemo(
    () => NAV.flatMap((g) => g.items).filter((i) => i.label.toLowerCase().includes(q.toLowerCase())),
    [q]
  );
  const projectResults = useMemo(
    () => projects.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 3),
    [projects, q]
  );
  const clipResults = useMemo(
    () => clips.filter((c) => c.title.toLowerCase().includes(q.toLowerCase())).slice(0, 3),
    [clips, q]
  );
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh]">
      <button className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" aria-label="Close search" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg animate-pop overflow-hidden rounded-2xl border border-white/12 bg-ink-900/97 shadow-panel backdrop-blur-2xl">
        <div className="flex items-center gap-2.5 border-b border-white/8 px-3.5">
          <Icon name="search" size={16} className="text-white/40" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search screens, projects, clips…"
            className="w-full bg-transparent py-3.5 text-[13px] outline-none placeholder:text-white/35"
          />
          <button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" size={14} /></button>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2 scroll-thin">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/35">Screens</div>
          {navResults.map((item) => (
            <button key={item.id} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/8" onClick={() => { onClose(); navigate(item.path); }}>
              <Icon name={item.icon} size={15} className="text-violet-300" />
              <span className="text-[12.5px] font-medium">{item.label}</span>
            </button>
          ))}
          {projectResults.length > 0 && <div className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Projects</div>}
          {projectResults.map((p) => (
            <button key={p.id} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/8" onClick={() => { onClose(); navigate('/videos'); }}>
              <Icon name="folder" size={15} className="text-cyan-300" />
              <span className="truncate text-[12.5px]">{p.title}</span>
            </button>
          ))}
          {clipResults.length > 0 && <div className="px-2 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/35">Clips</div>}
          {clipResults.map((c) => (
            <button key={c.id} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-white/8" onClick={() => { onClose(); navigate('/clips'); }}>
              <Icon name="film" size={15} className="text-fuchsia-300" />
              <span className="truncate text-[12.5px]">{c.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Shell({ children }) {
  const { route, navigate, user, notifications, buffer, analysis, projects } = useStore();
  const [moreOpen, setMoreOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const path = route.path;
  const activeProject = projects.find((p) => p.status === 'Processing') || projects[0];

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setMoreOpen(false);
    setNotifOpen(false);
  }, [path]);

  const pageTitle = TITLES[path] || 'Studio';

  return (
    <div className="min-h-dvh bg-ink-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-[380px] w-[380px] rounded-full bg-violet-700/16 blur-[130px]" />
        <div className="absolute -right-32 top-1/3 h-[320px] w-[320px] rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-white/8 bg-ink-900/70 backdrop-blur-xl lg:flex">
        <div className="flex h-[68px] shrink-0 items-center border-b border-white/8 px-4">
          <button onClick={() => navigate('/dashboard')} aria-label="Dashboard"><Logo size={30} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-2.5 py-3 scroll-thin">
          {NAV.map((group) => (
            <div key={group.group} className="mb-4">
              <div className="px-2.5 pb-1.5 text-[9.5px] font-bold uppercase tracking-[0.2em] text-white/30">{group.group}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.id} item={item} active={path === item.path} onClick={() => navigate(item.path)} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="shrink-0 space-y-2.5 border-t border-white/8 p-2.5">
          <BufferStatusCard />
          <div className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5">
            <Avatar initials={user.initials} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11.5px] font-semibold">{user.name}</div>
              <div className="truncate text-[10px] text-white/40">{user.email}</div>
            </div>
            <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings"><Icon name="settings" size={15} /></button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-white/8 bg-ink-950/80 backdrop-blur-xl">
          <div className="safe-top mx-auto flex h-[60px] w-full max-w-[1180px] items-center gap-2.5 px-3.5 sm:px-5 lg:h-[68px] lg:px-8">
            <button className="lg:hidden" onClick={() => navigate('/dashboard')} aria-label="Home">
              <Logo size={28} withText={false} />
            </button>
            <div className="hidden min-w-0 lg:block">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/35">
                <span>TJ OpenClips</span>
                <Icon name="chevron-right" size={10} />
                <span className="text-white/60">{pageTitle}</span>
              </div>
              <div className="truncate font-display text-[15px] font-bold leading-tight">{pageTitle}</div>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <button className="hidden items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11.5px] text-white/45 transition hover:border-white/20 hover:text-white/70 sm:flex" onClick={() => setSearchOpen(true)}>
                <Icon name="search" size={14} />
                <span className="hidden md:inline">Search studio</span>
                <kbd className="ml-3 rounded border border-white/12 px-1 py-0.5 text-[9px] font-semibold text-white/40">⌘K</kbd>
              </button>
              <button className="icon-btn sm:hidden" onClick={() => setSearchOpen(true)} aria-label="Search"><Icon name="search" size={17} /></button>
              <div className="relative">
                <button className="icon-btn relative" onClick={() => setNotifOpen((v) => !v)} aria-label="Notifications">
                  <Icon name="bell" size={17} />
                  {notifications > 0 && (
                    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-violet-500 px-1 text-[8.5px] font-extrabold text-white ring-2 ring-ink-950">
                      {notifications}
                    </span>
                  )}
                </button>
                {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
              </div>
              <button className="btn btn-primary btn-sm ml-0.5 hidden sm:inline-flex" onClick={() => navigate('/import')}>
                <Icon name="plus" size={14} /> New project
              </button>
              <button className="lg:hidden" onClick={() => navigate('/settings')} aria-label="Account settings">
                <Avatar initials={user.initials} size={30} />
              </button>
              <button className="hidden lg:block" onClick={() => setMoreOpen(true)} aria-label="All screens">
                <Avatar initials={user.initials} size={32} />
              </button>
            </div>
          </div>
          {activeProject?.status === 'Processing' && (
            <button className="block w-full border-t border-white/6 bg-violet-500/[0.06] text-left" onClick={() => navigate('/analyze')}>
              <div className="mx-auto flex w-full max-w-[1180px] items-center gap-2.5 px-3.5 py-1.5 text-[10.5px] sm:px-5 lg:px-8">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400 dot-live" />
                <span className="truncate font-semibold text-violet-200">Processing: {activeProject.title}</span>
                <span className="ml-auto shrink-0 font-bold text-white/60">{activeProject.progress}%</span>
                <div className="hidden w-24 sm:block">
                  <Progress value={activeProject.progress} />
                </div>
              </div>
            </button>
          )}
        </header>

        <main className="mx-auto w-full max-w-[1180px] px-3.5 pb-28 pt-4 sm:px-5 sm:pt-5 lg:px-8 lg:pb-14 lg:pt-7">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="bottom-nav lg:hidden" aria-label="Primary">
        <div className="safe-bottom mx-auto flex max-w-md items-end justify-around px-1.5 pb-1 pt-1.5">
          {BOTTOM.map((item) =>
            item.primary ? (
              <button key={item.id} onClick={() => navigate(item.path)} className="-mt-5 flex flex-col items-center gap-0.5" aria-label={item.label}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-400 text-ink-950 shadow-[0_8px_24px_-6px_rgba(124,92,255,0.85)] transition active:scale-95">
                  <Icon name={item.icon} size={23} strokeWidth={2.6} />
                </span>
                <span className="text-[9.5px] font-semibold text-white/55">{item.label}</span>
              </button>
            ) : (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`bottom-item ${path === item.path ? 'active' : ''}`}
                aria-current={path === item.path ? 'page' : undefined}
              >
                <Icon name={item.icon} size={19} strokeWidth={path === item.path ? 2.3 : 1.8} />
                <span>{item.label}</span>
              </button>
            )
          )}
        </div>
      </nav>

      {/* Mobile "all screens" sheet */}
      {moreOpen && (
        <div className="fixed inset-0 z-[85] flex items-end justify-center lg:items-center">
          <button className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" aria-label="Close menu" onClick={() => setMoreOpen(false)} />
          <div className="relative z-10 max-h-[88dvh] w-full max-w-lg animate-pop overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900/97 p-4 shadow-panel scroll-thin lg:rounded-3xl" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 lg:hidden" />
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar initials={user.initials} size={34} />
                <div>
                  <div className="text-[13px] font-bold">{user.name}</div>
                  <div className="text-[10.5px] text-white/45">{user.plan}</div>
                </div>
              </div>
              <button className="icon-btn" onClick={() => setMoreOpen(false)} aria-label="Close"><Icon name="x" size={16} /></button>
            </div>
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <BrandIcon name="buffer" size={15} className={buffer.connected ? 'text-emerald-300' : 'text-rose-300'} />
              <span className="text-[11.5px] font-medium">Buffer {buffer.connected ? 'connected' : 'disconnected'}</span>
              <Badge tone={buffer.connected ? 'mint' : 'rose'} className="ml-auto">
                {buffer.channels.filter((c) => c.connected).length} channels
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {NAV.flatMap((g) => g.items).map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setMoreOpen(false); navigate(item.path); }}
                  className={`flex items-center gap-2 rounded-xl border px-2.5 py-2.5 text-left text-[11.5px] font-medium transition ${
                    path === item.path ? 'border-violet-400/40 bg-violet-500/15 text-white' : 'border-white/8 bg-white/[0.03] text-white/70 hover:bg-white/8'
                  }`}
                >
                  <Icon name={item.icon} size={15} className="text-violet-300" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => { setMoreOpen(false); navigate('/import'); }}>
                <Icon name="plus" size={14} /> New project
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setMoreOpen(false); navigate('/settings'); }}>
                <Icon name="settings" size={14} /> Settings
              </button>
            </div>
          </div>
        </div>
      )}

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
