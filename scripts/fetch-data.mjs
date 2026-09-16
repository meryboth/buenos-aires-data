// Descarga los datasets livianos de BA Data y los deja optimizados en public/data.
// Uso: npm run data:fetch
import fs from 'node:fs';
import path from 'node:path';
import { BA_CDN, PUBLIC_DATA, download, roundCoords, writeJson } from './lib/common.mjs';

/**
 * Cada entrada: url de origen, archivo de salida, propiedades a conservar
 * (con renombre opcional) y precisión de coordenadas.
 */
const DATASETS = [
  {
    name: 'colectivos-recorridos',
    url: `${BA_CDN}/transporte-y-obras-publicas/colectivos-recorridos/recorrido-colectivos.geojson`,
    props: (p) => ({
      linea: String(p.linea).replace(/^0+/, ''),
      recorrido: p.recorrido,
      sentido: p.sentido,
      desde: p.desde,
      hasta: p.hasta,
    }),
    decimals: 5,
  },
  {
    name: 'ciclovias',
    url: `${BA_CDN}/transporte-y-obras-publicas/ciclovias/ciclovias.geojson`,
    props: (p) => ({ nombre: p.nombre, tipo: p.tipo, barrio: p.barrio }),
  },
  {
    name: 'barrios',
    url: `${BA_CDN}/ministerio-de-educacion/barrios/barrios.geojson`,
    props: (p) => ({ barrio: p.nombre ?? p.BARRIO ?? p.barrio, comuna: p.comuna ?? p.COMUNA }),
    decimals: 5,
  },
];

const only = process.argv.slice(2);

for (const ds of DATASETS) {
  if (only.length && !only.includes(ds.name)) continue;
  try {
    const src = await download(ds.url, `${ds.name}.geojson`);
    const fc = JSON.parse(fs.readFileSync(src, 'utf8'));
    const features = fc.features
      .filter((f) => f.geometry)
      .map((f) => ({
        type: 'Feature',
        properties: ds.props(f.properties ?? {}),
        geometry: {
          type: f.geometry.type,
          coordinates: roundCoords(f.geometry.coordinates, ds.decimals ?? 6),
        },
      }));
    writeJson(path.join(PUBLIC_DATA, `${ds.name}.geojson`), { type: 'FeatureCollection', features });
  } catch (err) {
    console.error(`✗ ${ds.name}: ${err.message}`);
    process.exitCode = 1;
  }
}
