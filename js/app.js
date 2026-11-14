import { WELCOME } from './config.js';
import { getAll, get, put, del, clear } from './db.js';
import { INICIO } from './landing.js';
import { esc, analizarZip, analizarGitHub } from './analyzer.js';
import { reporteHTML, reporteMD, documentoHTML, MERMAID } from './report.js';

const $main = document.getElementById('main');
const $toast = document.getElementById('toast');
const activos = new Set();
const progresos = new Map();
let regSW = null;
let promptInstalar = null;
let quiereActualizar = false;

/* ---------- utilidades ---------- */
function aviso(msg) {
  $toast.textContent = msg;
  $toast.classList.add('show');
  clearTimeout(aviso.t);
  aviso.t = setTimeout(() => $toast.classList.remove('show'), 3200);
}
const fechaCorta = (ts) => new Date(ts).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const rutaActual = () => location.hash.replace(/^#\/?/, '').split('/')[0];
function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const nombreArchivo = (t) => (t || 'proyecto').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'proyecto';
async function notificar(titulo, cuerpo) {
  if (!('Notification' in window) || Notification.permission !== 'granted' || !regSW) return;
  try { await regSW.showNotification(titulo, { body: cuerpo, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png' }); } catch { /* sin permiso o sin soporte */ }
}
function marcar(el, msg) {
  const err = document.getElementById('e-' + el.name);
  if (!err) return;
  err.textContent = msg;
  err.hidden = !msg;
  el.setAttribute('aria-invalid', msg ? 'true' : 'false');
}

/* ---------- análisis en segundo plano ---------- */
async function procesar(rec, trabajo) {
  activos.add(rec.id);
  try {
    const analisis = await trabajo((m) => {
      progresos.set(rec.id, m);
      const el = document.getElementById('progreso');
      if (el && Number(el.dataset.id) === rec.id) el.textContent = m;
    });
    Object.assign(rec, { estado: 'listo', analisis, actualizado: Date.now() });
    await put('projects', rec);
    aviso(`Documentación lista: ${rec.nombre}`);
    notificar('Documentación lista', rec.nombre);
  } catch (err) {
    console.error(err);
    Object.assign(rec, { estado: 'error', error: err.amable ? err.message : 'Ocurrió un error inesperado al analizar el proyecto.', actualizado: Date.now() });
    await put('projects', rec);
    aviso('No se pudo analizar el proyecto.');
  } finally {
    activos.delete(rec.id);
    progresos.delete(rec.id);
    const [, r, a] = location.hash.replace(/^#/, '').split('/');
    if (r === 'proyectos') vistaProyectos();
    else if (r === 'ver' && Number(a) === rec.id) vistaVer(rec.id);
  }
}
async function iniciar(nombre, origen, trabajo) {
  const rec = { nombre, origen, estado: 'procesando', creado: Date.now(), actualizado: Date.now() };
  rec.id = await put('projects', rec);
  procesar(rec, trabajo);
  aviso('Análisis iniciado en segundo plano');
    location.hash = '#/proyectos';
}

/* ---------- vistas ---------- */
// v2.5.0: criterios de orden. La preferencia se guarda en localStorage (opcional: si falla, se usa "recientes").
const ORDENES = {
  recientes: { texto: 'Más recientes', fn: (a, b) => b.actualizado - a.actualizado },
  nombre: { texto: 'Nombre (A-Z)', fn: (a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }) },
  calidad: { texto: 'Mayor calidad', fn: (a, b) => (b.analisis?.metricas?.puntaje ?? -1) - (a.analisis?.metricas?.puntaje ?? -1) }
};
function ordenGuardado() {
  try { const o = localStorage.getItem('autodocs-orden'); return ORDENES[o] ? o : 'recientes'; } catch { return 'recientes'; }
}

async function vistaProyectos() {
  const proyectos = await getAll('projects');
  let orden = ordenGuardado();
  const fijados = () => proyectos.filter((p) => p.fijado).length;
  $main.innerHTML = `
    <section class="hero"><h1>Tus proyectos</h1><p>${esc(WELCOME)}</p></section>
    <div class="bar">
      <label class="sr" for="q">Buscar proyectos</label>
      <input id="q" type="search" placeholder="Buscar por nombre u origen" autocomplete="off">
      <label class="sr" for="orden">Ordenar proyectos</label>
      <select id="orden">${Object.entries(ORDENES).map(([k, o]) => `<option value="${k}"${k === orden ? ' selected' : ''}>${o.texto}</option>`).join('')}</select>
      <a class="btn primary" href="#/nuevo">Analizar proyecto</a>
    </div>
    <p id="resumen" class="meta resumen" role="status"></p>
    <ul id="lista" class="lista"></ul>`;
  const $lista = document.getElementById('lista');
  const $q = document.getElementById('q');
  const pintar = () => {
    const t = $q.value.trim().toLowerCase();
    // Los proyectos fijados siempre van primero; dentro de cada grupo se aplica el orden elegido.
    const items = proyectos
      .filter((p) => !t || p.nombre.toLowerCase().includes(t) || p.origen.toLowerCase().includes(t))
      .sort((a, b) => (Number(!!b.fijado) - Number(!!a.fijado)) || ORDENES[orden].fn(a, b));
    document.getElementById('resumen').textContent = proyectos.length
      ? `${proyectos.length} ${proyectos.length === 1 ? 'proyecto' : 'proyectos'} · ${fijados()} ${fijados() === 1 ? 'fijado' : 'fijados'}`
      : '';
    if (!items.length) {
      $lista.innerHTML = `<li class="vacio-estado">${proyectos.length ? 'Ningún proyecto coincide con la búsqueda.' : 'Aún no tienes proyectos. Sube un .zip o indica un repositorio de GitHub.'}</li>`;
      return;
    }
    $lista.innerHTML = items.map((p) => `
      <li class="item${p.fijado ? ' fijado' : ''}">
        <div class="item-info">
          ${p.estado === 'listo' ? `<a class="item-titulo" href="#/ver/${p.id}">${esc(p.nombre)}</a>` : `<span class="item-titulo">${esc(p.nombre)}</span>`}
          <span class="meta">${esc(p.origen)} · ${fechaCorta(p.actualizado)}</span>
          ${p.estado === 'procesando' ? '<span class="meta" role="status">Analizando en segundo plano…</span>' : ''}
          ${p.estado === 'error' ? `<span class="error">${esc(p.error)}</span>` : ''}
        </div>
        <div class="item-acc">
          ${p.estado === 'listo' ? `<span class="pill">Calidad ${p.analisis.metricas.puntaje}/100</span><a class="btn small" href="#/ver/${p.id}">Ver</a>` : ''}
          <button class="btn small icono pin${p.fijado ? ' on' : ''}" type="button" data-fijar="${p.id}" aria-pressed="${p.fijado ? 'true' : 'false'}" aria-label="${p.fijado ? 'Quitar de fijados' : 'Fijar'} ${esc(p.nombre)}" title="${p.fijado ? 'Quitar de fijados' : 'Fijar arriba'}">${p.fijado ? '★' : '☆'}</button>
          <button class="btn small danger" type="button" data-borrar="${p.id}" aria-label="Eliminar ${esc(p.nombre)}">Eliminar</button>
        </div>
      </li>`).join('');
  };
  pintar();
  $q.addEventListener('input', pintar);
  document.getElementById('orden').addEventListener('change', (e) => {
    orden = ORDENES[e.target.value] ? e.target.value : 'recientes';
    try { localStorage.setItem('autodocs-orden', orden); } catch { /* sin almacenamiento: no se recuerda */ }
    pintar();
  });
  $lista.addEventListener('click', async (e) => {
    const idFijar = e.target.closest('[data-fijar]')?.dataset.fijar;
    if (idFijar) {
      const p = proyectos.find((x) => x.id === Number(idFijar));
      if (!p) return;
      // Se guarda solo el campo nuevo `fijado`; los registros anteriores (sin el campo) siguen siendo válidos.
      p.fijado = !p.fijado;
      await put('projects', p);
      pintar();
      aviso(p.fijado ? `Fijado: ${p.nombre}` : `Ya no está fijado: ${p.nombre}`);
      document.querySelector(`[data-fijar="${p.id}"]`)?.focus();
      return;
    }
    const id = e.target.closest('[data-borrar]')?.dataset.borrar;
    if (!id) return;
    const p = proyectos.find((x) => x.id === Number(id));
    if (!confirm(`¿Eliminar "${p.nombre}" y su documentación? Esta acción no se puede deshacer.`)) return;
    await del('projects', Number(id));
    aviso('Proyecto eliminado');
    vistaProyectos();
  });
}

async function vistaNuevo() {
  $main.innerHTML = `
    <section class="hero"><h1>Analizar proyecto</h1><p>El análisis corre en tu navegador: el código no se envía a ningún servidor. Puedes seguir usando la app mientras termina.</p></section>
    <form id="f-zip" class="tarjeta" novalidate>
      <h2 class="sub">Subir archivo comprimido</h2>
      <div class="campo">
        <label for="z-archivo">Archivo .zip del proyecto (máx. 50 MB)</label>
        <input id="z-archivo" name="archivo" type="file" accept=".zip,application/zip" aria-describedby="e-archivo">
        <p class="error" id="e-archivo" hidden></p>
      </div>
      <button class="btn primary" type="submit">Analizar archivo</button>
    </form>
    <form id="f-git" class="tarjeta" novalidate>
      <h2 class="sub">Repositorio de GitHub</h2>
      <div class="campo">
        <label for="g-url">URL del repositorio público</label>
        <input id="g-url" name="url" type="url" placeholder="https://github.com/usuario/repositorio" aria-describedby="e-url">
        <p class="error" id="e-url" hidden></p>
      </div>
      <button class="btn primary" type="submit">Analizar repositorio</button>
      <p class="meta">Requiere conexión. Se analizan hasta 150 archivos de código.</p>
    </form>`;
  const fz = document.getElementById('f-zip');
  const fg = document.getElementById('f-git');
  fz.addEventListener('input', (e) => marcar(e.target, ''));
  fg.addEventListener('input', (e) => marcar(e.target, ''));
  fz.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = fz.elements.archivo.files[0];
    if (!f) return marcar(fz.elements.archivo, 'Elige un archivo .zip.'), fz.elements.archivo.focus();
    if (!/\.zip$/i.test(f.name)) return marcar(fz.elements.archivo, 'El archivo debe ser un .zip.'), fz.elements.archivo.focus();
    if (f.size > 50 * 1048576) return marcar(fz.elements.archivo, 'El archivo supera los 50 MB.'), fz.elements.archivo.focus();
    iniciar(f.name.replace(/\.zip$/i, ''), 'Archivo ' + f.name, (p) => analizarZip(f, p));
  });
  fg.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = fg.elements.url.value.trim();
    const m = url.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i);
    if (!m) return marcar(fg.elements.url, 'Escribe una URL como https://github.com/usuario/repositorio.'), fg.elements.url.focus();
    if (!navigator.onLine) return marcar(fg.elements.url, 'Sin conexión: conéctate para analizar un repositorio o sube el .zip.'), fg.elements.url.focus();
    iniciar(m[2], `GitHub: ${m[1]}/${m[2]}`, (p) => analizarGitHub(url, p));
  });
}

