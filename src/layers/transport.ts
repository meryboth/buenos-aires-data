import { GeoJsonLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import { DATA_URL } from '../config';
import { BUILDINGS_ANCHOR } from './buildings';

// Las capas de superficie se dibujan debajo de los edificios.
const UNDER_BUILDINGS = BUILDINGS_ANCHOR;

export type DataLayerId = 'colectivos' | 'ciclovias' | 'barrios';

export const DATA_LAYERS: { id: DataLayerId; label: string; defaultOn: boolean; source: string }[] = [
  { id: 'colectivos', label: 'Recorridos de colectivos', defaultOn: false, source: 'Transporte y Obras Públicas' },
  { id: 'ciclovias', label: 'Ciclovías', defaultOn: false, source: 'Transporte y Obras Públicas' },
  { id: 'barrios', label: 'Límites de barrios', defaultOn: true, source: 'Ministerio de Educación' },
];

// Capas que tapan a los edificios al seleccionar; los barrios (polígonos grandes) van al final.
export const PICK_PRIORITY_LAYERS = ['ciclovias', 'colectivos'];
export const PICK_FALLBACK_LAYERS = ['barrios'];

/** Construye las capas deck.gl activas. */
export function buildDataLayers(active: Set<DataLayerId>): Layer[] {
  const layers: Layer[] = [];

  if (active.has('barrios')) {
    layers.push(
      new GeoJsonLayer({
        id: 'barrios',
        data: DATA_URL('barrios'),
        filled: true,
        stroked: true,
        getFillColor: [255, 255, 255, 0],
        getLineColor: [255, 255, 255, 90],
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        pickable: true,
        beforeId: UNDER_BUILDINGS,
      }),
    );
  }

  if (active.has('colectivos')) {
    layers.push(
      new GeoJsonLayer({
        id: 'colectivos',
        data: DATA_URL('colectivos-recorridos'),
        getLineColor: [235, 104, 52, 70],
        lineWidthUnits: 'pixels',
        getLineWidth: 1.5,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 190, 150, 255],
        beforeId: UNDER_BUILDINGS,
      }),
    );
  }

  if (active.has('ciclovias')) {
    layers.push(
      new GeoJsonLayer({
        id: 'ciclovias',
        data: DATA_URL('ciclovias'),
        getLineColor: [27, 200, 122, 220],
        lineWidthUnits: 'pixels',
        getLineWidth: 2.5,
        pickable: true,
        autoHighlight: true,
        beforeId: UNDER_BUILDINGS,
      }),
    );
  }

  return layers;
}

/** Texto para la ficha de información de un objeto deck.gl. */
export function describeDataFeature(layerId: string, props: Record<string, any>): { title: string; rows: [string, string][] } {
  switch (layerId) {
    case 'colectivos':
      return {
        title: `Colectivo ${props.linea} (${props.recorrido})`,
        rows: [
          ['Sentido', props.sentido],
          ['Desde', props.desde],
          ['Hasta', props.hasta],
        ],
      };
    case 'ciclovias':
      return { title: props.nombre, rows: [['Tipo', props.tipo], ['Barrio', props.barrio]] };
    case 'barrios':
      return { title: props.barrio, rows: [['Comuna', String(props.comuna)]] };
    default:
      return { title: layerId, rows: Object.entries(props).map(([k, v]) => [k, String(v)]) };
  }
}
