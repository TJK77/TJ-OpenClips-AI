import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  BUFFER_CHANNELS,
  DEFAULT_CAPTION_SETTINGS,
  PROVIDERS,
  seedClips,
  seedPosts,
  seedProjects,
} from './data';

const STORAGE_KEY = 'tj-openclips-studio-v1';

const initialState = {
  user: { name: 'TJ Mercer', email: 'tj@openclips.studio', plan: 'Free workspace', initials: 'TJ' },
  signedIn: false,
  onboarded: false,
  projects: seedProjects,
  clips: seedClips,
  selectedClips: ['c1', 'c2'],
  caption: { ...DEFAULT_CAPTION_SETTINGS },
  providers: PROVIDERS,
  buffer: {
    connected: true,
    workspace: 'TJ OpenClips Studio',
    tokenMask: 'buf_live_••••••••••••2f9a',
    channels: BUFFER_CHANNELS,
  },
  posts: seedPosts,
  lastPostId: null,
  analysis: { projectId: 'p1', done: false, stage: 0 },
  notifications: 3,
  settings: {
    language: 'English (US)',
    quality: '1080p',
    autoCaptions: true,
    autoReframe: true,
    loudness: true,
    storage: 'browser',
    emailDigest: true,
    publishAlerts: true,
    failureAlerts: true,
    telemetry: false,
    twoFactor: false,
  },
  toasts: [],
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      ...initialState,
      ...parsed,
      caption: { ...initialState.caption, ...(parsed.caption || {}) },
      settings: { ...initialState.settings, ...(parsed.settings || {}) },
      toasts: [],
      analysis: { ...initialState.analysis, ...(parsed.analysis || {}) },
    };
  } catch {
    return null;
  }
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(search) };
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(() => loadState() || initialState);
  const [route, setRoute] = useState(parseHash);
  const toastTimers = useRef([]);

  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onHash);
    if (!window.location.hash) window.history.replaceState(null, '', '#/');
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const { toasts, ...persist } = state;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    } catch {
      /* storage may be unavailable in private mode */
    }
  }, [state]);

  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  const navigate = useCallback((path) => {
    const target = path.startsWith('/') ? path : `/${path}`;
    if (window.location.hash === `#${target}`) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    window.location.hash = target;
  }, []);

  const toast = useCallback((message, tone = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setState((s) => ({ ...s, toasts: [...s.toasts, { id, message, tone }] }));
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3600);
    toastTimers.current.push(timer);
  }, []);

  const dismissToast = useCallback((id) => {
    setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
  }, []);

  const actions = useMemo(
    () => ({
      navigate,
      toast,
      dismissToast,
      patch: (partial) => setState((s) => ({ ...s, ...partial })),
      signIn: (user) =>
        setState((s) => ({
          ...s,
          signedIn: true,
          onboarded: true,
          user: { ...s.user, ...user },
        })),
      signOut: () => setState((s) => ({ ...s, signedIn: false })),
      toggleClip: (id) =>
        setState((s) => ({
          ...s,
          selectedClips: s.selectedClips.includes(id)
            ? s.selectedClips.filter((c) => c !== id)
            : [...s.selectedClips, id],
        })),
      setSelectedClips: (ids) => setState((s) => ({ ...s, selectedClips: ids })),
      clearClips: () => setState((s) => ({ ...s, selectedClips: [] })),
      setCaption: (partial) =>
        setState((s) => ({ ...s, caption: { ...s.caption, ...partial } })),
      applyCaptionToAll: () =>
        setState((s) => ({
          ...s,
          clips: s.clips.map((c) => ({ ...c, captionStyle: s.caption.styleId })),
        })),
      updateProvider: (id, partial) =>
        setState((s) => ({
          ...s,
          providers: s.providers.map((p) => (p.id === id ? { ...p, ...partial } : p)),
        })),
      connectBuffer: (token) =>
        setState((s) => ({
          ...s,
          buffer: {
            ...s.buffer,
            connected: true,
            tokenMask: token ? `buf_live_••••••••••••${token.slice(-4)}` : s.buffer.tokenMask,
          },
        })),
      disconnectBuffer: () =>
        setState((s) => ({
          ...s,
          buffer: { ...s.buffer, connected: false },
          posts: s.posts.map((p) => (p.status === 'scheduled' ? { ...p, status: 'draft', queueId: null } : p)),
        })),
      toggleChannel: (id) =>
        setState((s) => ({
          ...s,
          buffer: {
            ...s.buffer,
            channels: s.buffer.channels.map((c) =>
              c.id === id ? { ...c, connected: !c.connected } : c
            ),
          },
        })),
      addPost: (post) =>
        setState((s) => {
          const id = `post-${Date.now()}`;
          return { ...s, posts: [{ ...post, id }, ...s.posts], lastPostId: id };
        }),
      updatePost: (id, partial) =>
        setState((s) => ({
          ...s,
          posts: s.posts.map((p) => (p.id === id ? { ...p, ...partial } : p)),
        })),
      removePost: (id) =>
        setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) })),
      completeAnalysis: () =>
        setState((s) => ({
          ...s,
          analysis: { ...s.analysis, done: true, stage: 9 },
          projects: s.projects.map((p) => (p.id === s.analysis.projectId ? { ...p, status: 'Ready', clips: 8, progress: 100 } : p)),
        })),
      setAnalysisStage: (stage) =>
        setState((s) => ({ ...s, analysis: { ...s.analysis, stage } })),
      markNotificationsRead: () => setState((s) => ({ ...s, notifications: 0 })),
      resetDemo: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
        setState({ ...initialState });
      },
    }),
    [navigate, toast, dismissToast]
  );

  const value = useMemo(() => ({ ...state, ...actions, route }), [state, actions, route]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useToast() {
  const { toast } = useStore();
  return toast;
}
