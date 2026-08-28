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
  await page.getByPlaceholder('Mínimo 8 caracteres').fill('contraseña-segura');
  await page.getByRole('button', { name: 'Entrar a PYSUP' }).click();
  await expect(page.getByText('Configura Supabase en .env antes de iniciar sesión.')).toBeVisible();
  await expect(page.getByText('Qué bueno verte')).toBeVisible();
});

test('valida registro y aceptación de términos', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Crear cuenta', { exact: true }).click();
  await page.getByPlaceholder('¿Cómo te llamamos?').fill('L');
  await page.getByPlaceholder('nombre@correo.com').first().fill('correo-invalido');
  await page.getByPlaceholder('Mínimo 8 caracteres').fill('123');
  await page.getByPlaceholder('Repite tu contraseña').fill('distinta');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByText('Ingresa un correo válido.')).toBeVisible();
  await expect(page.getByText('Debes aceptar los términos para continuar.')).toBeVisible();
});