async function cargarMermaid() {
  if (!navigator.onLine) return aviso('Sin conexión: los diagramas se dibujan con una librería en línea. El código sigue visible.');
  try {
    if (!window.mermaid) await new Promise((ok, no) => { const s = Object.assign(document.createElement('script'), { src: MERMAID, onload: ok, onerror: no }); document.head.appendChild(s); });
    window.mermaid.initialize({ startOnLoad: false });
    await window.mermaid.run({ querySelector: '.mermaid' });
  } catch { aviso('No se pudieron dibujar los diagramas. Revisa tu conexión.'); }
}

async function vistaVer(id) {
  const p = await get('projects', Number(id));
  if (!p) return noEncontrado();
  if (p.estado === 'procesando') {
    $main.innerHTML = `
      <section class="hero"><h1>Analizando ${esc(p.nombre)}…</h1>
        <p id="progreso" data-id="${p.id}" role="status">${esc(progresos.get(p.id) || 'Preparando el análisis…')}</p></section>
      <div class="tarjeta"><p>Puedes esperar aquí: la documentación aparecerá sola al terminar.</p></div>`;
    return;
  }
  if (p.estado === 'error') {
    $main.innerHTML = `
      <section class="hero"><h1>No se pudo analizar</h1><p>${esc(p.nombre)}</p></section>
      <div class="tarjeta"><p class="error">${esc(p.error)}</p>
        <div class="acciones"><a class="btn primary" href="#/nuevo">Intentar de nuevo</a><a class="btn" href="#/proyectos">Mis proyectos</a></div></div>`;
    return;
  }
  $main.innerHTML = `
    <div class="acciones pegado">
      <button class="btn" type="button" data-x="md">Descargar Markdown</button>
      <button class="btn" type="button" data-x="html">Descargar HTML</button>
      <button class="btn" type="button" data-x="diagramas">Dibujar diagramas</button>
      <button class="btn primary" type="button" data-x="pdf">Imprimir o guardar PDF</button>
    </div>
    <article class="hoja imprimible">${reporteHTML(p.analisis)}</article>`;
  $main.querySelector('.acciones').addEventListener('click', (e) => {
    const x = e.target.closest('[data-x]')?.dataset.x;
    const base = nombreArchivo(p.nombre) + '-documentacion';
    if (x === 'md') { descargar(base + '.md', reporteMD(p.analisis), 'text/markdown;charset=utf-8'); aviso('Markdown descargado'); }
    else if (x === 'html') { descargar(base + '.html', documentoHTML(p.analisis), 'text/html;charset=utf-8'); aviso('HTML descargado'); }
    else if (x === 'diagramas') cargarMermaid();
    else if (x === 'pdf') window.print();
  });
}
function versionSW() {
  return new Promise((resolve) => {
    const c = navigator.serviceWorker?.controller;
    if (!c) return resolve('sin service worker activo');
    const ch = new MessageChannel();
    ch.port1.onmessage = (e) => resolve(e.data);
    c.postMessage({ tipo: 'VERSION' }, [ch.port2]);
    setTimeout(() => resolve('desconocida'), 1200);
  });
}

