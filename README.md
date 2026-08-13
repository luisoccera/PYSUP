# PYSUP

PYSUP es una aplicación multiplataforma para descubrir, comentar y compartir
películas y series con recomendaciones personalizadas.

## Propiedad y autoría

El código de aplicación dentro de `src/`, `App.tsx` e `index.ts`, junto con los
recursos visuales de PYSUP, fue creado específicamente para este proyecto. No se
incluyen fragmentos de código copiados ni atribuciones de otros proyectos en el
código fuente propio.

PYSUP es software propietario y se distribuye con todos los derechos
reservados. Las bibliotecas instaladas como dependencias permanecen separadas y
conservan las licencias de sus autores.

PYSUP es un MVP multiplataforma para descubrir películas, series y anime con una experiencia de deslizamiento, recomendaciones filtradas por país, reseñas, comunidad, amigos y salas sincronizadas.

## Ejecutar

En Windows también puedes hacer doble clic en `INICIAR-PYSUP.cmd`; instalará las dependencias si faltan, levantará Expo y abrirá la vista previa.

En la pantalla inicial, usa **Entrar al demo sin cuenta** para revisar todos los apartados inmediatamente.

```bash
npm install
npm run web
```

También puede iniciarse con `npm run android` o `npm run ios` dentro de un entorno compatible con Expo.

## Arquitectura MVC

El código de aplicación vive en tres capas explícitas dentro de `src/`:

- `models/`: entidades, datos, valores iniciales y persistencia.
- `controllers/`: estado, validaciones, acciones y coordinación de flujos.
- `views/`: pantallas, componentes, navegación, modales y estilos.

`App.tsx` es únicamente el punto de composición. Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para ver las reglas de dependencia y el mapa de archivos.

## Qué incluye este MVP

- Inicio de sesión, registro, recuperación y validación local de formulario.
- Onboarding de país, plataformas e intereses.
- Mazo de recomendaciones interactivo: pasar, guardar o marcar que gusta.
- Ruleta de joyas ocultas que prioriza afinidad personal, penaliza exposición viral y explica por qué cada título quedó fuera del radar.
- Identificación demostrativa desde enlaces públicos de TikTok, Instagram, X y YouTube, o mediante un fragmento de video subido.
- Motivos explicables para cada recomendación y disponibilidad por región.
- Fichas de contenido con calificación y publicación de reseñas.
- Perfil con portada, avatar, biografía, estadísticas, reseñas y conexiones.
- Foros de discusión y un flujo específico de “¿Qué película era?”.
- Búsqueda, selección y alta demostrativa de amigos.
- Mensajería directa independiente con cada amigo, incluidos los contactos recién agregados.
- Sala privada con reproducción, pausa, avance, retroceso y chat grupal sincronizados.
- Notificaciones accionables que abren directamente la sala, conversación, foro, reseña o recomendación correspondiente.
- Diseño adaptable para navegador, Android, iPhone y tablet.

Los datos y la autenticación son locales para que el prototipo pueda probarse sin servidor. El estado de sesión se conserva en el dispositivo.

La identificación de clips representa el flujo final pero usa un resultado de demostración. Para convertirla en una búsqueda real se necesita un servicio que extraiga fotogramas y audio, genere candidatos y consulte la disponibilidad regional en un proveedor de catálogo.

## Límites importantes de las integraciones

Netflix, Max, Disney+, Crunchyroll y Prime Video no ofrecen un acceso público uniforme al historial completo de cada usuario. Una versión de producción debe usar OAuth y APIs oficiales donde existan, acuerdos comerciales cuando sean necesarios, y permitir una alternativa de importación o selección manual. PYSUP nunca debe pedir ni guardar las contraseñas de esos servicios.

Las salas en pareja no retransmiten contenido. Cada participante reproduce el título en su propia cuenta y PYSUP intercambia únicamente eventos de control, presencia y chat. La compatibilidad real dependerá de los mecanismos autorizados por cada proveedor.

Consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para la ruta de producción.
