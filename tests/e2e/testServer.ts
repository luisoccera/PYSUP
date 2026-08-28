import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

export async function startTestServer(port = 8090) {
  const root = resolve(process.cwd(), 'dist');
  const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', `http://127.0.0.1:${port}`).pathname);
    const safePath = normalize(pathname === '/' ? 'index.html' : pathname.replace(/^[/\\]+/, ''));
    let filePath = join(root, safePath);
    if (!filePath.startsWith(root) || !existsSync(filePath) || !statSync(filePath).isFile()) filePath = join(root, 'index.html');
    response.setHeader('Content-Type', mime[extname(filePath)] ?? 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-store');
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