async function vistaEstado() {
  const [version, claves, est, proyectos] = await Promise.all([
    versionSW(),
    'caches' in window ? caches.keys() : [],
    navigator.storage?.estimate?.() ?? {},
    getAll('projects')
  ]);
  const permiso = 'Notification' in window ? Notification.permission : 'no disponible';
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const mb = (n) => (n ? (n / 1048576).toFixed(1) + ' MB' : '—');
  $main.innerHTML = `
    <section class="hero"><h1>Estado de la app</h1><p>Datos útiles para revisar la instalación, la caché y las actualizaciones.</p></section>
    <dl class="datos">
      <div><dt>Versión instalada</dt><dd>${esc(version)}</dd></div>
      <div><dt>Conexión</dt><dd>${navigator.onLine ? 'En línea' : 'Sin conexión'}</dd></div>
      <div><dt>Modo de uso</dt><dd>${standalone ? 'App instalada' : 'Navegador'}</dd></div>
      <div><dt>Cachés</dt><dd>${claves.length ? esc(claves.join(', ')) : 'ninguna'}</dd></div>
      <div><dt>Datos locales</dt><dd>${proyectos.length} proyectos analizados</dd></div>
      <div><dt>Almacenamiento</dt><dd>${mb(est.usage)} de ${mb(est.quota)}</dd></div>
      <div><dt>Avisos</dt><dd>${esc(permiso)}</dd></div>
    </dl>
    <div class="acciones pegado">
      <button class="btn" id="b-upd" type="button">Buscar actualización</button>
      <button class="btn" id="b-avisos" type="button">Activar avisos</button>
      <button class="btn" id="b-exp" type="button">Exportar copia de seguridad</button>
      <label class="btn" for="b-imp">Importar copia</label>
      <input id="b-imp" class="sr" type="file" accept="application/json">
    </div>`;
  document.getElementById('b-upd').onclick = async () => {
    if (!regSW) return aviso('El service worker aún no está registrado.');
    if (!navigator.onLine) return aviso('Sin conexión: no se puede buscar una versión nueva.');
    await regSW.update();
    setTimeout(() => aviso(regSW.waiting || regSW.installing ? 'Se encontró una versión nueva' : 'Ya tienes la última versión'), 800);
  };
  document.getElementById('b-avisos').onclick = async () => {
    if (!('Notification' in window)) return aviso('Este navegador no admite avisos.');
    const r = await Notification.requestPermission();
    aviso(r === 'granted' ? 'Avisos activados' : 'Los avisos quedaron desactivados');
    vistaEstado();
  };
  document.getElementById('b-exp').onclick = async () => {
    const copia = { app: 'autoDocs', fecha: new Date().toISOString(), projects: await getAll('projects') };
    descargar('autodocs-copia.json', JSON.stringify(copia, null, 2), 'application/json');
    aviso('Copia descargada');
  };
  document.getElementById('b-imp').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const c = JSON.parse(await f.text());
      if (c.app !== 'autoDocs' || !Array.isArray(c.projects)) throw new Error('formato');
      if (!confirm('Esto reemplazará los datos actuales por los de la copia. ¿Continuar?')) return;
      await clear('projects');
      for (const p of c.projects) await put('projects', p);
      aviso('Copia importada');
      vistaEstado();
    } catch { aviso('El archivo no es una copia válida de AutoDocs AI.'); }
  };
}

