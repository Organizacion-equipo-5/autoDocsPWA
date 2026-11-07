// Genera la documentación a partir del análisis: HTML (pantalla y exportación) y Markdown.
import { esc } from './analyzer.js';

const MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
const DIAG = [['estructura', 'Estructura general'], ['clases', 'Clases detectadas'], ['er', 'Modelo entidad-relación']];
const tabla = (cab, filas) => `<div class="scroll"><table><thead><tr>${cab.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const md = (s) => String(s).replace(/\|/g, '\\|');
const mdTabla = (cab, filas) => `| ${cab.join(' | ')} |\n|${cab.map(() => '---').join('|')}|\n${filas.map((f) => `| ${f.map(md).join(' | ')} |`).join('\n')}`;
const agrupar = (items) => { const m = new Map(); for (const i of items) (m.get(i.archivo) ?? m.set(i.archivo, []).get(i.archivo)).push(i); return m; };
const conteo = (a) => { const c = a.funciones.filter((f) => f.tipo === 'clase').length; return { clases: c, funcs: a.funciones.length - c }; };

export function recomendaciones(a) {
  const m = a.metricas, r = [];
  if (a.funciones.length && m.docPct < 50) r.push(`Solo el ${m.docPct}% de las funciones y clases tiene comentario o docstring; documenta las más importantes.`);
  if (!m.readme) r.push('Agrega un README con descripción, instalación y uso.');
  if (!m.tests) r.push('No se detectaron pruebas automáticas; agrega pruebas para la lógica principal.');
  if (!m.gitignore) r.push('Agrega un archivo .gitignore.');
  if (m.largos.length) r.push(`Divide los archivos de más de 400 líneas: ${m.largos.map((l) => l.archivo).join(', ')}.`);
  if (m.pendientes > 10) r.push(`Hay ${m.pendientes} marcas TODO/FIXME pendientes.`);
  return r.length ? r : ['No se detectaron problemas relevantes con las reglas actuales.'];
}

const metricasFilas = (a) => [['Puntaje de calidad', `${a.metricas.puntaje}/100`], ['Funciones y clases documentadas', `${a.metricas.docPct}%`], ['Líneas de comentario', `${a.metricas.comPct}%`], ['README', a.metricas.readme ? 'Sí' : 'No'], ['Pruebas automáticas', a.metricas.tests ? 'Sí' : 'No'], ['.gitignore', a.metricas.gitignore ? 'Sí' : 'No'], ['Marcas TODO/FIXME', a.metricas.pendientes]];

export function reporteHTML(a) {
  const { clases, funcs } = conteo(a);
  const kpi = [['Archivos', a.resumen.archivos], ['Líneas de código', a.resumen.lineas], ['Funciones', funcs], ['Clases', clases], ['Endpoints', a.endpoints.length], ['Tablas', a.tablas.length], ['Calidad', a.metricas.puntaje + '/100']];
  const fn = [...agrupar(a.funciones)].map(([arch, it]) => `<details><summary>${esc(arch)} <span class="meta">(${it.length})</span></summary>${tabla(['Nombre', 'Tipo', 'Línea', 'Documentada'], it.map((x) => [x.nombre, x.tipo, x.linea, x.doc ? 'Sí' : 'No']))}</details>`).join('');
  return `<div class="reporte">
  <h1>${esc(a.nombre)}</h1>
  <p class="meta">Origen: ${esc(a.origen)} · analizado ${esc(new Date(a.fecha).toLocaleString('es-MX'))}</p>
  ${a.avisos.map((x) => `<p class="nota">${esc(x)}</p>`).join('')}
  <div class="kpis">${kpi.map(([k, v]) => `<div><b>${esc(v)}</b><span>${k}</span></div>`).join('')}</div>
  <h2>Lenguajes</h2>${a.resumen.lenguajes.length ? tabla(['Lenguaje', 'Archivos', 'Líneas'], a.resumen.lenguajes.map((l) => [l.nombre, l.archivos, l.lineas])) : '<p>No se detectó código fuente reconocible.</p>'}
  ${a.dependencias.length ? `<h2>Dependencias</h2><p>${a.dependencias.map((d) => `<code>${esc(d)}</code>`).join(' ')}</p>` : ''}
  <h2>Estructura de carpetas</h2><pre>${esc(a.arbol)}</pre>
  <h2>Funciones y clases</h2>${fn || '<p>No se detectaron funciones ni clases.</p>'}
  <h2>Endpoints de API</h2>${a.endpoints.length ? tabla(['Método', 'Ruta', 'Archivo', 'Línea'], a.endpoints.map((e) => [e.metodo, e.ruta, e.archivo, e.linea])) : '<p>No se detectaron endpoints.</p>'}
  <h2>Base de datos SQL</h2>${a.tablas.length ? a.tablas.map((t) => `<h3>${esc(t.nombre)} <span class="meta">${esc(t.archivo)}</span></h3>${tabla(['Columna', 'Tipo', 'Clave', 'Acepta nulos'], t.columnas.map((c) => [c.nombre, c.tipo, c.pk ? 'PK' : t.fks.some((f) => f.col === c.nombre) ? 'FK → ' + t.fks.find((f) => f.col === c.nombre).tabla : '', c.nulo ? 'Sí' : 'No']))}`).join('') : '<p>No se encontraron archivos .sql con CREATE TABLE.</p>'}
  <h2>Métricas de calidad</h2>${tabla(['Métrica', 'Valor'], metricasFilas(a))}
  <h3>Recomendaciones</h3><ul>${recomendaciones(a).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <h2>Diagramas</h2>${DIAG.filter(([k]) => a.diagramas[k]).map(([k, t]) => `<h3>${t}</h3><pre class="mermaid">${esc(a.diagramas[k])}</pre>`).join('')}
  </div>`;
}

export function reporteMD(a) {
  const { clases, funcs } = conteo(a);
  const sec = (t, c) => `\n## ${t}\n\n${c}\n`;
  return `# ${a.nombre}\n\nOrigen: ${a.origen} · analizado ${new Date(a.fecha).toLocaleString('es-MX')}\n${a.avisos.map((x) => `\n> ${x}\n`).join('')}
${mdTabla(['Archivos', 'Líneas de código', 'Funciones', 'Clases', 'Endpoints', 'Tablas', 'Calidad'], [[a.resumen.archivos, a.resumen.lineas, funcs, clases, a.endpoints.length, a.tablas.length, a.metricas.puntaje + '/100']])}
${sec('Lenguajes', a.resumen.lenguajes.length ? mdTabla(['Lenguaje', 'Archivos', 'Líneas'], a.resumen.lenguajes.map((l) => [l.nombre, l.archivos, l.lineas])) : 'No se detectó código fuente reconocible.')}${a.dependencias.length ? sec('Dependencias', a.dependencias.map((d) => `\`${d}\``).join(', ')) : ''}${sec('Estructura de carpetas', '```\n' + a.arbol + '\n```')}${sec('Funciones y clases', [...agrupar(a.funciones)].map(([arch, it]) => `### ${arch}\n\n${it.map((x) => `- ${x.tipo} \`${x.nombre}\` (línea ${x.linea})${x.doc ? '' : ' · sin documentar'}`).join('\n')}`).join('\n\n') || 'No se detectaron funciones ni clases.')}${sec('Endpoints de API', a.endpoints.length ? mdTabla(['Método', 'Ruta', 'Archivo', 'Línea'], a.endpoints.map((e) => [e.metodo, e.ruta, e.archivo, e.linea])) : 'No se detectaron endpoints.')}${sec('Base de datos SQL', a.tablas.map((t) => `### ${t.nombre}\n\n${mdTabla(['Columna', 'Tipo', 'Clave'], t.columnas.map((c) => [c.nombre, c.tipo, c.pk ? 'PK' : t.fks.some((f) => f.col === c.nombre) ? 'FK → ' + t.fks.find((f) => f.col === c.nombre).tabla : '']))}`).join('\n\n') || 'No se encontraron archivos .sql con CREATE TABLE.')}${sec('Métricas de calidad', mdTabla(['Métrica', 'Valor'], metricasFilas(a)) + '\n\n' + recomendaciones(a).map((x) => `- ${x}`).join('\n'))}${sec('Diagramas (Mermaid)', DIAG.filter(([k]) => a.diagramas[k]).map(([k, t]) => `### ${t}\n\n\`\`\`mermaid\n${a.diagramas[k]}\n\`\`\``).join('\n\n'))}`;
}

export function documentoHTML(a) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.nombre)} · Documentación</title>
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:900px;margin:0 auto;padding:24px;color:#12303a}h1,h2,h3{line-height:1.25}h2{border-bottom:2px solid #ffe14d;padding-bottom:4px;margin-top:2rem}pre{background:#f1f5f6;padding:12px;overflow:auto;border-radius:6px;font-size:.85rem}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #d3dde1;padding:6px 10px;text-align:left}th{background:#e9f0f2}.scroll{overflow-x:auto}.meta{color:#5a6e75;font-size:.9rem;font-weight:400}.nota{background:#fff6c2;padding:8px 12px;border-radius:6px}.kpis{display:flex;flex-wrap:wrap;gap:10px}.kpis div{border:1px solid #d3dde1;border-radius:8px;padding:8px 14px;min-width:110px}.kpis b{display:block;font-size:1.3rem}code{background:#f1f5f6;padding:1px 5px;border-radius:4px}</style></head><body>${reporteHTML(a)}<script src="${MERMAID}"></script><script>if(window.mermaid)mermaid.initialize({startOnLoad:true})</script></body></html>`;
}
export { MERMAID };
