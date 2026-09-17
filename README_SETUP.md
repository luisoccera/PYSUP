# Configuración de PYSUP

## 1. Requisitos

- Node.js 24.x (la misma versión mayor utilizada en CI).
- npm y Expo compatibles con el `package-lock.json`.
- Una cuenta de Supabase.
- Una cuenta Expo/EAS para builds y notificaciones móviles.
- Para iOS nativo: macOS/Xcode o EAS Build.

## 2. Crear Supabase

1. Crea un proyecto nuevo en el panel de Supabase.
2. En **Project Settings > API**, copia la URL y la clave pública/publishable. No copies `service_role` al cliente.
3. Instala e inicia sesión en la CLI:

```bash
npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

Ejecuta estos comandos desde la raíz de PYSUP. No vuelvas a ejecutar `supabase init`: el proyecto ya contiene `supabase/config.toml`. La instalación por npm es local al proyecto, no global; consulta la [documentación oficial de la CLI](https://supabase.com/docs/guides/local-development/cli/getting-started).

`npx supabase db push` aplica las migraciones de `supabase/migrations`: esquema/RLS/Storage/Realtime, catálogo demostrativo y endurecimiento de seguridad.

4. Comprueba en el panel que RLS permanezca activado en todas las tablas públicas y que los buckets `profile-media` y `clip-uploads` sean privados.
5. En **Authentication > URL Configuration** agrega:

```text
pysup://auth/callback
http://127.0.0.1:8081/auth/callback
https://TU_DOMINIO/auth/callback
```

6. Sustituye `dominio-produccion.com` en `app.json`, `supabase/config.toml` y `.env` por el dominio real. Publica `apple-app-site-association` y `assetlinks.json` para enlaces universales/app links.

Los enlaces de invitación de sala aceptan `pysup://room/CODIGO` y `https://TU_DOMINIO/room/CODIGO`.

## 3. Variables públicas del cliente

Copia `.env.example` como `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA
EXPO_PUBLIC_API_URL=https://TU_API_PUBLICA_OPCIONAL
EXPO_PUBLIC_WEB_URL=https://TU_DOMINIO
EXPO_PUBLIC_TURNSTILE_SITE_KEY=TU_SITE_KEY_PUBLICA
EXPO_PUBLIC_DEMO_MODE=false
```

Si tu panel todavía muestra la clave pública legacy `anon`, puedes usar
`EXPO_PUBLIC_SUPABASE_ANON_KEY` en lugar de `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
Nunca uses la clave `service_role` en variables `EXPO_PUBLIC_*`.

Estas variables se incluyen en el bundle. Nunca pongas aquí `service_role`, secretos OAuth, tokens del worker o credenciales del catálogo.

En **Authentication → Bot and Abuse Protection** activa Cloudflare Turnstile con su secret key. Configura una política de contraseña de al menos 12 caracteres con mayúsculas, minúsculas y números, igual que el cliente y `supabase/config.toml`; puedes endurecerla adicionalmente con símbolos. Activa la comprobación de contraseñas filtradas cuando esté disponible. Replica en el panel alojado los límites de `supabase/config.toml`; ese archivo controla directamente el entorno local/autohospedado.

## 4. OAuth de Google y Apple

En **Authentication > Providers** habilita cada proveedor y coloca sus secretos sólo en Supabase.

Google:

1. Crea clientes OAuth web, Android e iOS en Google Cloud.
2. Configura la URI de callback que muestra Supabase: `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`.
3. Registra `app.pysup.mobile` y las huellas de firma Android correspondientes.
4. Copia client ID/secret al proveedor Google de Supabase.

Apple:

1. Activa Sign in with Apple para el bundle `app.pysup.mobile`.
2. Crea Service ID, key y redirect de Supabase en Apple Developer.
3. Configura esos valores en Supabase. La clave privada permanece en Supabase/Apple, nunca en Expo.

Sin estas credenciales los botones muestran un error real; no crean una sesión falsa.

## 5. Edge Functions y secretos

Despliega:

```bash
npx supabase functions deploy clip-analysis
npx supabase functions deploy export-user-data
npx supabase functions deploy delete-account
npx supabase functions deploy purge-expired-clips --no-verify-jwt
npx supabase functions deploy push-dispatch --no-verify-jwt
npx supabase functions deploy catalog-sync --no-verify-jwt
```

Configura únicamente como secretos del servidor:

```bash
npx supabase secrets set CLIP_WORKER_URL=https://worker.example.com/analyze
npx supabase secrets set CLIP_WORKER_TOKEN=...
npx supabase secrets set CRON_SECRET=...
npx supabase secrets set PUSH_WEBHOOK_SECRET=...
npx supabase secrets set EXPO_ACCESS_TOKEN=...
npx supabase secrets set CATALOG_PROVIDER_URL=https://catalog.example.com/feed
npx supabase secrets set CATALOG_PROVIDER_TOKEN=...
npx supabase secrets set CATALOG_PROVIDER_NAME=proveedor-contratado
npx supabase secrets set APP_ENV=production
npx supabase secrets set ALLOWED_ORIGINS=https://TU_DOMINIO
npx supabase secrets set SECURITY_HASH_SALT=VALOR_ALEATORIO_LARGO
```

Supabase agrega automáticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` a las funciones. Esa última sólo se usa dentro del servidor.

