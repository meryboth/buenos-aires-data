import type { Map as MLMap, PointLike, MapGeoJSONFeature, ExpressionSpecification } from 'maplibre-gl';
import { DATA_URL } from '../config';
import { BUILDINGS_ANCHOR } from './buildings';

export type DataLayerId = 'colectivos' | 'ciclovias' | 'barrios';

export const DATA_LAYERS: { id: DataLayerId; label: string; defaultOn: boolean; source: string }[] = [
  { id: 'colectivos', label: 'Recorridos de colectivos', defaultOn: false, source: 'Transporte y Obras Públicas' },
  { id: 'ciclovias', label: 'Ciclovías', defaultOn: false, source: 'Transporte y Obras Públicas' },
  { id: 'barrios', label: 'Límites de barrios', defaultOn: true, source: 'Ministerio de Educación' },
];

// Capas de líneas que se seleccionan antes que los edificios; los barrios (polígonos grandes) van al final.
export const PICK_PRIORITY_LAYERS = ['ciclovias', 'colectivos'];
export const PICK_FALLBACK_LAYERS = ['barrios-area'];

const BARRIO_FOCUS_LAYER = 'barrio-foco';

const onHover = (base: string | number, hover: string | number) =>
  ['case', ['boolean', ['feature-state', 'hover'], false], hover, base] as ExpressionSpecification;

/**
 * Crea la fuente y las capas de un conjunto de datos la primera vez que se activa
 * (los recorridos de colectivos pesan ~9 MB: no se descargan si no se usan).
 * Todas son de superficie y quedan debajo de los edificios.
 */
function ensureDataLayer(map: MLMap, id: DataLayerId) {
  if (map.getSource(id)) return;
  const file = id === 'colectivos' ? 'colectivos-recorridos' : id;
  map.addSource(id, { type: 'geojson', data: DATA_URL(file), generateId: true });

  if (id === 'barrios') {
    // Relleno invisible: sólo sirve para identificar el barrio al hacer clic.
    map.addLayer(
      { id: 'barrios-area', type: 'fill', source: id, paint: { 'fill-color': '#ffffff', 'fill-opacity': 0 } },
      BUILDINGS_ANCHOR,
    );
    map.addLayer(
      { id: 'barrios', type: 'line', source: id, paint: { 'line-color': 'rgba(255, 255, 255, 0.35)', 'line-width': 1.5 } },
      BUILDINGS_ANCHOR,
    );
    map.addLayer(
      {
        id: BARRIO_FOCUS_LAYER,
        type: 'line',
        source: id,
        filter: ['==', ['get', 'barrio'], ''],
        layout: { 'line-join': 'round', visibility: 'none' },
        paint: { 'line-color': 'rgba(255, 255, 255, 0.9)', 'line-width': 3 },
      },
      BUILDINGS_ANCHOR,
    );
    return;
  }

  const style =
    id === 'colectivos'
      ? { color: 'rgba(235, 104, 52, 0.28)', hover: '#ffbe96', width: 1.5 }
      : { color: 'rgba(27, 200, 122, 0.86)', hover: '#8ff0c4', width: 2.5 };
  map.addLayer(
    {
      id,
      type: 'line',
      source: id,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': onHover(style.color, style.hover),
        'line-width': onHover(style.width, style.width + 1.5),
      },
    },
    BUILDINGS_ANCHOR,
  );
}

const LAYERS_OF: Record<DataLayerId, string[]> = {
  barrios: ['barrios-area', 'barrios'],
  colectivos: ['colectivos'],
  ciclovias: ['ciclovias'],
};

export function setDataLayers(map: MLMap, active: Set<DataLayerId>) {
  for (const { id } of DATA_LAYERS) {
    if (active.has(id)) ensureDataLayer(map, id);
    const value = active.has(id) ? 'visible' : 'none';
    for (const layer of LAYERS_OF[id]) {
      if (map.getLayer(layer) && map.getLayoutProperty(layer, 'visibility') !== value) {
        map.setLayoutProperty(layer, 'visibility', value);
      }
    }
  }
}

/** Resalta el contorno de un barrio (se ve aunque la capa de límites esté apagada). */
export function setBarrioFocus(map: MLMap, barrio: string | null) {
  ensureDataLayer(map, 'barrios');
  map.setFilter(BARRIO_FOCUS_LAYER, ['==', ['get', 'barrio'], barrio ?? '']);
  map.setLayoutProperty(BARRIO_FOCUS_LAYER, 'visibility', barrio ? 'visible' : 'none');
}

/** Objeto de datos bajo el puntero, con unos píxeles de tolerancia para las líneas finas. */
export function dataFeatureAt(
  map: MLMap,
  point: { x: number; y: number },
  layerIds: string[],
): MapGeoJSONFeature | undefined {
  const layers = layerIds.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none');
  if (!layers.length) return undefined;
  const box: [PointLike, PointLike] = [
    [point.x - 4, point.y - 4],
    [point.x + 4, point.y + 4],
  ];
  return map.queryRenderedFeatures(box, { layers })[0];
}

/** Texto para la ficha de información de un objeto de datos. */
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
    case 'barrios-area':
      return { title: props.barrio, rows: [['Comuna', String(props.comuna)]] };
    default:
      return { title: layerId, rows: Object.entries(props).map(([k, v]) => [k, String(v)]) };
  }
}
