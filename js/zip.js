// Lector mínimo de .zip sin dependencias (usa DecompressionStream del navegador).
// aceptar(ruta, tamaño) decide qué archivos se descomprimen; rutas lista todos los archivos.
export async function leerZip(buffer, aceptar) {
  const v = new DataView(buffer);
  const u8 = new Uint8Array(buffer);
  let e = buffer.byteLength - 22;
  while (e >= 0 && v.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip inválido');
  const total = v.getUint16(e + 10, true);
  let p = v.getUint32(e + 16, true);
  const dec = new TextDecoder();
  const archivos = [];
  const rutas = [];
  for (let i = 0; i < total; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const metodo = v.getUint16(p + 10, true);
    const comp = v.getUint32(p + 20, true);
    const real = v.getUint32(p + 24, true);
    const nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true);
    const off = v.getUint32(p + 42, true);
    const nombre = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    if (nombre.endsWith('/') || nombre.startsWith('__MACOSX/')) continue;
    rutas.push(nombre);
    if (!aceptar(nombre, real)) continue;
    const ini = off + 30 + v.getUint16(off + 26, true) + v.getUint16(off + 28, true);
    const datos = u8.subarray(ini, ini + comp);
    let bytes;
    if (metodo === 0) bytes = datos;
    else if (metodo === 8) bytes = new Uint8Array(await new Response(new Blob([datos]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    else continue;
    archivos.push({ path: nombre, text: dec.decode(bytes) });
  }
  return { archivos, rutas };
}
