// Efectos visuales y tema claro/oscuro.
// El tema se guarda en localStorage y se aplica antes de pintar (ver script inline en index.html).

const CLAVE_TEMA = 'autodocs-tema';
const $raiz = document.documentElement;
const $botonTema = document.getElementById('tema');
const $metaTema = document.querySelector('meta[name="theme-color"]');

function aplicarTema(tema, guardar = true) {
  const claro = tema === 'light';
  $raiz.dataset.theme = claro ? 'light' : 'dark';
  if (guardar) {
    try { localStorage.setItem(CLAVE_TEMA, $raiz.dataset.theme); } catch { /* almacenamiento no disponible */ }
  }
  if ($metaTema) $metaTema.setAttribute('content', claro ? '#f1f5f9' : '#0f1418');
  if ($botonTema) {
    $botonTema.textContent = claro ? '\u{1F319}' : '\u2600\uFE0F';
    $botonTema.setAttribute('aria-label', claro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
    $botonTema.setAttribute('title', claro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro');
  }
  pintarFondo();
}

if ($botonTema) {
  aplicarTema($raiz.dataset.theme || 'dark', false);
  $botonTema.addEventListener('click', () => {
    aplicarTema($raiz.dataset.theme === 'light' ? 'dark' : 'light');
  });
}

/* ---------- fondo de partículas (ligero y opcional) ---------- */
const $lienzo = document.getElementById('fx');
let ctx = null;
let particulas = [];
let ancho = 0;
let alto = 0;
let dpr = 1;
let animando = false;
let ultimoFrame = 0;
const reducirMovimiento = matchMedia('(prefers-reduced-motion: reduce)');

function tamano() {
  if (!$lienzo) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  ancho = window.innerWidth;
  alto = window.innerHeight;
  $lienzo.width = Math.round(ancho * dpr);
  $lienzo.height = Math.round(alto * dpr);
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  crearParticulas();
}

function crearParticulas() {
  if (!$lienzo) return;
  const cantidad = ancho < 640 ? 16 : ancho < 1024 ? 30 : 42;
  particulas = Array.from({ length: cantidad }, () => ({
    x: Math.random() * ancho,
    y: Math.random() * alto,
    r: 0.8 + Math.random() * 1.6,
    vx: (Math.random() - 0.5) * 0.18,
    vy: (Math.random() - 0.5) * 0.18,
  }));
}

function colorParticula() {
  return $raiz.dataset.theme === 'light'
    ? 'rgba(3, 105, 161, .35)'
    : 'rgba(142, 213, 255, .45)';
}

function pintarFondo() {
  if (!ctx || !particulas.length) return;
  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = colorParticula();
  for (const p of particulas) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function paso(ts) {
  if (!animando) return;
  // ~30 fps para no competir con la interfaz.
  if (ts - ultimoFrame > 33) {
    ultimoFrame = ts;
    for (const p of particulas) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -10) p.x = ancho + 10;
      if (p.x > ancho + 10) p.x = -10;
      if (p.y < -10) p.y = alto + 10;
      if (p.y > alto + 10) p.y = -10;
    }
    pintarFondo();
  }
  requestAnimationFrame(paso);
}

function iniciarFondo() {
  if (!$lienzo || reducirMovimiento.matches) return;
  ctx = $lienzo.getContext('2d');
  if (!ctx) return;
  tamano();
  animando = true;
  requestAnimationFrame(paso);
}

function detenerFondo() {
  animando = false;
  if (ctx) ctx.clearRect(0, 0, ancho, alto);
}

if ($lienzo) {
  iniciarFondo();
  addEventListener('resize', () => {
    if (!animando) return;
    tamano();
    pintarFondo();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) detenerFondo();
    else iniciarFondo();
  });
  reducirMovimiento.addEventListener?.('change', () => {
    if (reducirMovimiento.matches) detenerFondo();
    else iniciarFondo();
  });
}