function noEncontrado() {
  $main.innerHTML = `<section class="hero"><h1>No encontrado</h1><p>Ese proyecto no existe o su análisis aún no termina.</p></section><a class="btn primary" href="#/">Volver a proyectos</a>`;
}

/* ---------- enrutador ---------- */
async function enrutar() {
  const [, ruta = '', arg = ''] = location.hash.replace(/^#/, '').split('/');
  document.querySelectorAll('.tabs a').forEach((a) => {
    const activo = a.dataset.tab === (ruta === 'ver' ? 'proyectos' : ruta);
    a.classList.toggle('on', activo);
    activo ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
  $main.className = ruta === '' ? 'landing' : '';
  try {
    if (ruta === '') vistaInicio();
    else if (ruta === 'proyectos') await vistaProyectos();
    else if (ruta === 'nuevo') await vistaNuevo();
    else if (ruta === 'ver') await vistaVer(arg);
    else if (ruta === 'estado') await vistaEstado();
    else noEncontrado();
  } catch (err) {
    console.error(err);
    $main.innerHTML = '<section class="hero"><h1>Algo salió mal</h1><p>No se pudo cargar esta pantalla. Recarga la página; tus datos siguen guardados.</p></section>';
  }
  window.scrollTo(0, 0);
  $main.focus({ preventScroll: true });
}
window.addEventListener('hashchange', enrutar);

function vistaInicio() {
  $main.innerHTML = INICIO;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $main.querySelectorAll('.tilt').forEach((c) => {
    const t = c.firstElementChild;
    c.addEventListener('mousemove', (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      t.style.transform = `perspective(1000px) rotateX(${(y - r.height / 2) / 40}deg) rotateY(${(r.width / 2 - x) / 40}deg) scale3d(1.02,1.02,1.02)`;
    });
    c.addEventListener('mouseleave', () => { t.style.transform = ''; });
  });
}

// Enlaces de sección (Funciones, Cómo funciona…): desplazan la página sin romper el enrutador.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-scroll]');
  if (!a) return;
  e.preventDefault();
  const ir = () => document.getElementById(a.dataset.scroll)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  if (rutaActual() === '') ir();
  else { location.hash = '#/'; setTimeout(ir, 250); }
});
/* ---------- conexión ---------- */
const $net = document.getElementById('net');
function estadoRed() {
  const on = navigator.onLine;
  $net.textContent = on ? 'En línea' : 'Sin conexión';
  $net.classList.toggle('off', !on);
}
window.addEventListener('online', () => { estadoRed(); aviso('Conexión restablecida'); });
window.addEventListener('offline', () => { estadoRed(); aviso('Sin conexión. Puedes seguir consultando tus proyectos y analizar archivos .zip.'); });
estadoRed();

/* ---------- instalación ---------- */
const $inst = document.getElementById('instalar');
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; $inst.hidden = false; });
$inst.addEventListener('click', async () => {
  if (!promptInstalar) return;
  promptInstalar.prompt();
  await promptInstalar.userChoice;
  promptInstalar = null;
  $inst.hidden = true;
});
window.addEventListener('appinstalled', () => { $inst.hidden = true; aviso('AutoDocs AI instalada'); });

/* ---------- service worker y actualizaciones ---------- */
const $upd = document.getElementById('update');
function ofrecerActualizacion(worker) {
  $upd.hidden = false;
  document.getElementById('btn-update').onclick = () => {
    quiereActualizar = true;
    worker.postMessage({ tipo: 'SKIP_WAITING' });
  };
}
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      regSW = await navigator.serviceWorker.register('sw.js');
      if (regSW.waiting && navigator.serviceWorker.controller) ofrecerActualizacion(regSW.waiting);
      regSW.addEventListener('updatefound', () => {
        const nuevo = regSW.installing;
        nuevo.addEventListener('statechange', () => {
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) ofrecerActualizacion(nuevo);
        });
      });
    } catch (err) { console.error('No se pudo registrar el service worker', err); }
  });
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (quiereActualizar) location.reload(); });
}

// Análisis que quedaron a medias al cerrar la app se marcan como interrumpidos.
(async () => {
  for (const p of await getAll('projects')) {
    if (p.estado === 'procesando' && !activos.has(p.id)) await put('projects', { ...p, estado: 'error', error: 'El análisis se interrumpió al cerrar la app. Vuelve a subir el proyecto.' });
  }
  enrutar();
})();
