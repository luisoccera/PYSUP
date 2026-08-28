# Diseño adaptable de PYSUP

PYSUP calcula el diseño con `useWindowDimensions`; no depende del modelo o de una lista cerrada de dispositivos. Los cambios de orientación y el redimensionamiento web actualizan la interfaz automáticamente.

## Clases de pantalla

| Clase | Ancho | Comportamiento principal |
| --- | ---: | --- |
| Teléfono compacto | menor a 360 px | márgenes de 14 px, títulos reducidos, país abreviado y paneles en una columna |
| Teléfono | 360–599 px | márgenes de 18 px, navegación inferior y controles móviles |
| Tablet / iPad | 600–1179 px | márgenes de 24 px, contenido ampliado y navegación inferior para conservar el área útil |
| Escritorio | 1180 px o más | barra lateral y contenido centrado con ancho máximo |

El contenido puede pasar a composiciones anchas desde 840 px sin obligar a mostrar la barra lateral. Esto permite aprovechar un teléfono horizontal o un iPad sin comprimir la pantalla principal.

## Reglas aplicadas

- `SafeAreaView` evita muescas, Dynamic Island y bordes físicos.
- La navegación inferior incorpora el inset real del dispositivo, no una altura fija de iPhone.
- Android usa `softwareKeyboardLayoutMode=resize` para evitar que el teclado cubra formularios.
- iPad admite rotación, pantalla dividida y redimensionamiento porque no requiere pantalla completa.
- Tarjetas y columnas eliminan anchos mínimos que superaban teléfonos de 320 px.
- Modales móviles se presentan como hojas inferiores y limitan su altura para conservar el botón de cierre.
- Filtros, botones, estadísticas, chats y controles de sala permiten ajuste de línea cuando falta espacio.
- Las listas horizontales de pósteres conservan desplazamiento propio sin aumentar el ancho del documento.

## Matriz mínima de validación

- 320 × 568: Android compacto / iPhone SE equivalente.
- 390 × 844: teléfono moderno.
- 844 × 390: teléfono en horizontal.
- 768 × 1024: iPad/tablet vertical.
- 1024 × 768: iPad/tablet horizontal.
- 1440 × 900: navegador de escritorio.

Para cambios visuales futuros se debe comprobar que `document.documentElement.scrollWidth` no supere el ancho visible en web y que las áreas táctiles permanezcan accesibles en Android/iOS.
