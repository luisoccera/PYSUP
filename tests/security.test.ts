import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isUnsafeSupabaseKey } from '../src/config/env';

const root = resolve(__dirname, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

describe('endurecimiento de seguridad', () => {
  it('rechaza claves privadas de Supabase en el cliente', () => {
    expect(isUnsafeSupabaseKey(`sb_${'secret'}_abcdefghijklmnopqrstuvwxyz`)).toBe(true);
    const servicePayload = Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url');
    expect(isUnsafeSupabaseKey(`header.${servicePayload}.signature`)).toBe(true);
    expect(isUnsafeSupabaseKey('sb_publishable_publica')).toBe(false);
  });

  it('fuerza RLS y bloquea campos controlados por servidor', () => {
    const migration = read('supabase/migrations/202608280001_security_hardening.sql');
    expect(migration).toContain('force row level security');
    expect(migration).toContain('revoke all on all tables in schema public from anon');
    expect(migration).toContain('protect_manual_provider_connection');
    expect(migration).toContain('protect_room_creation');
    expect(migration).toContain('clip_jobs_own_insert');
    expect(migration).toContain("statement_timeout = '10s'");
  });

  it('limita Auth, sesiones y filas de API', () => {
    const config = read('supabase/config.toml');
    expect(config).toContain('max_rows = 500');
    expect(config).toContain('sign_in_sign_ups = 10');
    expect(config).toContain('enable_anonymous_sign_ins = false');
    expect(config).toContain('secure_password_change = true');
    expect(config).toContain('inactivity_timeout = "24h"');
  });

  it('protege Edge Functions sin CORS global ni errores internos', () => {
    const shared = read('supabase/functions/_shared/client.ts');
    expect(shared).not.toContain("'Access-Control-Allow-Origin': '*'");
    expect(shared).toContain('ALLOWED_ORIGINS');
    expect(shared).toContain('MAX_JSON_RESPONSE_BYTES');
    expect(shared).toContain('verifySharedSecret');
    expect(shared).toContain('hashClientAddress');
  });

  it('publica cabeceras web y fuerza la actualización a HTTPS', () => {
    const vercel = read('vercel.json');
    expect(vercel).toContain('Content-Security-Policy');
    expect(vercel).toContain('Strict-Transport-Security');
    expect(vercel).toContain('upgrade-insecure-requests');
    expect(vercel).toContain('X-Frame-Options');
  });

  it('integra CAPTCHA, límite local y auditorías automáticas', () => {
    expect(read('src/services/auth/authService.ts')).toContain('captchaToken');
    expect(read('src/services/auth/authThrottle.ts')).toContain('MAX_FAILURES = 5');
    expect(read('src/views/components/TurnstileChallenge.web.tsx')).toContain('challenges.cloudflare.com');
    const packageJson = JSON.parse(read('package.json'));
    expect(packageJson.scripts).toMatchObject({
      'security:secrets': 'node scripts/security-audit.mjs',
      'security:deps': 'npm audit --audit-level=high',
    });
    expect(read('.github/workflows/security.yml')).toContain('schedule:');
  });
});
