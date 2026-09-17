import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, relative } from 'node:path';

const port = Number(process.argv[2] ?? 8090);
const root = join(process.cwd(), 'dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; media-src 'self' blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://exp.host https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

const server = createServer((request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? '') || (request.url?.length ?? 0) > 2048) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, '');
  const safePath = normalize(relativePath);
  let filePath = join(root, safePath);
  const escapedRoot = relative(root, filePath).startsWith('..');
  if (escapedRoot || !existsSync(filePath) || !statSync(filePath).isFile()) filePath = join(root, 'index.html');
  response.setHeader('Content-Type', mime[extname(filePath)] ?? 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  Object.entries(securityHeaders).forEach(([name, value]) => response.setHeader(name, value));
  if (request.method === 'HEAD') { response.end(); return; }
  createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1');
const close = () => {
  server.closeAllConnections?.();
  server.close();
  process.exit(0);
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
