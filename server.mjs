import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { router } from './server/api.mjs';
import { currentUser } from './server/api.mjs';
import { fail, clientIp } from './server/http.mjs';
import { rateLimit } from './server/security.mjs';
import { dirs } from './server/config.mjs';

const root = fileURLToPath(new URL('./dist/', import.meta.url));
const port = Number(process.env.PORT || 3000);

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4',
};

const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'SAMEORIGIN',
  'cross-origin-opener-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

async function serveStatic(req, res, pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const target = normalize(join(root, relative));
  if (!target.startsWith(root.endsWith(sep) ? root : root + sep) && target !== root) {
    return fail(res, 403, 'Forbidden');
  }

  let filePath = target;
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {
    filePath = join(root, 'index.html');
  }

  try {
    const body = await readFile(filePath);
    const ext = extname(filePath).toLowerCase();
    const isHtml = ext === '.html';
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'content-type': types[ext] || 'application/octet-stream',
      'cache-control': isHtml ? 'no-cache' : 'public, max-age=31536000, immutable',
      'content-length': body.length,
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.setHeader('cache-control', 'no-store');
    if (!rateLimit(`api:${clientIp(req)}`, 600, 60 * 1000)) {
      return fail(res, 429, 'Too many requests. Slow down for a moment.');
    }
    try {
      const matched = router.match(req.method, pathname);
      if (!matched) return fail(res, 404, 'Unknown API endpoint.');
      const ctx = {
        params: matched.params,
        query: url.searchParams,
        user: currentUser(req),
      };
      return await matched.handler(req, res, ctx);
    } catch (error) {
      const status = Number(error?.status) || 500;
      const message =
        status >= 500 && !error?.expose
          ? 'The server hit an unexpected error. Try again, and check the processing logs if it repeats.'
          : error.message;
      console.error('[api]', req.method, pathname, '-', error?.message);
      if (!res.headersSent) return fail(res, status, message);
      return res.end();
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return fail(res, 405, 'Method not allowed.');
  }
  return serveStatic(req, res, pathname);
});

server.requestTimeout = 0;
server.headersTimeout = 65_000;
server.keepAliveTimeout = 61_000;

server.listen(port, '0.0.0.0', () => {
  console.log(`TJ OpenClips AI Studio listening on 0.0.0.0:${port}`);
  console.log(`Data directory: ${dirs.data}`);
});

const shutdown = () => {
  console.log('Shutting down...');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 8000).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
