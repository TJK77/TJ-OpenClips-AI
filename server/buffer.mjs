import { createHmac } from 'node:crypto';
import { config, bufferConfigured } from './config.mjs';

/**
 * Buffer integration.
 *
 * Buffer does not accept a bare API key for new applications: publishing
 * requires an OAuth2 client issued by Buffer. This module implements the real
 * OAuth2 authorization-code flow plus the legacy access-token path for accounts
 * that already have one. When no client credentials are present the API reports
 * `configured: false` instead of pretending a connection exists.
 */

export class BufferError extends Error {
  constructor(status, detail, hint) {
    super(detail || `Buffer request failed (${status})`);
    this.status = status;
    this.detail = detail;
    this.hint = hint;
  }
}

async function bufferFetch(path, { method = 'GET', token, body, timeout = 30000 } = {}) {
  const url = `${config.buffer.apiBase}${path}`;
  let response;
  try {
    response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(timeout),
      headers: {
        authorization: `Bearer ${token}`,
        'user-agent': 'TJ-OpenClips-AI-Studio/2.0',
        ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body,
    });
  } catch (error) {
    throw new BufferError(0, `Could not reach Buffer: ${error.message}`, 'Check the server network and retry.');
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const detail =
      data?.error?.message ||
      data?.message ||
      (typeof data?.error === 'string' ? data.error : '') ||
      `Buffer responded ${response.status}`;
    throw new BufferError(
      response.status,
      String(detail).slice(0, 400),
      response.status === 401
        ? 'The Buffer access token is invalid or expired. Reconnect Buffer.'
        : response.status === 403
          ? 'This Buffer account or plan does not allow this action.'
          : undefined
    );
  }
  return data;
}

export function authorizeUrl(state) {
  if (!bufferConfigured()) return null;
  const params = new URLSearchParams({
    client_id: config.buffer.clientId,
    redirect_uri: `${config.buffer.redirectBase || ''}${config.buffer.redirectPath}`,
    response_type: 'code',
    state,
  });
  return `${config.buffer.authorizeUrl}?${params.toString()}`;
}

export function redirectUri(origin) {
  return `${origin}${config.buffer.redirectPath}`;
}

export function authorizationLink(state, origin) {
  if (!bufferConfigured()) return null;
  const params = new URLSearchParams({
    client_id: config.buffer.clientId,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    state,
  });
  return `${config.buffer.authorizeUrl}?${params.toString()}`;
}

export async function exchangeCode(code, origin) {
  if (!bufferConfigured()) {
    throw new BufferError(501, 'Buffer OAuth is not configured on this server.', 'Set BUFFER_CLIENT_ID and BUFFER_CLIENT_SECRET.');
  }
  const body = new URLSearchParams({
    client_id: config.buffer.clientId,
    client_secret: config.buffer.clientSecret,
    redirect_uri: redirectUri(origin),
    code,
    grant_type: 'authorization_code',
  }).toString();

  const response = await fetch(config.buffer.tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'TJ-OpenClips-AI-Studio/2.0' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok || !data?.access_token) {
    throw new BufferError(
      response.status,
      data?.error_description || data?.error || `Buffer token exchange failed (${response.status})`,
      'Check the Buffer client credentials and the registered redirect URL.'
    );
  }
  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
    scope: data.scope || null,
    expiresIn: data.expires_in || null,
  };
}

export async function listChannels(token) {
  const data = await bufferFetch('/profiles.json', { token });
  const profiles = Array.isArray(data) ? data : data?.profiles || [];
  return profiles.map((p) => ({
    id: String(p.id),
    service: String(p.service || p.service_username || 'unknown'),
    name: String(p.service_username || p.formatted_username || p.name || p.service || 'Channel'),
    avatar: p.avatar || p.avatar_https || null,
    timezone: p.timezone || null,
    scheduling: p.schedules?.length ? true : false,
  }));
}

export async function createUpdate(token, { channelIds, text, mediaUrl, scheduledAt }) {
  const body = new URLSearchParams();
  for (const id of channelIds) body.append('profile_ids[]', id);
  body.append('text', text || '');
  if (mediaUrl) {
    body.append('media[video]', mediaUrl);
    body.append('media[thumbnail]', mediaUrl);
  }
  if (scheduledAt) body.append('scheduled_at', scheduledAt);
  else body.append('now', 'false');

  const data = await bufferFetch('/updates/create.json', { method: 'POST', token, body: body.toString() });
  const update = data?.updates?.[0] || null;
  return {
    ok: Boolean(update),
    updates: (data?.updates || []).map((u) => ({
      id: String(u.id),
      status: String(u.status || 'buffer'),
      channelId: String(u.profile_id || ''),
      text: String(u.text || ''),
      scheduledAt: u.scheduled_at ? new Date(Number(u.scheduled_at) * 1000).toISOString() : null,
      service: u.profile_service || null,
    })),
    raw: data?.success === false ? data?.message || 'Buffer rejected the update.' : null,
  };
}

/** Signed, expiring public URL so Buffer can fetch a rendered clip. */
export function signClipToken(clipId, ttlSeconds = 3600) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = createHmac('sha256', config.sessionSecret).update(`${clipId}.${exp}`).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifyClipToken(clipId, token) {
  const [exp, sig] = String(token || '').split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return false;
  const expected = createHmac('sha256', config.sessionSecret).update(`${clipId}.${exp}`).digest('base64url');
  return expected.length === sig.length && expected === sig;
}
