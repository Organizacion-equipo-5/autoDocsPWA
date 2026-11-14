# Procedimiento de liberación, actualización y reversión · AutoDocs AI

La app se publica en **GitHub Pages** desde la rama `main` (flujo `.github/workflows/pages.yml`). Cada *push* a `main` publica.

## 1. Versionado
- Versionado semántico `MAJOR.MINOR.PATCH` y etiquetas Git anotadas `vX.Y.Z`. Versión candidata: `vX.Y.Z-rc.N`.
- La versión vive en **`sw.js` → `VERSION`** (nombra la caché `autodocs-vX.Y.Z`). Debe coincidir con la etiqueta y con `CHANGELOG.md`.
- `MINOR`: funcionalidad nueva compatible. `PATCH`: correcciones. `MAJOR`: cambios que rompen datos o esquema.

## 2. Flujo de liberación
1. `git checkout -b feature/<nombre>` desde `main`.
2. Commits pequeños con mensaje descriptivo (`feat:`, `fix:`, `style:`, `docs:`, `chore:`).
3. Subir `VERSION` en `sw.js`, texto en `js/config.js` y entrada en `CHANGELOG.md`.
4. Abrir **Pull Request** hacia `main`; revisar el diff.
5. Etiquetar la versión candidata: `git tag -a vX.Y.Z-rc.1 -m "..." && git push origin vX.Y.Z-rc.1`.
6. Validar (sección 3). Si algo falla: corregir en la rama, `rc.2`, repetir.
7. *Merge* del PR (publica Pages) y etiquetar `vX.Y.Z` sobre el commit de *merge*.
8. Verificar la URL pública y la actualización de un cliente instalado (sección 4).

## 3. Validación de la versión candidata (resumen)
Se ejecuta el plan `docs/PLAN_DE_PRUEBAS.md`. Puntos críticos de la PWA:
- La funcionalidad nueva opera y las anteriores siguen funcionando (regresión).
- El Service Worker detecta el `sw.js` nuevo → aparece «Hay una versión nueva».
- Durante la espera conviven dos cachés (`autodocs-vA` y `autodocs-vB`); al activar queda solo la nueva.
- IndexedDB (`autodocs`, `DB_VER` 2) y `localStorage` se conservan: los datos **no** viven en la caché.
- Si cambia el esquema de IndexedDB hay que subir `DB_VER` y migrar en `onupgradeneeded` (en 2.5.0 no cambió).

## 4. Verificar la publicación
1. Actions → «Publicar en GitHub Pages» en verde.
2. Abrir la URL pública con `?v=<fecha>` y en *Estado* comprobar **Versión instalada** = nueva.
3. En un navegador/dispositivo con la versión anterior instalada: abrir la app → *Estado → Buscar actualización* (o esperar la revisión automática) → aparece el aviso → **Actualizar ahora** → la app recarga.
4. Comprobar: versión nueva, caché única `autodocs-v<nueva>`, proyectos guardados intactos, funcionalidad nueva visible.

## 5. Reversión
**Criterio:** error crítico (la app no abre, se pierden o corrompen datos, el análisis falla para todos).

**Procedimiento recomendado (reversión hacia adelante, trazable):**
```bash
git checkout main && git pull
git revert -m 1 <commit-de-merge-de-vX.Y.Z>      # deshace los cambios de la versión
# En sw.js sube VERSION a la siguiente PATCH (p. ej. 2.5.1): el navegador solo actualiza si sw.js cambia byte a byte
# Documenta en CHANGELOG.md: "## [2.5.1] ... Revertido: <causa>"
git commit -am "revert: vX.Y.Z por <causa> (publicado como vX.Y.(Z+1))"
git push origin main                              # (o por PR si main está protegida)
git tag -a v2.5.1 -m "Reversión de v2.5.0"; git push origin v2.5.1
```
Los clientes reciben el aviso de actualización normal. En la simulación realizada (evidencias 15-18) un cliente en 2.5.0 pasó a 2.5.1 conservando todos los proyectos, los fijados y sus preferencias.

**Compatibilidad de datos:** v2.5.0 solo añade el campo opcional `fijado` a los proyectos; las versiones anteriores lo ignoran, por lo que volver a 2.4.1 es seguro. Una copia de seguridad exportada desde 2.5.0 se puede importar en la versión revertida.

**Si el sitio falla y no se puede esperar al *revert*:** Actions → ejecución anterior correcta de «Publicar en GitHub Pages» → *Re-run all jobs*, o `workflow_dispatch` sobre la etiqueta anterior.

**Cliente atascado (último recurso):** DevTools → Application → Service Workers → *Unregister* y Cache Storage → borrar `autodocs-*`. **No** borrar IndexedDB: ahí están los proyectos (antes, exportar copia en *Estado*).

## 6. Evidencias
Capturas en `docs/evidencias/` (generadas con Chromium headless contra un servidor local que alterna v2.4.1 y v2.5.0 con perfil persistente).
