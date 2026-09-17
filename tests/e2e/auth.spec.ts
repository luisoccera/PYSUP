import { expect, test } from '@playwright/test';
import type { Server } from 'node:http';
import { startTestServer, stopTestServer } from './testServer';

let server: Server;
test.beforeAll(async () => { server = await startTestServer(); });
test.afterAll(async () => { await stopTestServer(server); });

test('muestra autenticación real y no concede acceso con credenciales arbitrarias', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Qué bueno verte')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Entrar al demo local' })).toHaveCount(0);
  await page.getByPlaceholder('nombre@correo.com').first().fill('persona@example.com');
  await page.getByPlaceholder('Tu contraseña').fill('contraseña-segura');
  await page.getByRole('button', { name: 'Entrar a PYSUP' }).click();
  await expect(page.getByText('Configura Supabase en .env antes de iniciar sesión.')).toBeVisible();
  await expect(page.getByText('Qué bueno verte')).toBeVisible();
});

test('valida registro y aceptación de términos', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Crear cuenta', { exact: true }).click();
  await page.getByPlaceholder('¿Cómo te llamamos?').fill('L');
  await page.getByPlaceholder('nombre@correo.com').first().fill('correo-invalido');
  await page.getByPlaceholder('Mínimo 12 caracteres').fill('123');
  await page.getByPlaceholder('Repite tu contraseña').fill('distinta');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByText('Ingresa un correo válido.')).toBeVisible();
  await expect(page.getByText('Debes aceptar los términos para continuar.')).toBeVisible();
});

test('cabeceras bloquean scripts inline y el servidor rechaza escrituras', async ({ page, request }) => {
  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
  const connectSources = response?.headers()['content-security-policy'].split(';').find((directive) => directive.trim().startsWith('connect-src'))?.trim().split(/\s+/);
  expect(connectSources).not.toContain('https:');
  expect(connectSources).not.toContain('wss:');
  expect(response?.headers()['x-frame-options']).toBe('DENY');
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.pysupInjected = true';
    document.body.appendChild(script);
  });
  expect(await page.evaluate(() => 'pysupInjected' in window)).toBe(false);
  expect((await request.post('/')).status()).toBe(405);
});

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
  test(`autenticación se adapta a ${width}x${height} sin desbordamiento horizontal`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Entrar a PYSUP' })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
  });
}
