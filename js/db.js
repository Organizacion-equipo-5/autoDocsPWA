// Capa mínima sobre IndexedDB. Los datos viven aquí, separados de la caché del Service Worker,
// por eso se conservan al actualizar la app.
const DB_NAME = 'autodocs';
const DB_VER = 2;
let dbp;

function abrir() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('templates')) db.createObjectStore('templates', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('projects')) db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return dbp;
}

function tx(store, modo, fn) {
  return abrir().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, modo);
    const req = fn(t.objectStore(store));
    t.oncomplete = () => resolve(req && req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const getAll = (s) => tx(s, 'readonly', (st) => st.getAll());
export const get = (s, k) => tx(s, 'readonly', (st) => st.get(k));
export const put = (s, v) => tx(s, 'readwrite', (st) => st.put(v));
export const del = (s, k) => tx(s, 'readwrite', (st) => st.delete(k));
export const clear = (s) => tx(s, 'readwrite', (st) => st.clear());
