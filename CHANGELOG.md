# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Versionado Semántico](https://semver.org/lang/es/).

## [2.5.0] - 2026-11-14
### Añadido
- Fijar proyectos con una estrella (★); los fijados siempre aparecen primero.
- Selector para ordenar la lista de proyectos: más recientes, nombre (A-Z) o mayor calidad. La preferencia se recuerda en `localStorage`.
- Resumen de la lista ("N proyectos · M fijados").
- Plan de pruebas ampliado (casos 23-27) y documentación del proceso de liberación.

### Cambiado
- Se quitó el recuadro azul de foco que rodeaba todo el contenido tras cada navegación (el foco programático de `<main>` se mantiene para lectores de pantalla).
- Estilos de la barra de búsqueda/orden y de los proyectos fijados (acento distinto y botón de estrella accesible con `aria-pressed`).
- Texto de bienvenida actualizado a la versión 2.5.0.

### Corregido
- El aviso «Hay una versión nueva» y el botón «Instalar app» se veían siempre, aunque no hubiera actualización ni instalación disponible (la regla `display` de sus estilos anulaba el atributo `hidden`).
- Un proyecto eliminado mientras se analizaba volvía a aparecer al terminar el análisis.
- Al importar una copia de seguridad dañada se podían perder los datos actuales: ahora se valida antes de reemplazar y, si algo falla, se restauran los datos anteriores.
- No se podía volver a elegir el mismo archivo de copia después de cancelar o fallar la importación.

### Notas de actualización
- No cambia el esquema de IndexedDB (`DB_VER` sigue en 2): los proyectos existentes se conservan. El campo nuevo `fijado` es opcional.
- Caché del Service Worker: `autodocs-v2.5.0` (la anterior `autodocs-v2.4.1` se elimina al activarse).

## [2.4.1] - 2026-11-07
### Cambiado
- Sin animación de partículas en pantallas pequeñas para reducir el trabajo del hilo principal.

## [Versiones anteriores]
- 2.4.0 y anteriores: tema claro/oscuro, tipografías locales, mejor contraste, análisis en segundo plano, diagramas Mermaid, copia de seguridad JSON, instalación y actualización controlada (ver historial de Git).
