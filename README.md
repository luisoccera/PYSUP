# PYSUP

PYSUP es una aplicación Expo/React Native/React Native Web para descubrir películas, series y anime, conversar con amigos y coordinar salas de reproducción sin transmitir contenido protegido.

El código propio es nuevo para este proyecto y permanece bajo la licencia propietaria incluida en `LICENSE`. Las dependencias de npm conservan sus propias licencias.

## Estado

La aplicación ya contiene la integración de cliente, esquema PostgreSQL, RLS, Storage, Realtime, Edge Functions y pruebas necesarias para operar con Supabase. No concede acceso simulado con credenciales arbitrarias. El modo demo local existe sólo cuando `EXPO_PUBLIC_DEMO_MODE=true` y está desactivado por defecto.

Para funcionar entre dispositivos todavía requiere que el propietario cree y configure el proyecto externo de Supabase, aplique las migraciones y proporcione las variables públicas. OAuth, push, catálogo comercial y análisis pesado de clips requieren además las credenciales descritas en [README_SETUP.md](README_SETUP.md).

## Arquitectura

```text
App.tsx                    composición y Error Boundary
src/models/               modelos de dominio y datos del demo explícito
src/controllers/          estado y coordinación de flujos
src/views/                presentación multiplataforma
src/services/             repositorios tipados; único acceso del cliente a Supabase
src/repositories/         punto de entrada estable de repositorios por dominio
src/hooks/                conectividad y estado compartido de plataforma
src/config/               variables públicas y guardas de configuración
src/utils/                validación, sanitización y errores
supabase/migrations/      esquema, funciones, índices, triggers, RLS y seed
supabase/functions/       clips, exportación, baja, push, catálogo y limpieza
tests/                    contratos, validación y E2E web
```

Las vistas no consultan tablas. Los controladores usan servicios/repositorios, y las operaciones administrativas sólo existen dentro de Edge Functions con secretos del servidor.

## Ejecutar

```bash
npm install
copy .env.example .env
npm run web
```

Android e iOS:

```bash
npm run android
npm run ios
```

Verificación completa:

```bash
npm run typecheck
npm run lint
npm run test
npm run export:web
npm run test:e2e:web
```

## Seguridad y límites

- La sesión usa SecureStore fragmentado en Android/iOS y almacenamiento del navegador en web.
- Los archivos de perfil, avatar, portada y clips están en buckets privados y se consumen mediante URLs firmadas.
- RLS protege perfiles, preferencias, interacciones, mensajes, salas, notificaciones y trabajos de clips.
- Netflix, Max, Disney+, Crunchyroll y Prime Video se guardan como selección manual mientras no exista una autorización oficial. PYSUP nunca solicita sus contraseñas.
- La disponibilidad del seed es demostrativa y caduca. Producción debe configurar el adaptador comercial de catálogo.
- Las salas sólo sincronizan presencia, chat y eventos de control con reloj del servidor. Cada persona abre legalmente el título en su propia plataforma.
- Las salas se recuperan al reconectar, admiten código o enlace `pysup://room/CODIGO` y reservan el control de reproducción al anfitrión o moderador.
- El procesamiento de clips se delega a un worker HTTP protegido. Sin worker configurado se muestra un error recuperable y no se inventan candidatos.

Consulta [README_SETUP.md](README_SETUP.md), [docs/PRIVACY.md](docs/PRIVACY.md), [docs/TERMS.md](docs/TERMS.md) y [docs/CLIP_ANALYSIS.md](docs/CLIP_ANALYSIS.md).
