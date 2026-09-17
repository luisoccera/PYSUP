import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const require = createRequire(import.meta.url);
const { assertPublicEnvironment } = require('../scripts/public-env-guard.cjs') as { assertPublicEnvironment: (env: Record<string, string>) => void };

describe('protección de secretos antes de compilar Expo/EAS', () => {
  it('acepta claves públicas y secretos sólo en variables privadas del servidor', () => {
    expect(() => assertPublicEnvironment({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${'a'.repeat(24)}`, SUPABASE_SERVICE_ROLE_KEY: `sb_${'secret'}_${'a'.repeat(24)}` })).not.toThrow();
  });
  it('rechaza una clave privada aunque se nombre publishable sin mostrarla', () => {
    const secret = `sb_${'secret'}_${'a'.repeat(24)}`;
    try { assertPublicEnvironment({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: secret }); throw new Error('guard_did_not_reject'); }
    catch (error) { expect(String(error)).toContain('credencial privada'); expect(String(error)).not.toContain(secret); }
  });
  it('rechaza JWT service_role dentro de cualquier variable pública', () => {
    const jwt = `header.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
    expect(() => assertPublicEnvironment({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: jwt })).toThrow('credencial privada');
  });
  it('rechaza URLs públicas que llevan contraseña o token', () => {
    expect(() => assertPublicEnvironment({ EXPO_PUBLIC_API_URL: 'https://user:password@example.test' })).toThrow();
    expect(() => assertPublicEnvironment({ EXPO_PUBLIC_API_URL: 'https://example.test?access_token=private' })).toThrow();
  });
});
