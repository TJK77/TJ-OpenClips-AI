/**
 * Thin API client. Every call is same-origin and cookie-authenticated, so the
 * browser never holds a provider key, session token or Buffer secret.
 */

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body || {};
    this.needsCredentials = Boolean(body && body.needsCredentials);
    this.needsEnvironment = (body && body.needsEnvironment) || [];
  }
}

async function request(path, { method = 'GET', body, headers, raw } = {}) {
  const options = { method, credentials: 'same-origin', headers: { ...(headers || {}) } };
  if (body !== undefined) {
    if (raw) {
      options.body = body;
    } else {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
  }
  let res;
  try {
    res = await fetch(path, options);
  } catch (error) {
    throw new ApiError('Network error — the studio server could not be reached.', 0, {});
  }
  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { error: text.slice(0, 300) };
    }
  }
  if (!res.ok) {
    const message = (payload && (payload.error || payload.message)) || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload || {});
  }
  return payload;
}

export const api = {
  config: () => request('/api/config'),
  state: () => request('/api/state'),

  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/me'),

  updateProfile: (payload) => request('/api/me', { method: 'PATCH', body: payload }),
  changePassword: (payload) => request('/api/me/password', { method: 'POST', body: payload }),
  saveSettings: (payload) => request('/api/settings', { method: 'PATCH', body: payload }),
  purgeAccount: () => request('/api/account/purge', { method: 'POST' }),

  providers: () => request('/api/providers'),
  saveProvider: (id, payload) => request(`/api/providers/${id}`, { method: 'PUT', body: payload }),
  removeProvider: (id) => request(`/api/providers/${id}`, { method: 'DELETE' }),
  testProvider: (id) => request(`/api/providers/${id}/test`, { method: 'POST' }),

  uploadVideo: (file, meta, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/videos/upload');
      xhr.withCredentials = true;
      xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name || 'upload.mp4'));
      xhr.setRequestHeader('x-title', encodeURIComponent(meta.title || ''));
      xhr.setRequestHeader('x-project', encodeURIComponent(meta.project || ''));
      xhr.setRequestHeader('x-language', encodeURIComponent(meta.language || 'English (US)'));
      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onerror = () => reject(new ApiError('Upload failed — check your connection and try again.', 0, {}));
      xhr.onload = () => {
        let payload = {};
        try {
          payload = JSON.parse(xhr.responseText || '{}');
        } catch {
          payload = { error: 'Upload failed.' };
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(new ApiError(payload.error || `Upload failed (${xhr.status})`, xhr.status, payload));
      };
      xhr.send(file);
    }),

  inspectUrl: (payload) => request('/api/videos/inspect', { method: 'POST', body: payload }),
  importUrl: (payload) => request('/api/videos/import', { method: 'POST', body: payload }),
  videos: () => request('/api/videos'),
  deleteVideo: (id) => request(`/api/videos/${id}`, { method: 'DELETE' }),

  startJob: (payload) => request('/api/jobs', { method: 'POST', body: payload }),
  job: (id) => request(`/api/jobs/${id}`),
  retryJob: (id) => request(`/api/jobs/${id}/retry`, { method: 'POST' }),

  clips: () => request('/api/clips'),
  updateClip: (id, payload) => request(`/api/clips/${id}`, { method: 'PATCH', body: payload }),
  renderClip: (id, payload) => request(`/api/clips/${id}/render`, { method: 'POST', body: payload }),
  deleteClip: (id) => request(`/api/clips/${id}`, { method: 'DELETE' }),

  posts: () => request('/api/posts'),
  createPost: (payload) => request('/api/posts', { method: 'POST', body: payload }),
  updatePost: (id, payload) => request(`/api/posts/${id}`, { method: 'PATCH', body: payload }),
  deletePost: (id) => request(`/api/posts/${id}`, { method: 'DELETE' }),
  sendPost: (id) => request(`/api/posts/${id}/send`, { method: 'POST' }),

  bufferStatus: () => request('/api/buffer/status'),
  bufferAuthorize: () => request('/api/buffer/authorize'),
  bufferToken: (token) => request('/api/buffer/token', { method: 'POST', body: { token } }),
  bufferDisconnect: () => request('/api/buffer/disconnect', { method: 'POST' }),
  bufferChannels: () => request('/api/buffer/refresh', { method: 'POST' }),

  analytics: () => request('/api/analytics'),
  captionStyle: (payload) => request('/api/clips/apply-caption-style', { method: 'POST', body: payload }),
  generateCaption: (payload) => request('/api/ai/caption', { method: 'POST', body: payload }),
};

export default api;
