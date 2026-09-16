// Utilidades compartidas por los scripts de datos.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

export const ROOT = path.resolve(import.meta.dirname, '..', '..');
export const PUBLIC_DATA = path.join(ROOT, 'public', 'data');

// Las descargas crudas pueden pesar >1 GB: se guardan fuera del proyecto
// (que vive en OneDrive) para no sincronizarlas a la nube.
export const CACHE_DIR =
  process.env.DBA_CACHE_DIR ?? path.join(os.homedir(), '.cache', 'digital-buenos-aires', 'raw');

export const BA_CDN = 'https://cdn.buenosaires.gob.ar/datosabiertos/datasets';

// El portal de datos de la Ciudad rechaza clientes sin User-Agent de navegador.
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
};

/** Descarga `url` al caché (si no existe ya) y devuelve la ruta local. */
export async function download(url, filename = path.basename(new URL(url).pathname)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const dest = path.join(CACHE_DIR, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return dest;

  console.log(`↓ ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
  const tmp = `${dest}.part`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  fs.renameSync(tmp, dest);
  return dest;
}

/** Redondea recursivamente coordenadas a `decimals` (6 ≈ 10 cm). */
export function roundCoords(coords, decimals = 6) {
  const f = 10 ** decimals;
  if (typeof coords[0] === 'number') return coords.map((c) => Math.round(c * f) / f);
  return coords.map((c) => roundCoords(c, decimals));
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
  const kb = (fs.statSync(file).size / 1024).toFixed(0);
  console.log(`✓ ${path.relative(ROOT, file)} (${kb} KB)`);
}