Programa `purge-expired-clips` al menos cada hora y `catalog-sync` según el acuerdo del proveedor usando Supabase Cron, enviando `x-cron-secret`. Configura un Database Webhook para `INSERT` en `public.notifications` hacia `push-dispatch`, enviando `x-webhook-secret`.

## 6. Contrato del worker de clips

`clip-analysis` llama al worker con un enlace temporal y espera:

```json
{
  "durationSeconds": 18.4,
  "candidates": [
    {
      "title": "Título candidato",
      "contentId": "uuid-opcional-del-catalogo",
      "confidence": 0.87,
      "evidence": {
        "ocr": "texto realmente detectado",
        "transcript": "fragmento realmente transcrito",
        "frames": ["descriptores reales"]
      }
    }
  ]
}
```

El worker debe validar duración, descargar sólo el recurso firmado/autorizado, aplicar OCR/transcripción/huellas permitidas y borrar todos sus derivados. PYSUP rechaza porcentajes fuera de 0–1, no inventa evidencia y purga el original.

## 7. Catálogo y streaming

El seed permite validar el flujo, pero sus ofertas son demostrativas y caducan. Contrata o integra un proveedor autorizado y adapta su salida al contrato de `catalog-sync`. No uses scraping de cuentas ni solicites contraseñas. Las conexiones de streaming permanecen con `connection_type=manual` hasta que cada servicio ofrezca OAuth/importación oficial.

## 8. Push y EAS

```bash
npm install --global eas-cli
eas login
eas init
eas build --profile development --platform android
eas build --profile preview --platform all
eas build --profile production --platform all
```

`eas init` agrega `expo.extra.eas.projectId`, necesario para obtener Expo Push Tokens. Configura credenciales APNs y FCM en EAS. Las notificaciones dentro de la app funcionan por Realtime; las push requieren ese proyecto y el webhook del paso 5.

## 9. Web

```bash
npm run export:web
```

Publica `dist/` en un host HTTPS con fallback de rutas a `index.html`. `vercel.json` y `public/_headers` incluyen CSP, HSTS y las demás cabeceras; comprueba que tu host las conserve. Agrega el dominio final a Auth Redirect URLs de Supabase y cambia `EXPO_PUBLIC_WEB_URL` antes del build.

Conserva como archivos estáticos reales `/auth/captcha.html` y `/auth/captcha.js` antes del fallback SPA. Autoriza el dominio en Turnstile. El flujo móvil usa el navegador del sistema, un estado aleatorio y `pysup://captcha/callback`; requiere un development build o una app EAS instalada, no Expo Go. Si usas un dominio personalizado de Supabase u otra API pública, agrega exclusivamente ese origen HTTPS/WSS a `connect-src` de `vercel.json` y `public/_headers`; no lo reemplaces por `https:` o `*`.

## 10. Pruebas locales

```bash
npm install
npm run typecheck
npm run typecheck:server
npm run lint
npm run test
npm run export:web
npm run test:e2e:web
npm run security
npm run security:history
```

Para probar sincronización real usa dos navegadores/perfiles o un móvil y navegador con dos cuentas confirmadas. Verifica mensajes, lectura, solicitudes, invitaciones, controles de sala y reconexión Realtime.

Validación local del esquema (requiere Docker Desktop):

```bash
npx supabase start
npx supabase db reset
npx supabase db lint --local
npx supabase test db
```

`supabase/tests/security_rls.test.sql` prueba permisos administrativos, campos inmutables y separación de perfiles/preferencias/presencia entre usuarios. Estas pruebas requieren PostgreSQL/Supabase local con Docker; no quedan ejecutadas sólo por correr Vitest. Desactiva **Allow public access** en Realtime Settings del proyecto alojado para los canales privados de presencia. Prueba cuentas reales en dos dispositivos antes de publicar.

Vitest sí ejecuta adicionalmente `tests/database-security.test.ts` en PostgreSQL embebido (PGlite), aplicando las migraciones completas y comprobando RLS, bloqueos, reseñas, salas, recomendaciones por país y permisos administrativos. El harness reproduce roles/namespaces para SQL; no sustituye Supabase Auth, Storage HTTP, Realtime ni las pruebas en dispositivos físicos.

Consulta [docs/SECURITY.md](docs/SECURITY.md) para el mapa de los 20 controles, activación en producción y respuesta a incidentes.
