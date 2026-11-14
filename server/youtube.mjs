/**
 * Platform link inspection.
 *
 * What this module genuinely does:
 *  - Parses every common YouTube URL shape (watch, youtu.be, /shorts/, /live/,
 *    /embed/, /v/) plus plain direct media URLs.
 *  - Fetches real metadata from YouTube's public oEmbed endpoint (no API key,
 *    no auth, no quota) so FETCH returns actual title / channel / thumbnail.
 *  - Reports whether the media itself can be downloaded, honestly.
 *
 * What it deliberately does not do: pretend. YouTube answers automated media
 * requests from datacenter IPs with "Sign in to confirm you're not a bot", so
 * mediaAccessible is false for YouTube links and the response names the working
 * alternatives instead of failing later inside the pipeline.
 */

const YT_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'youtu.be',
]);

const VIDEO_ID = /^[A-Za-z0-9_-]{6,20}$/;

/** Reject obviously internal destinations so a pasted URL cannot probe our network. */
export function isBlockedHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (host === 'localhost' || host === '::1' || host === '0.0.0.0') return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
  if (/\.(local|internal|localhost)$/.test(host)) return true;
  return false;
}

/**
 * Parse a pasted link.
 * @returns {{ok: true, platform: 'youtube'|'direct', url: string, videoId?: string, kind?: string}
 *          |{ok: false, platform?: string, error: string}}
 */
export function parseVideoUrl(input) {
  const raw = String(input || '').trim();
  if (!raw) return { ok: false, error: 'Paste a video link first.' };
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: 'That is not a valid URL. It must start with http:// or https://.' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Only http and https links are supported.' };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: 'That host is not reachable from the studio server.' };
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!YT_HOSTS.has(host)) {
    return { ok: true, platform: 'direct', url: parsed.href };
  }

  let videoId = '';
  if (host === 'youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else {
    videoId = parsed.searchParams.get('v') || '';
    if (!videoId) {
      const match = parsed.pathname.match(/^\/(?:shorts|live|embed|v|e)\/([^/?#]+)/);
      if (match) videoId = match[1];
    }
  }
  videoId = videoId.trim();
  if (!VIDEO_ID.test(videoId)) {
    return {
      ok: false,
      platform: 'youtube',
      error: 'That YouTube link does not contain a video id. Use a watch, youtu.be, Shorts or live URL.',
    };
  }
  const path = parsed.pathname;
  const kind = /^\/shorts\//.test(path) ? 'short' : /^\/live\//.test(path) ? 'live' : 'video';
  return { ok: true, platform: 'youtube', videoId, kind, url: `https://www.youtube.com/watch?v=${videoId}` };
}

/**
 * Real metadata via YouTube's public oEmbed endpoint. No key, no quota, no auth.
 */
export async function fetchYouTubeMetadata(videoId, { timeoutMs = 12000, fetchImpl = fetch } = {}) {
  const target = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`
  )}&format=json`;
  let response;
  try {
    response = await fetchImpl(target, {
      headers: { accept: 'application/json', 'user-agent': 'TJ-OpenClips/2.0 (+link-inspect)' },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return { ok: false, status: 0, error: `YouTube did not respond: ${error.message}` };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      status: response.status,
      error: 'This video is private, age-restricted or not publicly embeddable, so YouTube will not share its details.',
    };
  }
  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      error: 'YouTube could not find that video. It may be deleted, unlisted or restricted in this region.',
    };
  }
  if (!response.ok) {
    return { ok: false, status: response.status, error: `YouTube returned HTTP ${response.status} for that video.` };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: response.status, error: 'YouTube returned a response that could not be read.' };
  }
  return {
    ok: true,
    title: typeof data.title === 'string' ? data.title : '',
    channel: typeof data.author_name === 'string' ? data.author_name : '',
    channelUrl: typeof data.author_url === 'string' ? data.author_url : '',
    thumbnail: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : '',
  };
}

/**
 * Check whether a plain URL really serves media bytes.
 * Uses HEAD, then falls back to a one-byte ranged GET for servers that reject HEAD.
 */
