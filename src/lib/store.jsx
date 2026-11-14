import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BUFFER_CHANNELS, DEFAULT_CAPTION_SETTINGS, PROVIDERS } from './data';
import api, { ApiError } from './api';

/**
 * The studio store is now backed by the real API. Screens keep consuming the
 * same keys and action names they always did; this module maps genuine server
 * data (videos, jobs, clips, posts, providers, Buffer account) into those
 * display shapes. Nothing here fabricates processing results or publish states:
 * every status shown comes from the server.
 */

const PREFS_KEY = 'tj-openclips-prefs-v2';

const HUE_PAIRS = [
  [262, 190], [320, 265], [190, 262], [275, 210], [205, 285], [300, 200], [180, 300], [250, 175],
];

const clock = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
};

const relative = (iso) => {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
};

const hashOf = (value) => {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 100000;
  return hash;
};

const initialsOf = (name) =>
  String(name || 'TJ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase() || 'TJ';

export const clipFileUrl = (clip) => clip.previewUrl || `/api/clips/${clip.id}/file`;
export const clipThumbUrl = (clip) => clip.thumbUrl || `/api/clips/${clip.id}/thumb`;
export const videoFileUrl = (video) => `/api/videos/${video.id}/file`;

export const mapVideo = (video, index = 0) => {
  const [hue, hue2] = HUE_PAIRS[hashOf(video.id) % HUE_PAIRS.length] || HUE_PAIRS[index % HUE_PAIRS.length];
  const statusMap = {
    imported: 'Imported',
    processing: 'Processing',
    ready: 'Ready',
    failed: 'Failed',
  };
  return {
    ...video,
    source: video.source === 'upload' ? 'Uploaded file' : video.source === 'url' ? 'Video link' : 'Sample',
    sourceUrl:
      video.sourceUrl ||
      (video.sizeBytes ? `${video.filename || 'video'} · ${(video.sizeBytes / 1048576).toFixed(1)} MB` : '—'),
    duration: clock(video.duration),
    durationSec: Math.round(Number(video.duration) || 0),
    clips: video.clipCount || 0,
    status: statusMap[video.status] || video.status || 'Imported',
    created: relative(video.createdAt),
    hue,
    hue2,
    progress: video.status === 'ready' ? 100 : video.status === 'failed' ? 0 : video.progress || 0,
    language: video.language || 'English (US)',
    title: video.title || 'Untitled video',
  };
};

export const mapClip = (clip) => {
  const [hue, hue2] = HUE_PAIRS[hashOf(clip.id) % HUE_PAIRS.length];
  return {
    ...clip,
    durationLabel: clock(clip.duration),
    durationSec: Math.round(Number(clip.duration) || 0),
    startLabel: clock(clip.start),
    endLabel: clock(clip.end),
    score: Math.round(Number(clip.score) || 0),
    captionStyle: clip.captionStyle || 'bold-viral',
    hue,
    hue2,
    thumbUrl: clipThumbUrl(clip),
    previewUrl: clipFileUrl(clip),
    downloadUrl: clip.downloadUrl || `/api/clips/${clip.id}/file?download=1`,
    rendered: clip.status === 'ready',
  };
};

export const mapPost = (post) => {
  const when = post.scheduledAt ? new Date(post.scheduledAt) : null;
  const valid = when && !Number.isNaN(when.getTime());
  const pad = (n) => String(n).padStart(2, '0');
  const date = valid ? `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}` : null;
  const time = valid ? `${pad(when.getHours())}:${pad(when.getMinutes())}` : null;
  const hours = valid ? when.getHours() : 0;
  const timeLabel = valid
    ? `${hours % 12 === 0 ? 12 : hours % 12}:${pad(when.getMinutes())} ${hours >= 12 ? 'PM' : 'AM'}`
    : null;
  return {
    ...post,
    date,
    time,
    timeLabel,
    dateLabel: valid
      ? when.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : 'Unscheduled',
    channelIds: (post.channels || []).map((c) => c.id),
    channelNames: (post.channels || []).map((c) => c.name),
    clipTitle: (post.clipTitles || [])[0] || 'Clip',
    queueId: post.bufferUpdates && post.bufferUpdates[0] ? post.bufferUpdates[0].id : post.queueId || null,
    publishedAt: post.publishedAt || null,
    error: post.error || null,
  };
};

const providerMeta = (id) => PROVIDERS.find((p) => p.id === id) || {};

const mapProviders = (remote) =>
  PROVIDERS.map((base) => {
    const live = remote?.[base.id] || {};
    return {
      ...base,
      model: live.model || base.model,
      models: live.models && live.models.length ? live.models : base.models,
      keyMask: live.keyMask || null,
      connected: Boolean(live.configured && live.lastTestOk),
      configured: Boolean(live.configured),
      lastTestOk: Boolean(live.lastTestOk),
      lastTestedAt: live.lastTestedAt || null,
      lastError: live.lastError || null,
      usage: live.usage || base.usage,
      note: base.note,
    };
  });

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseHash() {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  return { path: path || '/', query: new URLSearchParams(search) };
}

const emptyState = {
  ready: false,
  bootError: null,
  user: null,
  signedIn: false,
  onboarded: false,
  stats: { videos: 0, clips: 0, scheduled: 0, published: 0, channels: 0, minutesProcessed: 0 },
  projects: [],
  clips: [],
  posts: [],
  jobs: [],
  providers: mapProviders(null),
  buffer: { configured: false, connected: false, channels: BUFFER_CHANNELS, tokenMask: null, lastError: null },
  captionStyles: [],
  processing: { queue: 0, maxClipsPerJob: 5, maxUploadMb: 512 },
  engine: { ffmpegAvailable: false, aspects: ['9:16', '16:9', '1:1', '4:5'], stages: [] },
  selectedClips: [],
  caption: { ...DEFAULT_CAPTION_SETTINGS },
  analysis: { projectId: null, jobId: null, done: false, stage: 0, status: 'idle', error: null, stages: [] },
  notifications: 0,
  settings: {
    language: 'English (US)',
    quality: '1080p',
    autoCaptions: true,
    autoReframe: true,
    loudness: true,
    storage: 'server',
    emailDigest: true,
    publishAlerts: true,
    failureAlerts: true,
    telemetry: false,
    twoFactor: false,
  },
  toasts: [],
};

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const prefs = loadPrefs();
  const [state, setState] = useState(() => ({
    ...emptyState,
    selectedClips: prefs?.selectedClips || [],
    caption: { ...DEFAULT_CAPTION_SETTINGS, ...(prefs?.caption || {}) },
    settings: { ...emptyState.settings, ...(prefs?.settings || {}) },
  }));
  const [route, setRoute] = useState(parseHash);
  const toastTimers = useRef([]);
  const pollRef = useRef(null);

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
    const { toasts, caption, selectedClips, settings } = state;
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify({ caption, selectedClips, settings }));
    } catch {
      /* private mode */
    }
  }, [state.caption, state.selectedClips, state.settings]);

  useEffect(() => () => {
    toastTimers.current.forEach(clearTimeout);
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  const toast = useCallback((message, tone = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setState((s) => ({ ...s, toasts: [...s.toasts, { id, message, tone }] }));
    const timer = setTimeout(() => {
      setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4200);
    toastTimers.current.push(timer);
  }, []);

  const dismissToast = useCallback((id) => {
    setState((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
  }, []);

  const navigate = useCallback((path) => {
    const target = path.startsWith('/') ? path : `/${path}`;
    if (window.location.hash === `#${target}`) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    window.location.hash = target;
  }, []);

  const applyState = useCallback((payload) => {
    setState((s) => {
      const videos = (payload.videos || []).map(mapVideo);
      const clips = (payload.clips || []).map(mapClip);
      const posts = (payload.posts || []).map(mapPost);
      const bufferChannels = payload.buffer?.channels?.length
        ? payload.buffer.channels.map((c) => ({
            id: c.id,
            name: c.name || c.service || 'Channel',
            handle: c.handle || c.service || '',
            service: c.service || 'buffer',
            connected: true,
            hue: (HUE_PAIRS[hashOf(c.id) % HUE_PAIRS.length] || [200])[0],
            format: c.format || 'Managed by Buffer',
            audience: c.audience || '—',
          }))
        : s.buffer.channels;
      return {
        ...s,
        ready: true,
        bootError: null,
        user: payload.user
          ? {
              ...payload.user,
              plan: payload.user.plan || 'Free workspace',
              initials: initialsOf(payload.user.name),
            }
          : s.user,
        signedIn: Boolean(payload.user),
        onboarded: Boolean(payload.user),
        stats: payload.stats || s.stats,
        projects: videos,
        clips,
        posts,
        jobs: payload.jobs || [],
        providers: mapProviders(payload.providers),
        captionStyles: payload.captionStyles || [],
        processing: payload.processing || s.processing,
        settings: payload.settings && typeof payload.settings === 'object' ? { ...s.settings, ...payload.settings } : s.settings,
        buffer: {
          configured: Boolean(payload.buffer?.configured),
          connected: Boolean(payload.buffer?.connected),
          account: payload.buffer?.account || null,
          lastError: payload.buffer?.lastError || null,
          channels: bufferChannels,
          tokenMask: payload.buffer?.account ? 'buf_•••••••••••• (stored server-side)' : null,
          workspace: payload.user?.name ? `${payload.user.name} · Buffer` : 'Buffer',
        },
        selectedClips: s.selectedClips.filter((id) => clips.some((c) => c.id === id)),
        notifications: (payload.jobs || []).filter((j) => j.status === 'failed').length,
      };
    });
  }, []);

  const refresh = useCallback(
    async (options = {}) => {
      try {
        const [config, payload] = await Promise.all([
          api.config().catch(() => null),
          api.state(),
        ]);
        applyState(payload);
        if (config) {
          setState((s) => ({ ...s, engine: config }));
        }
        return payload;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setState((s) => ({ ...s, ready: true, signedIn: false, user: null }));
          return null;
        }
        if (!options.silent) {
          setState((s) => ({ ...s, ready: true, bootError: error.message }));
        }
        return null;
      }
    },
    [applyState]
  );

  useEffect(() => {
    refresh({ silent: true });
  }, [refresh]);

  const finishAuth = useCallback(
    (payload) => {
      setState((s) => ({
        ...s,
        ready: true,
        signedIn: true,
        onboarded: true,
        user: {
          ...(payload.user || {}),
          plan: payload.user?.plan || 'Free workspace',
          initials: initialsOf(payload.user?.name),
        },
      }));
      refresh({ silent: true });
    },
    [refresh]
  );

  const pollJob = useCallback(
    (jobId) => {
      if (!jobId) return;
      if (pollRef.current) clearInterval(pollRef.current);
      const tick = async () => {
        try {
          const { job } = await api.job(jobId);
          setState((s) => ({
            ...s,
            analysis: {
              projectId: job.videoId,
              jobId: job.id,
              done: job.status === 'completed',
              failed: job.status === 'failed',
              stage: (job.stages || []).filter((st) => st.status === 'done').length,
              status: job.status,
              error: job.error || null,
              stages: job.stages || [],
              message: job.message || null,
            },
          }));
          if (job.status === 'completed' || job.status === 'failed') {
            clearInterval(pollRef.current);
            pollRef.current = null;
            await refresh({ silent: true });
            if (job.status === 'failed') toast(job.error || 'Processing failed.', 'error');
          }
        } catch (error) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setState((s) => ({ ...s, analysis: { ...s.analysis, failed: true, error: error.message } }));
        }
      };
      tick();
      pollRef.current = setInterval(tick, 2000);
    },
    [refresh, toast]
  );

  const actions = useMemo(
    () => ({
      navigate,
      toast,
      dismissToast,
      refresh,
      patch: (partial) => setState((s) => ({ ...s, ...partial })),

      register: async (payload) => {
        const result = await api.register(payload);
        finishAuth(result);
        return result;
      },
      login: async (payload) => {
        const result = await api.login(payload);
        finishAuth(result);
        return result;
      },
      signIn: (user) =>
        setState((s) => ({
          ...s,
          signedIn: true,
          onboarded: true,
          user: { ...s.user, ...user, initials: initialsOf(user?.name || s.user?.name) },
        })),
      signOut: async () => {
        try {
          await api.logout();
        } catch {
          /* session already gone */
        }
        setState((s) => ({ ...emptyState, ready: true, caption: s.caption, settings: s.settings }));
      },

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
      applyCaptionToAll: async () => {
        const { caption } = state;
        const result = await api.captionStyle({ style: caption });
        await refresh({ silent: true });
        return result;
      },
      saveCaptionStyle: async (name) => {
        const result = await api.captionStyle({ style: state.caption, name, save: true });
        await refresh({ silent: true });
        return result;
      },

      updateProvider: async (id, partial) => {
        const result = await api.saveProvider(id, partial);
        setState((s) => ({
          ...s,
          providers: s.providers.map((p) =>
            p.id === id
              ? {
                  ...p,
                  model: result.provider?.model || partial.model || p.model,
                  keyMask: result.provider?.keyMask || p.keyMask,
                  configured: Boolean(result.provider?.configured),
                  connected: Boolean(result.provider?.configured && result.provider?.lastTestOk),
                  lastTestOk: Boolean(result.provider?.lastTestOk),
                  lastError: result.provider?.lastError || null,
                }
              : p
          ),
        }));
        return result;
      },
      removeProvider: async (id) => {
        await api.removeProvider(id);
        await refresh({ silent: true });
      },
      testProvider: async (id) => {
        const result = await api.testProvider(id);
        setState((s) => ({
          ...s,
          providers: s.providers.map((p) =>
            p.id === id
              ? {
                  ...p,
                  connected: true,
                  lastTestOk: true,
                  lastTestedAt: new Date().toISOString(),
                  lastError: null,
                  usage: result.usage || p.usage,
                }
              : p
          ),
        }));
        return result;
      },

      connectBuffer: async (token) => {
        const result = await api.bufferToken(token);
        await refresh({ silent: true });
        return result;
      },
      disconnectBuffer: async () => {
        await api.bufferDisconnect();
        await refresh({ silent: true });
      },
      bufferAuthorize: async () => api.bufferAuthorize(),
      syncBufferChannels: async () => {
        const result = await api.bufferChannels();
        await refresh({ silent: true });
        return result;
      },
      toggleChannel: (id) =>
        setState((s) => ({
          ...s,
          buffer: {
            ...s.buffer,
            channels: s.buffer.channels.map((c) => (c.id === id ? { ...c, connected: !c.connected } : c)),
          },
        })),

      uploadVideo: async (file, meta, onProgress) => {
        const result = await api.uploadVideo(file, meta, onProgress);
        await refresh({ silent: true });
        return result;
      },
      inspectVideoUrl: async (payload) => api.inspectUrl(payload),
      importVideoUrl: async (payload) => {
        const result = await api.importUrl(payload);
        await refresh({ silent: true });
        return result;
      },
      deleteVideo: async (id) => {
        await api.deleteVideo(id);
        await refresh({ silent: true });
      },

      startAnalysis: async (payload) => {
        const result = await api.startJob(payload);
        setState((s) => ({
          ...s,
          analysis: {
            projectId: payload.videoId,
            jobId: result.job.id,
            done: false,
            failed: false,
            stage: 0,
            status: result.job.status || 'queued',
            stages: result.job.stages || [],
            error: null,
          },
        }));
        pollJob(result.job.id);
        return result.job;
      },
      retryJob: async (jobId) => {
        const result = await api.retryJob(jobId);
        pollJob(jobId);
        return result;
      },
      pollJob,
      stopPolling: () => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
      },
      completeAnalysis: () => refresh({ silent: true }),
      setAnalysisStage: (stage) => setState((s) => ({ ...s, analysis: { ...s.analysis, stage } })),

      renderClip: async (id, options) => {
        const result = await api.renderClip(id, options);
        await refresh({ silent: true });
        return result;
      },
      updateClip: async (id, partial) => {
        const result = await api.updateClip(id, partial);
        await refresh({ silent: true });
        return result;
      },
      downloadClip: (clip) => {
        const url = clip.downloadUrl || `/api/clips/${clip.id}/file?download=1`;
        window.open(url, '_blank', 'noopener');
      },

      addPost: async (post) => {
        const result = await api.createPost(post);
        setState((s) => ({ ...s, lastPostId: result.post.id }));
        await refresh({ silent: true });
        return result.post;
      },
      updatePost: async (id, partial) => {
        const result = await api.updatePost(id, partial);
        await refresh({ silent: true });
        return result.post;
      },
      removePost: async (id) => {
        await api.deletePost(id);
        await refresh({ silent: true });
      },
      sendPost: async (id) => {
        const result = await api.sendPost(id);
        await refresh({ silent: true });
        return result;
      },
      generateCaption: async (payload) => api.generateCaption(payload),

      saveSettings: async (partial) => {
        setState((s) => ({ ...s, settings: { ...s.settings, ...partial } }));
        return api.saveSettings(partial);
      },
      updateProfile: async (payload) => {
        const result = await api.updateProfile(payload);
        await refresh({ silent: true });
        return result;
      },
      changePassword: (payload) => api.changePassword(payload),

      markNotificationsRead: () => setState((s) => ({ ...s, notifications: 0 })),
      resetDemo: async () => {
        try {
          await api.purgeAccount();
        } catch {
          /* ignore */
        }
        await refresh({ silent: true });
      },
    }),
    [navigate, toast, dismissToast, refresh, state, pollJob, finishAuth]
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
