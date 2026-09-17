import { describe, expect, it } from 'vitest';
import { constantTimeSecretMatch, originAllowed, readLimitedText } from '../supabase/functions/_shared/security';
import { isPublicSupabaseKey } from '../src/config/env';
import { validateCurrentPassword } from '../src/utils/validation';
import { createRequire } from 'node:module';
import { collectPages } from '../supabase/functions/_shared/pagination';

describe('protecciones ejecutables de servidor', () => {
  it('CORS falla cerrado y no confunde dominios parecidos', () => {
    expect(originAllowed('https://pysup.example', ['https://pysup.example'])).toBe(true);
    expect(originAllowed('https://pysup.example.evil.test', ['https://pysup.example'])).toBe(false);
    expect(originAllowed('http://localhost:8081', [])).toBe(false);
    expect(originAllowed('http://localhost:8081', [], true)).toBe(true);
    expect(originAllowed(null, [])).toBe(true);
  });

  it('limita un cuerpo incluso cuando no declara Content-Length', async () => {
    await expect(readLimitedText(new Response('x'.repeat(500)), 20)).rejects.toThrow('request_too_large');
    await expect(readLimitedText(new Response('áéí'), 6)).resolves.toBe('áéí');
    await expect(readLimitedText(new Response('áéí'), 5)).rejects.toThrow();
  });

  it('rechaza tamaños declarados mayores antes de leer', async () => {
    await expect(readLimitedText(new Response('ok', { headers: { 'Content-Length': '1000' } }), 10)).rejects.toThrow();
  });

  it('compara secretos y no acepta credenciales vacías o enormes', async () => {
    expect(await constantTimeSecretMatch('secreto-de-prueba', 'secreto-de-prueba')).toBe(true);
    expect(await constantTimeSecretMatch('diferente', 'secreto-de-prueba')).toBe(false);
    expect(await constantTimeSecretMatch('', '')).toBe(false);
    expect(await constantTimeSecretMatch('x'.repeat(2000), 'x'.repeat(2000))).toBe(false);
  });

  it('no bloquea contraseñas existentes por una política nueva', () => {
    expect(validateCurrentPassword('antigua8')).toBe('antigua8');
    expect(() => validateCurrentPassword('')).toThrow();
  });

  it('la clave de DB debe ser pública reconocida, no arbitraria', () => {
    expect(isPublicSupabaseKey('clave-arbitraria')).toBe(false);
    expect(isPublicSupabaseKey(`sb_publishable_${'a'.repeat(24)}`)).toBe(true);
  });

  it('la corrección de UUID mantiene el generador de proyecto iOS', () => {
    const require = createRequire(import.meta.url);
    const project = require('xcode').project('unused.pbxproj');
    project.hash = { project: { objects: {} } };
    expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
  });

  it('exporta más de 500 filas sin truncar la segunda página', async () => {
    const source = Array.from({ length: 700 }, (_, id) => ({ id }));
    const rows = await collectPages(async (from, to) => ({ data: source.slice(from, to + 1), error: null }));
    expect(rows).toHaveLength(700);
    expect(rows[699].id).toBe(699);
  });

  it('la exportación excesiva o con errores nunca retorna datos parciales', async () => {
    await expect(collectPages(async () => ({ data: [1, 2], error: null }), 3, 2)).rejects.toThrow('export_too_large');
    await expect(collectPages(async () => ({ data: null, error: new Error('network_failure') }))).rejects.toThrow('network_failure');
  });
});
