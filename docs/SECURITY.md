# Seguridad de PYSUP

Esta guía convierte los 20 controles solicitados en medidas verificables. Distingue lo que queda activo en el código de lo que debe habilitar el propietario en servicios externos.

## Controles implementados

| # | Control | Implementación |
|---|---|---|
| 1 | Ocultar claves API | El cliente sólo acepta la clave pública de Supabase. Los secretos del worker, catálogo, cron y push viven en secretos de Edge Functions. |
| 2 | Eliminar secretos de Git | `.gitignore`, `security:secrets`, `security:history` y CI revisan archivos actuales e historial. Un secreto detectado exige revocación; el escáner no garantiza detectar todos los formatos. |
| 3 | Usar clave pública de DB | `env.ts` rechaza claves `sb_secret_`, texto `service_role` y JWT con rol `service_role`. |
| 4 | Activar RLS | Todas las tablas de aplicación tienen RLS y la migración de endurecimiento aplica `FORCE ROW LEVEL SECURITY`. |
| 5 | Cifrar datos sensibles | Todo tráfico de producción usa TLS; las sesiones móviles usan SecureStore y Supabase cifra su infraestructura administrada. PYSUP no guarda contraseñas de streaming. En web no se inventa un cifrado con una clave dentro del mismo bundle: CSP reduce el riesgo de XSS sobre la sesión local. |
| 6 | Autenticación de servidor | Las funciones de usuario validan el JWT contra Supabase Auth; cron y webhooks usan secretos de servidor comparados mediante huellas SHA-256. |
| 7 | Restringir registros | Mensajes, salas, clips, preferencias y perfiles están limitados por usuario o participante mediante RLS. |
| 8 | Bloquear campos manipulables | Grants por columna, políticas y triggers impiden forjar conexión OAuth, estados de clip, invitaciones, secuencias de sala o estados de reportes. |
| 9 | Proteger sesión/cookies | La SPA no crea cookies de sesión. Usa PKCE, rotación de refresh token, expiración e inactividad; si se agrega SSR, sus cookies deberán ser `HttpOnly`, `Secure` y `SameSite=Lax/Strict`. |
| 10 | Hashear contraseñas | PYSUP nunca recibe ni almacena hashes propios: Supabase Auth guarda contraseñas con bcrypt y sal. |
| 11 | Limitar intentos | Supabase limita sign-in/sign-up por IP y el cliente añade bloqueo de cinco fallos durante quince minutos. |
| 12 | Protección contra bots | Turnstile está integrado en registro, acceso y recuperación. En móvil abre la página HTTPS propia y valida el retorno con estado aleatorio; requiere site key pública y CAPTCHA activado en Supabase. |
| 13 | Monitorizar DB | `security_events`, métricas horarias, índices y `statement_timeout` permiten alertar sobre abuso sin almacenar IP en claro. |
| 14 | Validar entradas | Cliente, restricciones SQL y Edge Functions validan longitud, tipo, UUID, URL HTTPS, JSON y estados. |
| 15 | Escapar contenido | React Native escapa texto por defecto; PYSUP no usa HTML del usuario y normaliza Unicode, controles invisibles y límites de longitud. |
| 16 | Restringir archivos | Buckets privados, RLS por carpeta, MIME permitido, 5/80 MB, clips de 90 s, URLs firmadas, metadata comprobada en servidor y purga de originales/cargas huérfanas. |
| 17 | Limitar API | PostgREST devuelve como máximo 500 filas; Edge Functions limitan cuerpos, respuestas, candidatos, tokens push y lotes. |
| 18 | Cabeceras de seguridad | CSP, HSTS, anti-sniff, anti-frame, Permissions Policy, Referrer Policy y COOP están en Vercel, `_headers` y el servidor de prueba. |
| 19 | Forzar HTTPS | HSTS y `upgrade-insecure-requests` se entregan en producción. Supabase, proveedores y callbacks de producción exigen HTTPS. |
| 20 | Escanear dependencias | `npm audit --audit-level=high` y CI semanal fallan ante vulnerabilidades altas o críticas. |

## Activación obligatoria por el propietario

1. En Supabase, **Authentication → Bot and Abuse Protection**, activa Cloudflare Turnstile y registra su secret key.
2. Coloca sólo la site key pública en `EXPO_PUBLIC_TURNSTILE_SITE_KEY`.
3. En **Authentication → Rate Limits**, replica o endurece los límites de `supabase/config.toml`.
4. En la política de contraseñas exige 12 caracteres, mayúsculas, minúsculas, números y símbolos; activa protección contra contraseñas filtradas si el plan la incluye.
5. Configura `APP_ENV=production`, `ALLOWED_ORIGINS=https://TU_DOMINIO` y un `SECURITY_HASH_SALT` aleatorio como secretos de Edge Functions.
6. Activa Secret scanning, Push protection, Dependabot alerts y protección de rama en GitHub.
7. Publica exclusivamente detrás de HTTPS y comprueba las cabeceras con el host definitivo.
8. Crea alertas sobre `security_event_hourly`, errores 401/403/429, picos de Auth y consultas lentas del panel de Supabase.
9. En Realtime Settings desactiva **Allow public access**. La presencia usa topics privados: sólo el propietario puede publicar y sus amigos no bloqueados pueden leer.
10. Publica `/auth/captcha.html` y `/auth/captcha.js` en el dominio de `EXPO_PUBLIC_WEB_URL`, autorízalo en Turnstile y prueba el callback `pysup://captcha/callback` en builds de desarrollo Android/iOS. Expo Go no valida este scheme propio.

El rate limit SQL utiliza bloqueos de transacción para evitar que solicitudes paralelas consuman un presupuesto sin contarse. Las fechas, estados y campos administrativos no se conceden en los INSERT del cliente. Las exportaciones paginan más allá de 500 filas y rechazan excesos de 10 MB/50.000 filas por tabla sin entregar un archivo incompleto. Una limpieza Storage fallida impide afirmar que una cuenta o clip fueron borrados.

La protección de sesiones no equivale a cifrado extremo a extremo de chats: el backend autorizado puede leer mensajes. La configuración local de Auth no modifica automáticamente un proyecto Supabase alojado; los ajustes del dashboard, cron, alertas y dominio HTTPS requieren activación y prueba real.

## Respuesta a incidentes

1. Contener: deshabilitar la integración afectada, pausar webhooks y revocar sesiones si existe riesgo de cuenta.
2. Rotar: reemplazar secrets de Edge Functions, tokens de proveedores y claves OAuth. Nunca reutilizar el valor comprometido.
3. Investigar: conservar logs, consultar `security_events`, Auth logs y Database logs; no copiar contraseñas, tokens completos ni videos privados al reporte.
4. Erradicar: corregir la causa, ejecutar migraciones, `npm run security`, pruebas y revisión manual de permisos.
5. Recuperar: desplegar gradualmente, vigilar 401/403/429, errores y latencia; reactivar integraciones una por una.
6. Notificar: documentar alcance, datos afectados, tiempos y medidas. Cumplir los avisos legales aplicables al país de operación.

Si una credencial llegó a Git, borrarla del último commit no basta: hay que revocarla primero, limpiar el historial con una herramienta aprobada y coordinar el cambio porque reescribir historia afecta a todos los clones.
