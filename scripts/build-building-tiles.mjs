// Edificios 3D: convierte "Tejido urbano" (~1 GB, 1,4 M volúmenes) en vector tiles
// public/tiles/buildings/{z}/{x}/{y}.pbf, enriquecidos con la normativa de su parcela.
// También guarda la altura máxima construida por parcela (la usa build-parcel-tiles).
//
// Uso: npm run data:buildings
import fs from 'node:fs';
import { BA_CDN, download, roundCoords } from './lib/common.mjs';
import { buildVectorTiles, readGeojsonLines } from './lib/tiles.mjs';
import { PARCEL_HEIGHTS_FILE, analysisProps, loadZoning, normSmp } from './lib/zoning.mjs';

const SOURCE_URL = `${BA_CDN}/secretaria-de-desarrollo-urbano/tejido-urbano/tejido.geojson`;

// Alturas por encima de este valor son errores de relevamiento (el edificio más alto ronda 235 m).
const MAX_PLAUSIBLE_HEIGHT = 300;

// Altura mínima por zoom: a escala ciudad sólo se muestran los edificios altos.
const MIN_HEIGHT_BY_ZOOM = { 12: 30, 13: 9, 14: 0 };

const src = await download(SOURCE_URL, 'tejido.geojson');
const zoning = await loadZoning();
const parcelHeights = new Map();
let clamped = 0;

async function* buildings() {
  for await (const f of readGeojsonLines(src)) {
    let altura = Number(f.properties.altura) || 0;
    const sospechosa = altura > MAX_PLAUSIBLE_HEIGHT;
    if (sospechosa) {
      altura = MAX_PLAUSIBLE_HEIGHT;
      clamped++;
    }
    const smp = normSmp(f.properties.smp);
    // Los volúmenes con altura dudosa no cuentan para la altura construida de la parcela.
    if (!sospechosa) parcelHeights.set(smp, Math.max(parcelHeights.get(smp) ?? 0, altura));
    yield {
      type: 'Feature',
      id: f.properties.id, // id nativo del tile (no se repite como propiedad)
      properties: { smp, altura, ...(sospechosa && { sospechosa: 1 }) },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 6) },
    };
  }
}

await buildVectorTiles({
  features: buildings(),
  layer: 'buildings',
  minzoom: 12,
  maxzoom: 14,
  keep: (p, z) => p.altura >= (MIN_HEIGHT_BY_ZOOM[z] ?? 0),
  // Corre después de recorrer todo el dataset, cuando ya se conoce la altura máxima de cada parcela.
  enrich: (f) => {
    const p = f.properties;
    Object.assign(p, analysisProps(zoning.get(p.smp), parcelHeights.get(p.smp) ?? p.altura));
    return f;
  },
  meta: { source: SOURCE_URL, minHeightByZoom: MIN_HEIGHT_BY_ZOOM, clampedHeights: clamped },
});

fs.writeFileSync(PARCEL_HEIGHTS_FILE, JSON.stringify(Object.fromEntries(parcelHeights)));
console.log(`  alturas construidas de ${parcelHeights.size.toLocaleString('es-AR')} parcelas → ${PARCEL_HEIGHTS_FILE}`);
