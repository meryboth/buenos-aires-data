// Generador genérico de vector tiles estáticos a partir de un stream de features GeoJSON.
//
// Paso 1: cada feature se agrega a buckets NDJSON (uno por tile de `bucketZoom` que toca).
// Paso 2: por bucket, geojson-vt corta los tiles `minzoom`–`maxzoom` y vt-pbf los codifica.
// Paso 3: los tiles se empaquetan en un único archivo PMTiles (public/tiles/<capa>.pmtiles),
// que cualquier hosting estático sirve con pedidos por rango.
// Así nunca se carga el dataset completo en memoria (sólo los tiles ya codificados).
import fs from 'node:fs';
import path from 'node:path';
import GeoJSONVT from 'geojson-vt';
import vtpbf from 'vt-pbf';
import { CACHE_DIR, ROOT } from './common.mjs';
import { writePmtiles } from './pmtiles.mjs';

// Margen (grados) al asignar buckets, para cubrir el buffer de los tiles vecinos.
const BUCKET_MARGIN = 0.0005;

const lon2tile = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
const lat2tile = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z);
};

export function bbox(coords, acc = [Infinity, Infinity, -Infinity, -Infinity]) {
  if (typeof coords[0] === 'number') {
    acc[0] = Math.min(acc[0], coords[0]);
    acc[1] = Math.min(acc[1], coords[1]);
    acc[2] = Math.max(acc[2], coords[0]);
    acc[3] = Math.max(acc[3], coords[1]);
  } else for (const c of coords) bbox(c, acc);
  return acc;
}

/**
 * @param {object} o
 * @param {AsyncIterable<object>} o.features  features GeoJSON ya livianos
 * @param {string} o.layer                    nombre de la capa dentro del tile y de la carpeta de salida
 * @param {number} o.minzoom
 * @param {number} o.maxzoom
 * @param {(props: object, z: number) => boolean} [o.keep]  filtro por zoom (p. ej. sólo edificios altos a escala ciudad)
 * @param {(feature: object) => object} [o.enrich]        transformación aplicada en el paso 2
 * @param {object} [o.meta]                              datos extra para metadata.json
 */
export async function buildVectorTiles({ features, layer, minzoom, maxzoom, keep = () => true, enrich, meta = {} }) {
  const outFile = path.join(ROOT, 'public', 'tiles', `${layer}.pmtiles`);
  const bucketDir = path.join(CACHE_DIR, '..', 'buckets', layer);
  const t0 = Date.now();

  console.log(`[${layer}] paso 1/2: agrupando features por tile…`);
  fs.rmSync(bucketDir, { recursive: true, force: true });
  fs.mkdirSync(bucketDir, { recursive: true });
  const streams = new Map();
  let count = 0;
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];

  for await (const f of features) {
    const [minX, minY, maxX, maxY] = bbox(f.geometry.coordinates);
    bounds[0] = Math.min(bounds[0], minX);
    bounds[1] = Math.min(bounds[1], minY);
    bounds[2] = Math.max(bounds[2], maxX);
    bounds[3] = Math.max(bounds[3], maxY);
    const line = JSON.stringify(f) + '\n';
    for (let x = lon2tile(minX - BUCKET_MARGIN, minzoom); x <= lon2tile(maxX + BUCKET_MARGIN, minzoom); x++) {
      for (let y = lat2tile(maxY + BUCKET_MARGIN, minzoom); y <= lat2tile(minY - BUCKET_MARGIN, minzoom); y++) {
        const key = `${x}_${y}`;
        if (!streams.has(key)) streams.set(key, fs.createWriteStream(path.join(bucketDir, `${key}.ndjson`)));
        const ws = streams.get(key);
        if (!ws.write(line)) await new Promise((r) => ws.once('drain', r));
      }
    }
    if (++count % 200_000 === 0) console.log(`  … ${count.toLocaleString('es-AR')} features`);
  }
  await Promise.all([...streams.values()].map((ws) => new Promise((r) => ws.end(r))));
  console.log(`  ${count.toLocaleString('es-AR')} features en ${streams.size} buckets`);

  console.log(`[${layer}] paso 2/2: generando tiles…`);
  const perZoom = {};
  const tiles = [];
  for (const key of streams.keys()) {
    const [bx, by] = key.split('_').map(Number);
    const text = fs.readFileSync(path.join(bucketDir, `${key}.ndjson`), 'utf8');
    let all = text.split('\n').filter(Boolean).map((l) => JSON.parse(l));
    if (enrich) all = all.map(enrich);

    for (let z = minzoom; z <= maxzoom; z++) {
      const subset = all.filter((f) => keep(f.properties, z));
      if (subset.length === 0) continue;
      const index = new GeoJSONVT(
        { type: 'FeatureCollection', features: subset },
        // El id va en el campo nativo del feature (feature.id), no como propiedad: ahorra ~18 % del tile.
        { maxZoom: maxzoom, indexMaxZoom: minzoom, indexMaxPoints: 0, tolerance: 0.5, buffer: 64 },
      );
      const n = 2 ** (z - minzoom);
      for (let dx = 0; dx < n; dx++) {
        for (let dy = 0; dy < n; dy++) {
          const [x, y] = [bx * n + dx, by * n + dy];
          const tile = index.getTile(z, x, y);
          if (!tile || tile.features.length === 0) continue;
          const buf = Buffer.from(vtpbf.fromGeojsonVt({ [layer]: tile }, { version: 2 }));
          tiles.push({ z, x, y, data: buf });
          const s = (perZoom[z] ??= { tiles: 0, bytes: 0, maxBytes: 0 });
          s.tiles++;
          s.bytes += buf.length;
          s.maxBytes = Math.max(s.maxBytes, buf.length);
        }
      }
    }
  }

  for (const [z, s] of Object.entries(perZoom)) {
    console.log(`  z${z}: ${s.tiles} tiles, ${(s.bytes / 1e6).toFixed(1)} MB sin comprimir (máx ${(s.maxBytes / 1e6).toFixed(2)} MB)`);
  }

  // Limpia el formato anterior (un .pbf por tile), si existe.
  fs.rmSync(path.join(ROOT, 'public', 'tiles', layer), { recursive: true, force: true });
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const written = writePmtiles(outFile, tiles, {
    minzoom,
    maxzoom,
    bounds,
    metadata: {
      name: layer,
      format: 'pbf',
      generator: 'buenos-aires-data-driven',
      generatedAt: new Date().toISOString(),
      vector_layers: [{ id: layer, minzoom, maxzoom, fields: {} }],
      features: count,
      tiles: perZoom,
      ...meta,
    },
  });
  console.log(
    `✓ [${layer}] listo en ${((Date.now() - t0) / 1000).toFixed(0)} s → ${path.relative(ROOT, outFile)} (${written.tiles} tiles, ${(written.bytes / 1e6).toFixed(1)} MB)`,
  );
}

/** Recorre un GeoJSON "un feature por línea" (formato de BA Data) sin cargarlo entero. */
export async function* readGeojsonLines(file) {
  const { createInterface } = await import('node:readline');
  const rl = createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.startsWith('{ "type": "Feature"')) continue;
    const f = JSON.parse(line.replace(/,\s*$/, ''));
    if (f.geometry) yield f;
  }
}
