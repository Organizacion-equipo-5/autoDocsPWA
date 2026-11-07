// Motor de análisis: recibe los archivos de un proyecto y devuelve su documentación técnica.
import { leerZip } from './zip.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fallo = (msg) => Object.assign(new Error(msg), { amable: true });

const IGNORAR = /(^|\/)(node_modules|\.git|dist|build|venv|\.venv|__pycache__|vendor|\.next|target|bin|obj|coverage|\.idea|\.vscode)(\/|$)/;
const LENG = { js: 'JavaScript', jsx: 'JavaScript', mjs: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', vue: 'Vue', py: 'Python', java: 'Java', cs: 'C#', php: 'PHP', go: 'Go', rb: 'Ruby', sql: 'SQL', html: 'HTML', css: 'CSS', scss: 'CSS' };
const FAM = { js: 'js', jsx: 'js', mjs: 'js', ts: 'js', tsx: 'js', vue: 'js', py: 'py', java: 'java', cs: 'java', php: 'php', go: 'go', rb: 'rb' };
const TEXTO = new Set([...Object.keys(LENG), 'md', 'json', 'txt', 'yml', 'yaml', 'xml', 'gitignore']);
const MAX_GH = 150;
const ext = (p) => (p.split('.').pop() || '').toLowerCase();
export const aceptable = (p, size) => !IGNORAR.test(p) && size <= 300000 && TEXTO.has(ext(p));

const ID = '[A-Za-z_$][\\w$]*';
const PATRONES = {
  js: [[new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s*\\*?\\s*(${ID})\\s*\\(`), 'función'],
    [new RegExp(`^\\s*(?:export\\s+)?(?:const|let|var)\\s+(${ID})\\s*=\\s*(?:async\\s*)?(?:\\([^)]*\\)|${ID})\\s*=>`), 'función'],
    [new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:abstract\\s+)?class\\s+(${ID})`), 'clase']],
  py: [[/^\s*(?:async\s+)?def\s+(\w+)\s*\(/, 'función'], [/^\s*class\s+(\w+)/, 'clase']],
  java: [[/^\s*(?:public|protected|private|internal)?\s*(?:static\s+)?(?:abstract\s+)?(?:final\s+|sealed\s+|partial\s+)*(?:class|interface|enum|record)\s+(\w+)/, 'clase'],
    [/^\s*(?:public|protected|private|internal)\s+(?:static\s+)?(?:final\s+|async\s+|override\s+)*[\w<>\[\],.? ]+\s+(\w+)\s*\([^;]*$/, 'función']],
  php: [[/^\s*(?:public\s+|private\s+|protected\s+|static\s+)*function\s+(\w+)\s*\(/, 'función'], [/^\s*(?:abstract\s+|final\s+)?class\s+(\w+)/, 'clase']],
  go: [[/^func\s+(?:\([^)]*\)\s*)?(\w+)\s*\(/, 'función'], [/^type\s+(\w+)\s+struct/, 'clase']],
  rb: [[/^\s*def\s+(?:self\.)?(\w+)/, 'función'], [/^\s*class\s+(\w+)/, 'clase']]
};

const RUTAS = [
  (l) => l.match(/\b(?:app|router|server|api|\w+Router)\.(get|post|put|delete|patch|all)\(\s*['"`]([^'"`]+)['"`]/i)?.slice(1, 3),
  (l) => { const m = l.match(/@\w+\.route\(\s*['"]([^'"]+)['"](?:.*methods\s*=\s*\[([^\]]*)\])?/); return m && [(m[2] || 'GET').replace(/['"\s]/g, ''), m[1]]; },
  (l) => l.match(/@(Get|Post|Put|Delete|Patch)\(\s*['"]([^'"]*)['"]/)?.slice(1, 3),
  (l) => { const m = l.match(/@(Get|Post|Put|Delete|Patch|Request)Mapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/); return m && [m[1].toUpperCase(), m[2]]; },
  (l) => l.match(/Route::(get|post|put|delete|patch|any)\(\s*['"]([^'"]+)['"]/i)?.slice(1, 3)
];

function prefijoComun(rutas) {
  const s = rutas[0]?.split('/');
  if (!s || s.length < 2) return '';
  const pre = s[0] + '/';
  return rutas.every((r) => r.startsWith(pre)) ? pre : '';
}

function arbolTexto(rutas, nombre) {
  const raiz = Object.create(null);
  for (const p of rutas) { let n = raiz; for (const s of p.split('/')) n = n[s] ??= Object.create(null); }
  const out = [nombre + '/'];
  const rec = (n, pref) => {
    const ks = Object.keys(n).sort((a, b) => (Object.keys(n[b]).length > 0) - (Object.keys(n[a]).length > 0) || a.localeCompare(b));
    ks.forEach((k, i) => {
      if (out.length >= 500) return;
      const ult = i === ks.length - 1, hijos = Object.keys(n[k]).length > 0;
      out.push(pref + (ult ? '└── ' : '├── ') + k + (hijos ? '/' : ''));
      if (hijos) rec(n[k], pref + (ult ? '    ' : '│   '));
    });
  };
  rec(raiz, '');
  if (out.length >= 500) out.push('… (se muestran los primeros 500 elementos)');
  return out.join('\n');
}

function tablasSQL(texto, archivo) {
  const out = [];
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?[`"\[]?([\w.]+)[`"\]]?\s*\(([\s\S]*?)\)\s*(?:engine|;|default|charset|collate|$)/gi;
  for (const m of texto.matchAll(re)) {
    const cols = [], pks = new Set(), fks = [];
    let prof = 0, ini = 0;
    const partes = [];
    m[2].split('').forEach((c, i) => {
      if (c === '(') prof++; else if (c === ')') prof--;
      else if (c === ',' && prof === 0) { partes.push(m[2].slice(ini, i)); ini = i + 1; }
    });
    partes.push(m[2].slice(ini));
    for (const raw of partes) {
      const t = raw.trim().replace(/\s+/g, ' ');
      if (!t) continue;
      const pk = t.match(/primary key\s*\(([^)]+)\)/i);
      const fk = t.match(/foreign key\s*\(\W?(\w+)\W?\)\s*references\s+\W?(\w+)/i);
      if (pk) pk[1].split(',').forEach((c) => pks.add(c.replace(/[`"\s]/g, '')));
      if (fk) fks.push({ col: fk[1], tabla: fk[2] });
      if (pk || fk || /^(constraint|unique|key|index|check|fulltext)\b/i.test(t)) continue;
      const [nom, tipo = ''] = t.replace(/\([^)]*\)/g, (x) => x.replace(/\s/g, '')).split(' ');
      const col = nom.replace(/[`"\[\]]/g, '');
      const inl = t.match(/references\s+\W?(\w+)/i);
      if (inl) fks.push({ col, tabla: inl[1] });
      if (/primary key/i.test(t)) pks.add(col);
      cols.push({ nombre: col, tipo: tipo.replace(/[,]/g, ''), nulo: !/not null/i.test(t) });
    }
    out.push({ nombre: m[1], archivo, columnas: cols.map((c) => ({ ...c, pk: pks.has(c.nombre) })), fks });
  }
  return out;
}

const idm = (s) => String(s).replace(/\W/g, '_');
function diagramas(nombre, rutas, funciones, tablas) {
  const top = {};
  for (const p of rutas) { const s = p.split('/'); const k = s.length > 1 ? s[0] : '(raíz)'; top[k] = (top[k] || 0) + 1; }
  const q = (s) => String(s).replace(/"/g, "'");
  const estructura = `flowchart LR\n  R["${q(nombre)}"]\n` + Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n], i) => `  R --> D${i}["${q(k)} (${n})"]`).join('\n');
  const cl = [...new Set(funciones.filter((f) => f.tipo === 'clase').map((f) => f.nombre))].slice(0, 25);
  const clases = cl.length ? 'classDiagram\n' + cl.map((c) => `  class ${idm(c)}`).join('\n') : '';
  const er = tablas.length ? 'erDiagram\n' + tablas.map((t) => `  ${idm(t.nombre)} {\n${t.columnas.map((c) => `    ${idm((c.tipo || 'text').replace(/\(.*$/, ''))} ${idm(c.nombre)}${c.pk ? ' PK' : ''}`).join('\n')}\n  }`).join('\n') + '\n' +
    tablas.flatMap((t) => t.fks.map((f) => `  ${idm(t.nombre)} }o--|| ${idm(f.tabla)} : "${idm(f.col)}"`)).join('\n') : '';
  return { estructura, clases, er };
}

export async function analizar({ nombre, origen, archivos, rutas, avisos = [] }) {
  if (!rutas.length) throw fallo('No se encontraron archivos en el proyecto.');
  const funciones = [], endpoints = [], tablas = [], langs = {}, deps = [], largos = [];
  let lineasCodigo = 0, comentarios = 0, pendientes = 0, documentadas = 0, archivosCodigo = 0;
  let i = 0;
  for (const f of archivos) {
    if (++i % 40 === 0) await new Promise((r) => setTimeout(r));
    const e = ext(f.path), leng = LENG[e], fam = FAM[e];
    const lineas = f.text.split(/\r?\n/);
    if (e === 'json' && /(^|\/)package\.json$/.test(f.path)) { try { const j = JSON.parse(f.text); deps.push(...Object.keys({ ...j.dependencies, ...j.devDependencies })); } catch { /* json inválido */ } }
    if (/(^|\/)requirements\.txt$/.test(f.path)) deps.push(...lineas.map((l) => l.split(/[=<>~\s]/)[0].trim()).filter((l) => l && !l.startsWith('#')));
    if (!leng) continue;
    const codigo = lineas.filter((l) => l.trim()).length;
    archivosCodigo++;
    lineasCodigo += codigo;
    langs[leng] ??= { nombre: leng, archivos: 0, lineas: 0 };
    langs[leng].archivos++; langs[leng].lineas += codigo;
    if (lineas.length > 400) largos.push({ archivo: f.path, lineas: lineas.length });
    const reCom = e === 'sql' ? /^\s*--/ : fam === 'py' || fam === 'rb' ? /^\s*#/ : /^\s*(\/\/|\/\*|\*)/;
    lineas.forEach((l, n) => {
      if (reCom.test(l)) comentarios++;
      if (/\b(TODO|FIXME|HACK)\b/.test(l)) pendientes++;
      if (!fam || reCom.test(l)) return;
      for (const [re, tipo] of PATRONES[fam]) {
        const m = l.match(re);
        if (!m) continue;
        let k = n - 1;
        while (k >= 0 && (!lineas[k].trim() || lineas[k].trim().startsWith('@'))) k--;
        let doc = k >= 0 && /^(\/\/|\/\*|\*|#|\/\/\/)|\*\/$/.test(lineas[k].trim());
        if (fam === 'py') { let j = n + 1; while (j < lineas.length && !lineas[j].trim()) j++; doc = /^\s*(r?"""|r?''')/.test(lineas[j] || ''); }
        if (doc) documentadas++;
        funciones.push({ nombre: m[1], tipo, archivo: f.path, linea: n + 1, doc });
        break;
      }
      if (fam !== 'go' && fam !== 'rb') {
        for (const r of RUTAS) {
          const m = r(l);
          if (m) { endpoints.push({ metodo: m[0].toUpperCase(), ruta: m[1], archivo: f.path, linea: n + 1 }); break; }
        }
      }
      if (fam === 'py' && /(^|\/)urls\.py$/.test(f.path)) {
        const d = l.match(/\bpath\(\s*['"]([^'"]*)['"]/);
        if (d) endpoints.push({ metodo: 'ANY', ruta: '/' + d[1], archivo: f.path, linea: n + 1 });
      }
    });
    if (e === 'sql') tablas.push(...tablasSQL(f.text, f.path));
  }
  const tiene = (re) => rutas.some((p) => re.test(p));
  const readme = tiene(/(^|\/)readme(\.\w+)?$/i), gitignore = tiene(/(^|\/)\.gitignore$/);
  const tests = tiene(/(^|\/)(tests?|__tests__|spec)(\/|$)|\.(test|spec)\.\w+$|(^|\/)test_.*\.py$/i);
  const docPct = funciones.length ? Math.round((100 * documentadas) / funciones.length) : 0;
  const comPct = lineasCodigo ? Math.round((1000 * comentarios) / lineasCodigo) / 10 : 0;
  const puntaje = Math.round((docPct / 100) * 30 + Math.min(comPct / 10, 1) * 15 + (readme ? 15 : 0) + (tests ? 15 : 0) + (gitignore ? 5 : 0) +
    (1 - largos.length / Math.max(archivosCodigo, 1)) * 10 + Math.max(0, 10 - Math.max(0, pendientes - 5)));
  return {
    nombre, origen, fecha: Date.now(), avisos,
    resumen: { archivos: rutas.length, lineas: lineasCodigo, lenguajes: Object.values(langs).sort((a, b) => b.lineas - a.lineas) },
    dependencias: [...new Set(deps)].slice(0, 60),
    arbol: arbolTexto(rutas, nombre),
    funciones: funciones.slice(0, 3000), endpoints: endpoints.slice(0, 500), tablas,
    metricas: { puntaje, docPct, comPct, readme, gitignore, tests, pendientes, largos: largos.sort((a, b) => b.lineas - a.lineas).slice(0, 5) },
    diagramas: diagramas(nombre, rutas, funciones, tablas)
  };
}

export async function analizarZip(file, progreso) {
  progreso('Leyendo archivo comprimido…');
  let z;
  try { z = await leerZip(await file.arrayBuffer(), aceptable); } catch { throw fallo('No se pudo leer el archivo. Verifica que sea un .zip válido.'); }
  const pre = prefijoComun(z.rutas);
  const quitar = (p) => p.slice(pre.length);
  progreso('Analizando código…');
  return analizar({
    nombre: file.name.replace(/\.zip$/i, ''), origen: 'Archivo ' + file.name,
    archivos: z.archivos.map((f) => ({ ...f, path: quitar(f.path) })),
    rutas: z.rutas.map(quitar).filter((p) => !IGNORAR.test(p))
  });
}

export async function analizarGitHub(url, progreso) {
  const m = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/tree\/([^?#]+))?\/?(?:[?#].*)?$/i);
  if (!m) throw fallo('La URL debe tener la forma https://github.com/usuario/repositorio.');
  const [, dueno, repo, rama] = m;
  const ref = rama || 'HEAD';
  progreso('Consultando el repositorio…');
  let r;
  try { r = await fetch(`https://api.github.com/repos/${dueno}/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`); } catch { throw fallo('No se pudo conectar con GitHub. Revisa tu conexión.'); }
  if (r.status === 404) throw fallo('No se encontró el repositorio. Verifica la URL y que sea público.');
  if (r.status === 403) throw fallo('GitHub limitó las consultas desde tu red. Espera un rato o sube el proyecto como .zip.');
  if (!r.ok) throw fallo('GitHub respondió con un error. Inténtalo de nuevo.');
  const { tree } = await r.json();
  const blobs = tree.filter((t) => t.type === 'blob' && !IGNORAR.test(t.path));
  const peso = (p) => (/readme\.md$/i.test(p) ? 0 : LENG[ext(p)] ? 1 : 2);
  const cand = blobs.filter((b) => aceptable(b.path, b.size || 0)).sort((a, b) => peso(a.path) - peso(b.path));
  const usar = cand.slice(0, MAX_GH);
  const avisos = cand.length > MAX_GH ? [`Por rendimiento se analizaron ${MAX_GH} de ${cand.length} archivos. Sube el .zip para un análisis completo.`] : [];
  const archivos = [], cola = [...usar];
  let hechos = 0;
  const obrero = async () => {
    while (cola.length) {
      const b = cola.shift();
      try {
        const x = await fetch(`https://raw.githubusercontent.com/${dueno}/${repo}/${ref}/${b.path.split('/').map(encodeURIComponent).join('/')}`);
        if (x.ok) archivos.push({ path: b.path, text: await x.text() });
      } catch { /* se omite el archivo */ }
      progreso(`Descargando archivos (${++hechos}/${usar.length})…`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, obrero));
  progreso('Analizando código…');
  return analizar({ nombre: repo, origen: `GitHub: ${dueno}/${repo}`, archivos, rutas: blobs.map((b) => b.path), avisos });
}
