import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';

export function createRouter() {
  const routes = [];

  const add = (method, pattern, handler) => {
    routes.push({ method, parts: pattern.split('/').filter(Boolean), handler });
  };

  return {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    patch: (p, h) => add('PATCH', p, h),
    put: (p, h) => add('PUT', p, h),
    del: (p, h) => add('DELETE', p, h),
    match(method, pathname) {
      const segments = pathname.split('/').filter(Boolean);
      for (const route of routes) {
        if (route.method !== method) continue;
        if (route.parts.length !== segments.length) continue;
        const params = {};
        let ok = true;
        for (let i = 0; i < route.parts.length; i += 1) {
          const part = route.parts[i];
          if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(segments[i]);
          else if (part !== segments[i]) {
            ok = false;
            break;
          }
        }
        if (ok) return { handler: route.handler, params };
      }
      return null;
    },
  };
}

export function applySecurityHeaders(res) {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('x-frame-options', 'SAMEORIGIN');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'content-security-policy',
    [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob: data:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
}

export function json(res, status, payload) {
  const body = JSON.stringify(payload ?? {});
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function fail(res, status, message, extra = {}) {
  json(res, status, { error: message, ...extra });
}

export function readJson(req, limit = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(Object.assign(new Error('Request body too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

/** Streams an upload straight to disk, aborting if it exceeds the limit. */
export function streamToFile(req, filePath, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let aborted = false;
    const out = createWriteStream(filePath);
    const abort = (error) => {
      if (aborted) return;
      aborted = true;
      out.destroy();
      unlink(filePath).catch(() => {});
      reject(error);
    };
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        abort(Object.assign(new Error(`Upload exceeds the ${Math.round(limit / 1048576)} MB limit.`), { status: 413 }));
        req.destroy();
      }
    });
    req.on('error', abort);
    out.on('error', abort);
    out.on('finish', () => {
      if (aborted) return;
      if (!size) return abort(Object.assign(new Error('Empty upload body.'), { status: 400 }));
      resolve(size);
    });
    req.pipe(out);
  });
}

export function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  for (const pair of header.split(';')) {
    const index = pair.indexOf('=');
    if (index < 0) continue;
    const key = pair.slice(0, index).trim();
    if (key) out[key] = decodeURIComponent(pair.slice(index + 1).trim());
  }
  return out;
}

export function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.secure) parts.push('Secure');
  res.appendHeader?.('set-cookie', parts.join('; ')) ??
    appendHeader(res, parts.join('; '));
}

function appendHeader(res, cookie) {
  const existing = res.getHeader('set-cookie');
  if (!existing) res.setHeader('set-cookie', cookie);
  else res.setHeader('set-cookie', [].concat(existing, cookie));
}

export function isSecureRequest(req) {
  return (
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean(req.socket?.encrypted) ||
    String(req.headers.origin || '').startsWith('https://')
  );
}

export const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
