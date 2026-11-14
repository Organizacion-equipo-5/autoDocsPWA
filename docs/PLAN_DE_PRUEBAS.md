# Plan de pruebas · AutoDocs AI

Rellena "Resultado obtenido" y "Estado" (Aprobado / No aprobado). Herramientas: Chrome DevTools (Application, Network, Lighthouse).

| # | Funcionalidad | Procedimiento | Resultado esperado | Resultado obtenido | Estado |
|---|---|---|---|---|---|
| 1 | Validación de .zip | Analizar → Analizar archivo sin elegir nada | Mensaje claro y foco en el campo | | |
| 2 | Archivo no válido | Subir un .txt renombrado a .zip | Proyecto en estado error con mensaje claro | | |
| 3 | Análisis de .zip | Subir un proyecto real (.zip) | Pasa a "Analizando…" y luego aparece con su calidad | | |
| 4 | Segundo plano | Navegar a Estado mientras analiza | Aviso "Documentación lista" al terminar | | |
| 5 | Validación de URL | Escribir `hola` en la URL de GitHub | Mensaje de formato esperado | | |
| 6 | Análisis de GitHub | Indicar un repositorio público | Documentación generada | | |
| 7 | Repo inexistente | URL de un repositorio que no existe | Estado error: "No se encontró el repositorio…" | | |
| 8 | Estructura y lenguajes | Ver proyecto | Árbol de carpetas y tabla de lenguajes correctos | | |
| 9 | Funciones y clases | Ver proyecto con código JS/Python | Listado por archivo con línea y si está documentada | | |
| 10 | Endpoints | Proyecto con rutas Express/Flask | Tabla con método, ruta y archivo | | |
| 11 | SQL | Proyecto con `CREATE TABLE` | Columnas, PK/FK y diagrama ER | | |
| 12 | Métricas | Ver sección de calidad | Puntaje y recomendaciones coherentes | | |
| 13 | Diagramas | Dibujar diagramas (con red) / sin red | Se dibujan; sin red avisa y deja el código | | |
| 14 | Exportar | Markdown, HTML y PDF | Archivos correctos; impresión sin menús | | |
| 15 | Búsqueda y eliminación | Buscar y eliminar un proyecto | Filtra; al confirmar desaparece de IndexedDB | | |
| 16 | Modo offline | Network → Offline → recargar y analizar un .zip | La app abre y el análisis local funciona | | |
| 17 | Offline con GitHub | Offline → analizar URL | Mensaje claro, sin pantalla rota | | |
| 18 | Caché | Application → Cache Storage | Existe la caché `autodocs-v<VERSION de sw.js>` con el app shell | | |
| 19 | Lighthouse | Incógnito → Lighthouse (móvil) | Categorías ≥ 90; PWA instalable | | |
| 20 | Instalación | Botón "Instalar app" | Se instala con nombre e icono correctos | | |
| 21 | Actualización | Subir versión (ver README) y publicar | Aparece "Actualizar ahora" y los proyectos persisten | | |
| 22 | Copia de seguridad | Estado → Exportar → Importar | Los proyectos se restauran | | |
| 23 | Fijar proyecto (v2.5.0) | Proyectos → ☆ en un proyecto | Pasa a ★, sube al inicio y se conserva al recargar | | |
| 24 | Ordenar proyectos (v2.5.0) | Cambiar selector: recientes / nombre / calidad | La lista se reordena; los fijados siempre arriba; la preferencia persiste | | |
| 25 | Eliminar durante análisis (fix) | Iniciar análisis y eliminar el proyecto antes de que termine | No reaparece al terminar | | |
| 26 | Importar copia inválida (fix) | Importar un JSON con registros dañados | Mensaje de error y los datos actuales no cambian | | |
| 27 | Datos tras actualizar | Actualizar de 2.4.1 a 2.5.0 con proyectos guardados y `autodocs-tema` en localStorage | Proyectos y tema se conservan | | |
| 28 | Aviso de actualización oculto (fix) | Abrir la app sin versión nueva pendiente | El aviso «Hay una versión nueva» y el botón «Instalar app» (si no es instalable) no se ven | | |
