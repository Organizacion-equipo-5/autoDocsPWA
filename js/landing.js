// Página de inicio con el diseño de AutoDocs AI.
const P = {
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  api: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2 2 2 0 0 0-2 2v5a2 2 0 0 1-2 2h-1"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  chart: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  save: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  check: '<circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>'
};
const ic = (n, c = 'ic') => `<svg class="${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

const FUNCIONES = [
  ['search', 'Escaneo automático', 'Analiza tu árbol de archivos, detecta los lenguajes y extrae funciones, clases y dependencias.', 'regex · .zip · árbol'],
  ['api', 'Detección de endpoints API', 'Encuentra rutas de Express, Flask, FastAPI, NestJS, Spring, Laravel y Django y las lista en una tabla.', 'Flask · FastAPI · Express'],
  ['doc', 'Documentación técnica', 'Reporte con estadísticas, estructura, funciones, tablas SQL y diagrama entidad-relación en segundos.', 'Markdown · HTML'],
  ['chart', 'Dashboard de calidad', 'Puntaje de 0 a 100, porcentaje de funciones documentadas, TODO/FIXME, archivos largos y recomendaciones.', 'métricas · reglas'],
  ['save', 'Exportación profesional', 'Exporta tu documentación en PDF, Markdown o HTML listo para GitHub Pages o entrega universitaria.', 'PDF · Markdown · HTML'],
  ['link', 'Integración GitHub', 'Indica la URL de un repositorio público y analízalo sin descargar nada.', 'GitHub API']
];
const PASOS = [
  ['Subir proyecto', 'Sube un .zip o indica la URL de un repositorio público de GitHub.'],
  ['Análisis estático', 'El motor corre en tu navegador y detecta funciones, clases, endpoints y tablas SQL.'],
  ['Generación de docs', 'Se arma la referencia del proyecto: estructura, código, API y base de datos.'],
  ['Dashboard visual', 'Consulta métricas de calidad, recomendaciones y diagramas de estructura.'],
  ['Exportar', 'Descarga PDF, Markdown o HTML en un clic, listo para entregar o publicar.']
];
const STACK = [
  ['🟨', 'JavaScript', 'Lógica · Análisis'], ['📱', 'PWA', 'Instalable · Offline'], ['🌐', 'HTML/CSS', 'Interfaz'], ['🗄️', 'IndexedDB', 'Base de datos local'],
  ['⚙️', 'Service Worker', 'Caché versionada'], ['🗜️', 'DecompressionStream', 'Lectura de .zip'], ['🐙', 'GitHub API', 'Repositorios'], ['🔬', 'Análisis estático', 'Regex · Mermaid']
];
const li = (t, c = 'pr') => `<li>${ic('check', 'ic-s ' + c)} ${t}</li>`;

export const INICIO = `
<section class="lp-hero">
  <span class="lp-badge glass"><i></i> 100% en tu navegador · PWA instalable</span>
  <h1 class="lp-h1">Documenta tu código<br><span class="lp-grad">automáticamente</span></h1>
  <p class="lp-lead">AutoDocs AI analiza tu proyecto, detecta funciones, clases y endpoints, y genera documentación técnica profesional en segundos.</p>
  <div class="lp-btns">
    <a class="lp-btn p" href="#/nuevo">Empieza ahora — gratis</a>
    <a class="lp-btn glass" href="#/" data-scroll="how">Ver cómo funciona</a>
  </div>
  <div class="lp-term glass" role="img" aria-label="Ejemplo de análisis en una terminal">
    <div class="lp-term-bar"><span class="dots"><i style="background:rgba(248,113,113,.6)"></i><i style="background:rgba(250,204,21,.6)"></i><i style="background:rgba(74,222,128,.6)"></i></span><span class="t">autodocs — ejemplo de análisis</span></div>
    <div class="lp-term-body">
      <div><span class="ok b">$</span> <span class="tx">autodocs analyze ./mi-proyecto</span></div>
      <div class="in">Escaneando estructura del proyecto...</div>
      <div class="in"><span class="ok">✓</span> <span class="pr">47 archivos</span> detectados en 12 directorios</div>
      <div class="in"><span class="ok">✓</span> Lenguaje principal: <span class="pr">Python</span> · secundario: <span class="sc">JavaScript</span></div>
      <div class="in"><span class="ok">✓</span> <span class="pr">134 funciones</span> · <span class="pr">23 clases</span> · <span class="sc">18 endpoints API</span></div>
      <div class="in"><span class="ok">✓</span> Score de calidad: <span class="pr">87/100</span></div>
      <div class="in"><span class="ok">✓</span> Documentación lista → <span class="sc">.md · .html · PDF</span></div>
      <div><span class="ok b">$</span> <span class="cursor"></span></div>
    </div>
  </div>