export async function inspectDirectMedia(url, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const readType = async (response) => (response.headers.get('content-type') || '').toLowerCase();

  let response;
  try {
    response = await fetchImpl(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: { 'user-agent': 'TJ-OpenClips/2.0 (+link-inspect)' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 405 || response.status === 501 || response.status === 403) {
      response = null;
    }
  } catch {
    response = null;
  }

  if (!response) {
    try {
      response = await fetchImpl(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'user-agent': 'TJ-OpenClips/2.0 (+link-inspect)', range: 'bytes=0-1' },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      return { ok: false, mediaAccessible: false, error: `The link could not be reached: ${error.message}` };
    }
  }

  if (!response.ok && response.status !== 206) {
    return {
      ok: false,
      mediaAccessible: false,
      error: `The link responded HTTP ${response.status}. It may need a sign-in or may have expired.`,
    };
  }

  const type = await readType(response);
  const looksMedia = /^(video|audio)\//i.test(type) || /application\/(octet-stream|mp4)/i.test(type);
  if (!looksMedia) {
    return {
      ok: true,
      mediaAccessible: false,
      contentType: type || 'unknown',
      error: `That URL returns "${type || 'unknown content'}", not a video file. Platform pages cannot be downloaded directly — upload the file instead.`,
    };
  }
  const length = Number(response.headers.get('content-length') || 0);
  return { ok: true, mediaAccessible: true, contentType: type, sizeBytes: Number.isFinite(length) ? length : 0 };
}

/**
 * Full inspection used by POST /api/videos/inspect.
 * Always returns a shape the UI can render; never throws for a bad link.
 */
export async function inspectVideoUrl(input, options = {}) {
  const parsed = parseVideoUrl(input);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error, platform: parsed.platform || 'unknown' };
  }

  if (parsed.platform === 'youtube') {
    const meta = await fetchYouTubeMetadata(parsed.videoId, options);
    const workflows = [
      {
        id: 'upload',
        label: 'Upload the video file',
        available: true,
        detail: 'Download it yourself, then upload the MP4 here. Rendering and clipping run fully on this server.',
      },
      {
        id: 'direct',
        label: 'Paste a direct media URL',
        available: true,
        detail: 'A link that ends in the video file itself (MP4/MOV/WEBM) can be downloaded and processed.',
      },
    ];

    if (!meta.ok) {
      return {
        ok: false,
        platform: 'youtube',
        videoId: parsed.videoId,
        url: parsed.url,
        mediaAccessible: false,
        error: meta.error,
        workflows,
      };
    }

    return {
      ok: true,
      platform: 'youtube',
      kind: parsed.kind,
      videoId: parsed.videoId,
      url: parsed.url,
      watchUrl: parsed.url,
      title: meta.title,
      channel: meta.channel,
      channelUrl: meta.channelUrl,
      thumbnail: meta.thumbnail,
      durationSeconds: null,
      captionsAvailable: false,
      mediaAccessible: false,
      method: 'oembed-metadata',
      message:
        'Metadata retrieved from YouTube. YouTube blocks automated media downloads from server IPs (bot verification), so the video file itself cannot be fetched here. Upload the file or paste a direct media link to clip it.',
      workflows,
    };
  }

  const media = await inspectDirectMedia(parsed.url, options);
  const hostname = (() => {
    try {
      return new URL(parsed.url).hostname;
    } catch {
      return '';
    }
  })();

  return {
    ok: true,
    platform: 'direct',
    url: parsed.url,
    host: hostname,
    title: decodeURIComponent((parsed.url.split('/').pop() || '').split('?')[0] || 'Linked video').slice(0, 160),
    channel: hostname,
    thumbnail: '',
    durationSeconds: null,
    captionsAvailable: false,
    mediaAccessible: Boolean(media.mediaAccessible),
    contentType: media.contentType || null,
    sizeBytes: media.sizeBytes || 0,
    method: media.mediaAccessible ? 'direct-media' : 'none',
    message: media.mediaAccessible
      ? 'The server can download this file directly. It will be validated with ffprobe during import.'
      : media.error || 'That link does not serve a downloadable video file.',
    workflows: [
      { id: 'direct', label: 'Download this link', available: Boolean(media.mediaAccessible), detail: 'The URL serves media bytes the server can fetch.' },
      { id: 'upload', label: 'Upload the video file', available: true, detail: 'Upload an MP4/MOV/WEBM from your device instead.' },
    ],
  };
}
