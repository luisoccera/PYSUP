# Validación de seguridad — 17 septiembre 2026

## Comprobaciones locales

- `npm install`: instalación completa y auditoría sin vulnerabilidades conocidas.
- `npm run typecheck`: cliente TypeScript.
- `npm run typecheck:server`: las seis Edge Functions, con Deno fijado a 2.7.7.
- `npm run lint`: sin errores.
- `npm test`: 96 casos; incluye ejecución de las cuatro migraciones SQL en PostgreSQL embebido, aislamiento entre usuarios y rechazo de claves privadas antes de compilar.
- `npm run test:e2e:web`: exportación web y ocho casos de navegador: acceso arbitrario rechazado, registro, CSP y tamaños 320, 390, 768, 1024 y 1440 píxeles.
- `npm run security:secrets` y `security:history`: revisión de credenciales detectables sin imprimir sus valores.
- `npm audit --audit-level=high`: cero vulnerabilidades conocidas en el árbol instalado.

Se corrigieron una referencia SQL inválida de recomendaciones, el generador de código de sala que perdía permisos al revocar funciones públicas y las claves con `:` incompatibles con SecureStore. Las recomendaciones también excluyen ofertas caducadas, usan selecciones manuales de plataformas y penalizan rechazos por afinidad de género.

Se conservaron Expo 57.0.18, React Native 0.86.3 y React 19.2.3. La comprobación de dependencias contra el manifest incluido en Expo coincide; el servicio online de Expo recomienda parches 57 más recientes. No se actualizó el SDK por ese aviso: se corrigieron las vulnerabilidades mediante overrides puntuales de XML/UUID y se probó el generador iOS de xcode.

## No validado en producción

No hay variables Supabase reales en esta copia. No se aplicaron migraciones a un proyecto alojado, no se enviaron correos ni push, no se completó OAuth/CAPTCHA real, no se analizaron clips con un worker y no se probaron Android/iOS físicos. El pgTAP de `supabase/tests` requiere Docker/Supabase CLI y es independiente de las pruebas SQL embebidas.

Antes de publicar: configura Supabase, aplica migraciones/functions, activa CAPTCHA/límites/SMTP, desactiva canales Realtime públicos, programa purga, configura alertas y prueba dos cuentas en dos dispositivos. Configura además dominio HTTPS, OAuth, APNs/FCM, catálogo autorizado y worker de clips. Consulta `README_SETUP.md` y `SECURITY.md`.

Estas comprobaciones reducen riesgos; no son una certificación ni garantizan ausencia de incidentes.
