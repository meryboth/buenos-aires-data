// Normativa del Código Urbanístico por parcela y clasificación "construido vs. permitido".
import fs from 'node:fs';
import path from 'node:path';
import { BA_CDN, CACHE_DIR, download } from './common.mjs';

export const ZONING_URL = `${BA_CDN}/secretaria-de-desarrollo-urbano/codigo-urbanistico/codigo-urbanistico.csv`;

// Tanques, salas de máquinas y cajas de escalera pueden sobrepasar el plano límite:
// diferencias menores a esta tolerancia se consideran "en el límite".
export const TOLERANCE_M = 3;
// A partir de esta diferencia la capacidad remanente se considera alta (~4 pisos).
export const HIGH_REMAINING_M = 12;

export const PARCEL_HEIGHTS_FILE = path.join(CACHE_DIR, '..', 'parcel-heights.json');

/**
 * Los SMP (sección-manzana-parcela) vienen con formatos distintos según el dataset:
 * "087-006A-015", "87-006A-015", "055 - 200 - 005". Se normalizan a "87-6A-15".
 */
export const normSmp = (smp) =>
  String(smp ?? '')
    .split('-')
    .map((p) => p.trim().toUpperCase().replace(/^0+(?=.)/, ''))
    .join('-');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === ',' && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * @returns {Promise<Map<string, {perm: number, uni: number, planoLimite: number, dist: string, catalogado: boolean, obs: string}>>}
 */
export async function loadZoning() {
  const file = await download(ZONING_URL, 'codigo-urbanistico.csv');
  const [header, ...rows] = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const cols = parseCsvLine(header);
  const idx = Object.fromEntries(cols.map((c, i) => [c, i]));
  const zoning = new Map();
  for (const row of rows) {
    if (!row) continue;
    const r = parseCsvLine(row);
    const uni = Math.max(...[1, 2, 3, 4].map((i) => Number(r[idx[`uni_edif_${i}`]]) || 0));
    const planoLimite = Number(r[idx.plano_l]) || 0;
    zoning.set(normSmp(r[idx.smp]), {
      // La relación entre unidad de edificabilidad y plano límite no es uniforme en el dataset:
      // se toma la mayor como altura máxima permitida de la envolvente.
      perm: Math.max(uni, planoLimite),
      uni,
      planoLimite,
      dist: r[idx.dist_1_esp] || '',
      catalogado: r[idx.catalogado] === '1' || r[idx.catalogado] === '2',
      obs: r[idx.plano_l_ob] && r[idx.plano_l_ob] !== '0' ? r[idx.plano_l_ob] : '',
    });
  }
  return zoning;
}

/** Categorías de análisis (el orden se usa en leyendas y resúmenes). */
export const CATEGORIES = ['excede', 'limite', 'rem_media', 'rem_alta', 'catalogado', 'especial', 'sin_dato'];

export function classify(zone, built) {
  if (!zone) return 'sin_dato';
  if (zone.catalogado) return 'catalogado';
  if (!zone.perm) return 'especial';
  const dif = built - zone.perm;
  if (dif > TOLERANCE_M) return 'excede';
  if (dif >= -TOLERANCE_M) return 'limite';
  if (dif > -HIGH_REMAINING_M) return 'rem_media';
  return 'rem_alta';
}

/** Propiedades de análisis compartidas por edificios y parcelas. */
export function analysisProps(zone, built) {
  return {
    hcons: Math.round(built * 10) / 10,
    perm: zone?.perm ?? 0,
    cat: classify(zone, built),
    ...(zone?.dist && { dist: zone.dist }),
  };
}
