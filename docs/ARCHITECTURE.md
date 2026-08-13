# Arquitectura MVC de PYSUP

## Estructura actual del cliente

```text
App.tsx
└── src
    ├── models
    │   ├── types.ts
    │   ├── catalogue.ts
    │   ├── availability.ts
    │   ├── notifications.ts
    │   ├── roulette.ts
    │   ├── defaults.ts
    │   └── sessionRepository.ts
    ├── controllers
    │   ├── AppController.tsx
    │   ├── AuthController.tsx
    │   ├── MainController.tsx
    │   ├── ClipFinderController.tsx
    │   ├── useRouletteController.ts
    │   └── use*Controller.ts
    └── views
        ├── screens
        ├── layout
        ├── modals
        ├── components
        └── styles
```

### Modelo

Define las entidades de dominio, el catálogo demostrativo, los valores iniciales y los repositorios de persistencia. No importa controladores ni vistas.

### Vista

Contiene exclusivamente la interfaz: pantallas, componentes reutilizables, modales, navegación adaptable y estilos. Recibe estado y acciones del controlador mediante propiedades; no crea controladores con hooks dentro de las pantallas.

### Controlador

Mantiene el estado de sesión y de la aplicación, valida formularios y enlaces, ejecuta acciones y selecciona la vista correspondiente. Los componentes `*Controller.tsx` conectan cada hook controlador con su vista.

La regla de dependencia es: el modelo permanece independiente, el controlador coordina modelo y vista, y la vista no accede directamente a almacenamiento ni modifica datos globales.

## Ruta propuesta para producción

## Cliente

- Expo / React Native para Android, iOS y web.
- Navegación con enlaces profundos para contenidos y salas.
- Caché local cifrada para sesión y preferencias no sensibles.
- Accesibilidad, diseño adaptable y telemetría con consentimiento.

## Servicios

- API TypeScript con autenticación por correo, Apple y Google.
- PostgreSQL para usuarios, amistades, reseñas, listas y foros.
- Almacenamiento de imágenes con versiones y moderación.
- WebSockets para presencia, chat y reloj lógico de las salas.
- Índice de búsqueda para títulos, personas y publicaciones.
- Servicio de catálogo que normalice proveedor, país y ventanas de disponibilidad.
- Canal de identificación de clips con carga temporal, extracción de fotogramas/audio y búsqueda multimodal.

## Recomendaciones

1. Crear un perfil inicial con país, géneros y servicios.
2. Registrar señales explícitas: pasar, guardar, gustar, calificar y reseñar.
3. Añadir señales autorizadas de actividad de proveedor cuando estén disponibles.
4. Generar candidatos sólo del catálogo vigente en el país elegido.
5. Ordenar por afinidad, diversidad, novedad y señales sociales.
6. Mostrar una explicación breve y permitir corregir la recomendación.

### Ruleta de joyas ocultas

`models/roulette.ts` construye el perfil de gusto con calificaciones, favoritos y guardados. La clasificación combina afinidad y nivel de descubrimiento, resta puntos por exposición excesiva y filtra por estado de ánimo y formato cuando el usuario decide responder. Los títulos ya reseñados se excluyen cuando quedan suficientes alternativas regionales.

`useRouletteController.ts` mantiene los filtros opcionales y no expone resultado hasta terminar un giro. `RouletteView.tsx` presenta una rueda sin títulos, portadas, géneros ni otras pistas; tras la revelación muestra tráiler, sinopsis y decisiones para aceptar, guardar o solicitar otra opción.

## Disponibilidad y salida a plataformas

`models/availability.ts` normaliza cada oferta por plataforma, país y modalidad (`subscription`, `rent` o `purchase`). En este MVP los botones abren la búsqueda oficial del servicio; una integración de producción sustituirá esas URL por identificadores profundos del título y disponibilidad vigente obtenida desde proveedores o un agregador autorizado.

El controlador principal ejecuta la apertura externa y maneja fallos. Las vistas reciben las ofertas resueltas y nunca construyen URL de plataformas, conservando la separación MVC y permitiendo agregar servicios sin reescribir las pantallas.

## Navegación desde notificaciones

Cada aviso contiene un destino tipado en `models/notifications.ts`. El controlador principal marca el aviso como leído y resuelve el destino hacia una ficha, publicación de foro, conversación directa, sala sincronizada, perfil o ruleta. El modal de notificaciones no decide rutas ni modifica estado global.

## Seguridad y confianza

- OAuth 2.1 con PKCE; nunca almacenar contraseñas de streaming.
- Tokens de proveedores cifrados, de mínimo alcance y revocables.
- Verificación de correo, MFA opcional, rate limiting y sesiones administrables.
- Controles de visibilidad de actividad, bloqueo y reporte.
- Moderación de foro, etiquetas de spoilers y flujo de apelación.
- Exportación y eliminación de datos conforme a la región.

## Salas sincronizadas

La sala mantiene un estado autorizado (`playing`, `position`, `updatedAt`, `host`) y envía eventos idempotentes por WebSocket. Los clientes corrigen pequeñas diferencias contra el reloj del servidor. El reproductor o enlace de cada plataforma sólo se controla mediante mecanismos oficialmente permitidos; el audio y el video no pasan por PYSUP.

## Identificación desde reels, enlaces y fragmentos

1. Validar que el enlace sea público y pertenezca a un dominio permitido, o aceptar un video breve subido directamente.
2. Descargar sólo cuando las condiciones y APIs oficiales de la red lo permitan; de lo contrario, pedir al usuario el fragmento.
3. Extraer fotogramas representativos, OCR, transcripción y una huella acústica temporal.
4. Recuperar candidatos desde un índice multimodal y reordenarlos con año, idioma y señales aportadas por el usuario.
5. Consultar disponibilidad vigente por país antes de presentar cada candidato.
6. Eliminar el original y los derivados después del procesamiento; no usarlos para entrenamiento sin consentimiento separado.

Los enlaces privados, publicaciones eliminadas o redes que bloqueen la obtención automatizada no podrán procesarse directamente. El producto debe respetar derechos de autor, condiciones de servicio y solicitudes de retirada.