</section>

<div class="lp-stats">
  <div class="lp-stat glass"><b class="glow">12<em>+</em></b><span>Lenguajes detectados</span></div>
  <div class="lp-stat glass"><b class="glow-v">3<em class="v">×</em></b><span>Formatos de exportación</span></div>
  <div class="lp-stat glass"><b class="glow">100<em>%</em></b><span>Local en tu navegador</span></div>
  <div class="lp-stat glass"><b class="glow">0<em>*</em></b><span>Servidores necesarios</span></div>
</div>

<section id="features" class="lp-sec">
  <div class="lp-head"><span class="lp-eyebrow">// funcionalidades</span><h2 class="lp-h2">Todo lo que necesitas para documentar</h2><p>De subir un .zip a tener documentación completa lista para entregar.</p></div>
  <div class="lp-grid g3">
    ${FUNCIONES.map(([i, t, d, tag]) => `<div class="tilt"><div class="lp-card glass glass-hover">${ic(i)}<h3>${t}</h3><p>${d}</p><span class="lp-tag">${tag}</span></div></div>`).join('')}
  </div>
</section>

<section id="how" class="lp-how glass">
  <div class="lp-head"><span class="lp-eyebrow">// flujo del sistema</span><h2 class="lp-h2">Cómo funciona</h2><p>Del archivo al PDF en 5 pasos.</p></div>
  <div class="lp-grid g5">
    ${PASOS.map(([t, d], n) => `<div class="lp-paso"><span class="num">0${n + 1}</span><h3>${t}</h3><p>${d}</p></div>`).join('')}
  </div>
</section>

<section id="stack" class="lp-sec">
  <div class="lp-head"><span class="lp-eyebrow">// tecnologías</span><h2 class="lp-h2">Stack tecnológico</h2><p>Sin dependencias ni paso de build.</p></div>
  <div class="lp-grid g4">
    ${STACK.map(([e, n, d]) => `<div class="lp-stk glass glass-hover"><span class="em" aria-hidden="true">${e}</span><b>${n}</b><p>${d}</p></div>`).join('')}
  </div>
</section>

<section id="pricing" class="lp-sec">
  <div class="lp-head"><span class="lp-eyebrow">// planes</span><h2 class="lp-h2">Elige tu plan</h2><p>Comienza gratis y escala cuando lo necesites.</p></div>
  <div class="lp-grid g3p">
    <div class="lp-plan glass glass-hover">
      <h3>Gratuito</h3><p class="precio pr">$0<small>/mes</small></p>
      <ul>${li('Proyectos guardados en tu dispositivo')}${li('Análisis completo de .zip y GitHub')}${li('Exportación PDF, Markdown y HTML')}</ul>
      <a class="lp-btn glass w" href="#/nuevo">Empezar gratis</a>
    </div>
    <div class="lp-plan glass feat">
      <span class="lp-pop">PRÓXIMAMENTE</span>
      <h3>Pro</h3><p class="precio pr">$350<small>/mes</small></p>
      <ul>${li('20 proyectos en la nube')}${li('Análisis avanzado')}${li('Documentación con IA')}${li('Soporte prioritario')}</ul>
      <button class="lp-btn p w" type="button" disabled>Próximamente</button>
    </div>
    <div class="lp-plan glass glass-hover">
      <h3>Enterprise</h3><p class="precio sc">$850<small>/mes</small></p>
      <ul>${li('Proyectos ilimitados', 'sc')}${li('Análisis ilimitado', 'sc')}${li('API dedicada', 'sc')}${li('Soporte 24/7', 'sc')}</ul>
      <button class="lp-btn w" type="button" disabled>Próximamente</button>
    </div>
  </div>
</section>

<section class="lp-sec lp-cta-wrap">
  <div class="lp-cta glass">
    <h2 class="lp-h2">Empieza a documentar en segundos</h2>
    <p>Sube tu primer proyecto ahora mismo, sin crear cuenta.</p>
    <a class="lp-btn p" href="#/nuevo">Analizar mi proyecto →</a>
  </div>
</section>

<footer class="lp-foot glass">
  <p>AutoDocs AI — hecho con <span class="pr">HTML + CSS + JavaScript</span> · PWA · 2026</p>
</footer>`;