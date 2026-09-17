import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, relative, resolve } from 'node:path';

export async function startTestServer(port = 8090) {
  const root = resolve(process.cwd(), 'dist');
  const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as { headers: { headers: { key: string; value: string }[] }[] };
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
  const server = createServer((request, response) => {
    for (const header of config.headers[0].headers) {
      if (header.key === 'Strict-Transport-Security') continue; // HTTPS corresponde al host de producción.
      response.setHeader(header.key, header.value.replace('; upgrade-insecure-requests', ''));
    }
    if (!['GET', 'HEAD'].includes(request.method ?? '') || (request.url?.length ?? 0) > 2048) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname); }
    catch { response.writeHead(400); response.end(); return; }
    const safePath = normalize(pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, ''));
    let filePath = join(root, safePath);
    if (relative(root, filePath).startsWith('..') || !existsSync(filePath) || !statSync(filePath).isFile()) filePath = join(root, 'index.html');
    response.setHeader('Content-Type', mime[extname(filePath)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
    if (request.method === 'HEAD') { response.end(); return; }
    createReadStream(filePath).pipe(response);
  });
  await new Promise<void>((resolveListening, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolveListening());
  });
  return server;
}

export async function stopTestServer(server: Server) {
  server.closeAllConnections?.();
  await new Promise<void>((resolveClosed) => server.close(() => resolveClosed()));
}
