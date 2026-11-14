# AutoDocs AI (PWA)

Plataforma web que analiza el código fuente de un proyecto y genera su documentación técnica: estructura de carpetas, funciones, clases, endpoints de API, tablas SQL, métricas de calidad y diagramas. Se exporta a **PDF, HTML o Markdown**. Funciona sin conexión (con `.zip`) y se puede instalar.

Sin dependencias ni paso de *build*: HTML, CSS y JavaScript puro.

## Funciones
- Subir un `.zip` o indicar la URL de un repositorio público de GitHub.
- Análisis en segundo plano (el código no sale de tu navegador; solo GitHub requiere red).
- Detecta funciones y clases (JS/TS, Python, Java, C#, PHP, Go, Ruby), endpoints (Express, Flask, FastAPI, NestJS, Spring, Laravel, Django) y `CREATE TABLE` en SQL.
- Métricas: líneas de código, % de funciones documentadas, README, pruebas, `.gitignore`, archivos largos, TODO/FIXME, puntaje 0–100 y recomendaciones.
- Diagramas Mermaid: estructura, clases y entidad-relación (se dibujan con conexión; el código siempre se exporta).
- Proyectos guardados en IndexedDB (se pueden **fijar** y **ordenar** por fecha, nombre o calidad), copia de seguridad JSON, instalación y actualización controlada.

## Alcance actual y pendientes
Esta versión es 100 % cliente. Quedan fuera porque requieren servidor: mejoras con IA, análisis de modelos de aprendizaje automático, cuentas de usuario y planes. Los repositorios privados tampoco se admiten.

## Probar en local
```bash
python3 -m http.server 8080   # abrir http://localhost:8080
```

## Publicar
Rutas relativas: sirve en la raíz o en una subcarpeta. GitHub Pages: *Settings → Pages → Deploy from a branch → main / (root)*. Netlify/Vercel: sin build command, directorio de salida `.`

## Probar la actualización
1. En `sw.js` sube `VERSION` (p. ej. `'2.5.0'` a `'2.5.1'`).
2. En `js/config.js` cambia el texto de `WELCOME`.
3. Publica y abre la app instalada: aparece **Actualizar ahora**. Los proyectos siguen ahí (IndexedDB, no caché).

## Estructura
```
index.html        App shell
manifest.json     Nombre, íconos, colores, atajos
sw.js             Service worker (caché versionada)
css/styles.css
js/app.js         Pantallas, rutas, instalación y actualización
js/analyzer.js    Motor de análisis (.zip y GitHub)
js/zip.js         Lector de .zip sin librerías
js/report.js      Documentación en HTML y Markdown
js/db.js          IndexedDB
js/config.js      Texto de bienvenida
docs/PLAN_DE_PRUEBAS.md
CHANGELOG.md      Registro de cambios por versión
```

## Versionado y liberación
Se usa [versionado semántico](https://semver.org/lang/es/) (`MAJOR.MINOR.PATCH`) con etiquetas Git `vX.Y.Z`. La versión vive en `sw.js` (`VERSION`) y debe coincidir con la etiqueta y con `CHANGELOG.md`. Flujo: rama `feature/*` → Pull Request → versión candidata `vX.Y.Z-rc.N` → validación → merge a `main` (publica GitHub Pages) → etiqueta `vX.Y.Z`. Para volver atrás: `git revert` del merge y publicar como parche (ver `docs/LIBERACION.md`).
