// Análisis "construido vs. permitido" por parcela:
//  - vector tiles public/tiles/parcels/{z}/{x}/{y}.pbf (envolvente permitida remanente)
//  - resumen por barrio public/data/resumen-barrios.json (capacidad constructiva y alturas)
//
// Requiere haber corrido antes build-building-tiles (altura construida por parcela).
// Uso: npm run data:parcels
import fs from 'node:fs';
import path from 'node:path';
import { BA_CDN, PUBLIC_DATA, download, roundCoords, writeJson } from './lib/common.mjs';
import { buildVectorTiles, readGeojsonLines } from './lib/tiles.mjs';
import {
  CATEGORIES,
  HIGH_REMAINING_M,
  PARCEL_HEIGHTS_FILE,
  TOLERANCE_M,
  ZONING_URL,
  analysisProps,
  loadZoning,
  normSmp,
} from './lib/zoning.mjs';

const SOURCE_URL = `${BA_CDN}/secretaria-de-desarrollo-urbano/parcelas/parcelas_catastrales.geojson`;
const STOREY_M = 3;

if (!fs.existsSync(PARCEL_HEIGHTS_FILE)) {
  console.error('Falta la altura construida por parcela: corré primero `npm run data:buildings`.');
  process.exit(1);
}
const heights = new Map(Object.entries(JSON.parse(fs.readFileSync(PARCEL_HEIGHTS_FILE, 'utf8'))));
const zoning = await loadZoning();
const src = await download(SOURCE_URL, 'parcelas.geojson');

// Área plana aproximada (m²) con proyección equirectangular local; suficiente a escala de parcela.
const M_PER_DEG_LAT = 110_574;
const M_PER_DEG_LON = 111_320 * Math.cos((-34.61 * Math.PI) / 180);
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] - ring[i][0]) * M_PER_DEG_LON * (ring[j][1] + ring[i][1]) * M_PER_DEG_LAT;
  }
  return Math.abs(a / 2);
}
const polygonArea = (rings) => rings.reduce((s, r, i) => s + (i === 0 ? ringArea(r) : -ringArea(r)), 0);
const area = (g) =>
  g.type === 'Polygon' ? polygonArea(g.coordinates) : g.coordinates.reduce((s, p) => s + polygonArea(p), 0);

// Rangos de altura construida (m) para el análisis "altura de la ciudad"; el último es abierto.
const HEIGHT_BINS = [6, 12, 24, 45];
const TALL_M = 30; // ~10 pisos

const emptyCounts = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
const emptyArea = () => ({
  parcelas: 0,
  categorias: emptyCounts(),
  volumenRemanenteM3: 0,
  alturas: { conEdificio: 0, sumaM: 0, altas: 0, rangos: HEIGHT_BINS.map(() => 0).concat(0) },
});
const byBarrio = new Map();
const city = emptyArea();

async function* parcels() {
  for await (const f of readGeojsonLines(src)) {
    const smp = normSmp(f.properties.smp);
    const zone = zoning.get(smp);
    const built = heights.get(smp) ?? 0; // sin volúmenes relevados: baldío, playa o espacio abierto
    const props = analysisProps(zone, built);
    const m2 = area(f.geometry);
    const remanente = props.cat.startsWith('rem_') ? m2 * (props.perm - built) : 0;

    const barrio = f.properties.barrio ?? 'Sin barrio';
    if (!byBarrio.has(barrio)) byBarrio.set(barrio, { barrio, ...emptyArea() });
    for (const acc of [city, byBarrio.get(barrio)]) {
      acc.parcelas++;
      acc.categorias[props.cat]++;
      acc.volumenRemanenteM3 += remanente;
      if (built > 0) {
        const h = acc.alturas;
        h.conEdificio++;
        h.sumaM += built;
        if (built >= TALL_M) h.altas++;
        const bin = HEIGHT_BINS.findIndex((max) => built < max);
        h.rangos[bin === -1 ? HEIGHT_BINS.length : bin]++;
      }
    }

    yield {
      type: 'Feature',
      id: f.properties.id,
      properties: {
        smp,
        barrio,
        area: Math.round(m2),
        ...props,
        ...(zone?.obs && { obs: zone.obs }),
      },
      geometry: { type: f.geometry.type, coordinates: roundCoords(f.geometry.coordinates, 6) },
    };
  }
}

await buildVectorTiles({
  features: parcels(),
  layer: 'parcels',
  // La envolvente sólo se dibuja desde zoom 14 (ver src/layers/envelope.ts).
  minzoom: 14,
  maxzoom: 14,
  meta: { source: SOURCE_URL, zoning: ZONING_URL },
});

const round = (n) => Math.round(n);
const finish = ({ alturas: { sumaM, ...h }, volumenRemanenteM3, ...rest }) => ({
  ...rest,
  volumenRemanenteM3: round(volumenRemanenteM3),
  alturas: { ...h, mediaM: h.conEdificio ? Math.round((sumaM / h.conEdificio) * 10) / 10 : 0 },
});
const summary = {
  generatedAt: new Date().toISOString(),
  metodologia: {
    alturaPermitida: 'Mayor valor entre la unidad de edificabilidad y el plano límite de la parcela (Código Urbanístico, dic. 2024).',
    alturaConstruida: 'Volumen más alto relevado en la parcela (Tejido urbano, fotogrametría).',
    toleranciaM: TOLERANCE_M,
    remanenteAltoDesdeM: HIGH_REMAINING_M,
    volumenRemanente:
      'Área de parcela × (altura permitida − construida), sólo parcelas con remanente. Cota superior: ignora retiros, fondo libre de manzana y FOT.',
    alturaPorPiso: STOREY_M,
    rangosAlturaM: HEIGHT_BINS,
    alturaEdificioAltoM: TALL_M,
    alturaMedia: 'Promedio de la altura máxima construida por parcela, sólo parcelas con edificación relevada.',
  },
  ciudad: finish(city),
  barrios: [...byBarrio.values()].map(finish).sort((a, b) => b.volumenRemanenteM3 - a.volumenRemanenteM3),
};
writeJson(path.join(PUBLIC_DATA, 'resumen-barrios.json'), summary);
console.log('  ciudad:', JSON.stringify(summary.ciudad));
