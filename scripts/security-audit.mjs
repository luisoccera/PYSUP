import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirectories = new Set(['.git', '.expo', 'node_modules', 'dist', 'coverage', 'playwright-report', 'test-results']);
const binaryExtensions = new Set(['.ico', '.jpg', '.jpeg', '.png', '.ttf', '.woff', '.woff2', '.mp4', '.mov', '.webm', '.zip']);
const findings = [];

function filesystemFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? filesystemFiles(absolute) : [relative(root, absolute).replaceAll('\\', '/')];
  });
}

function candidateFiles() {
  try {
    const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    if (tracked.length || untracked.length) return [...new Set([...tracked, ...untracked])];
  } catch { /* La copia de trabajo sin .git usa el recorrido seguro. */ }
  return filesystemFiles(root);
}

const secretPatterns = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['Supabase secret key', new RegExp(`sb_${'secret'}_[A-Za-z0-9_-]{20,}`)],
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['Google API key', /AIza[0-9A-Za-z_-]{35}/],
  ['GitHub token', /gh[opusr]_[A-Za-z0-9]{30,}/],
  ['Stripe live key', /(?:sk|rk)_live_[A-Za-z0-9]{20,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{20,}/],
];

function scanSource(normalized, source) {
  for (const [label, pattern] of secretPatterns) if (pattern.test(source)) findings.push(`${normalized}: posible ${label}`);
  if (/EXPO_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|PRIVATE_KEY|CLIENT_SECRET|ACCESS_TOKEN)/.test(source)) findings.push(`${normalized}: secreto nombrado como variable pública`);
  for (const token of source.match(/[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g) ?? []) {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      if (payload.role === 'service_role') findings.push(`${normalized}: JWT service_role`);
    } catch { /* No es un JWT JSON válido. */ }
  }
}

for (const file of candidateFiles()) {
  const normalized = file.replaceAll('\\', '/');
  const base = normalized.split('/').at(-1) ?? '';
  if ((base === '.env' || (base.startsWith('.env.') && base !== '.env.example')) || /\.(?:pem|p8|p12|jks|keystore|mobileprovision)$/i.test(base)) {
    findings.push(`${normalized}: archivo sensible incluido`);
    continue;
  }
  const absolute = join(root, file);
  if (binaryExtensions.has(extname(base).toLowerCase()) || statSync(absolute).size > 2 * 1024 * 1024) continue;
  scanSource(normalized, readFileSync(absolute, 'utf8'));
}

if (process.argv.includes('--history')) {
  try {
    const objects = execFileSync('git', ['rev-list', '--objects', '--all'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).split('\n');
    let scanned = 0;
    for (const object of objects) {
      const separator = object.indexOf(' ');
      if (separator < 0) continue;
      const hash = object.slice(0, separator);
      const name = object.slice(separator + 1);
      if (binaryExtensions.has(extname(name).toLowerCase())) continue;
      const type = execFileSync('git', ['cat-file', '-t', hash], { encoding: 'utf8' }).trim();
      if (type !== 'blob') continue;
      const size = Number(execFileSync('git', ['cat-file', '-s', hash], { encoding: 'utf8' }));
      if (size > 2 * 1024 * 1024) continue;
      scanSource(`history:${hash.slice(0, 8)}:${name}`, execFileSync('git', ['cat-file', 'blob', hash], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
      scanned += 1;
    }
    console.log(`HISTORY_BLOBS_SCANNED=${scanned}`);
  } catch {
    console.error('No fue posible auditar el historial Git.');
    process.exit(1);
  }
}

if (findings.length) {
  console.error('SECURITY_AUDIT_FAILED');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}
console.log('SECURITY_AUDIT_OK: no se detectaron credenciales privadas en los archivos del proyecto.');
