import type { Map as MLMap } from 'maplibre-gl';
import { PARCEL_TILES, type AnalysisCategory } from '../config';
import { colorByCategory } from './buildings';

export const PARCELS_SOURCE = 'parcels';
export const ENVELOPE_LAYER = 'envolvente';

const REMAINING: AnalysisCategory[] = ['rem_alta', 'rem_media'];

/**
 * Envolvente permitida sin construir: sobre cada parcela con capacidad remanente se extruye
 * un volumen translúcido desde la altura construida hasta la altura permitida.
 *
 * Una sola capa, sólo desde zoom 14 (de lejos no se distingue y costaba ~4 s de carga), y
 * oculta con `visibility` fuera del análisis de capacidad para que ni se descarguen las parcelas.
 */
export function addEnvelope(map: MLMap) {
  map.addSource(PARCELS_SOURCE, {
    type: 'vector',
    tiles: [PARCEL_TILES],
    minzoom: 14,
    maxzoom: 14,
  });

  // Sin beforeId: queda encima de los edificios.
  map.addLayer({
    id: ENVELOPE_LAYER,
    type: 'fill-extrusion',
    source: PARCELS_SOURCE,
    'source-layer': 'parcels',
    minzoom: 14,
    filter: ['in', ['get', 'cat'], ['literal', REMAINING]],
    layout: { visibility: 'none' },
    paint: {
      'fill-extrusion-color': colorByCategory,
      'fill-extrusion-base': ['get', 'hcons'],
      'fill-extrusion-height': ['get', 'perm'],
      'fill-extrusion-opacity': 0.22,
    },
  });
}

/** Con filtro activo, la envolvente se muestra sólo si el filtro incluye alguna categoría con remanente. */
export function setEnvelopeView(map: MLMap, visible: boolean, focus: Set<AnalysisCategory>) {
  const show = visible && (focus.size === 0 || REMAINING.some((c) => focus.has(c)));
  const value = show ? 'visible' : 'none';
  if (map.getLayoutProperty(ENVELOPE_LAYER, 'visibility') !== value) map.setLayoutProperty(ENVELOPE_LAYER, 'visibility', value);
}

export const visibleEnvelopeLayers = (map: MLMap) =>
  map.getLayer(ENVELOPE_LAYER) && map.getLayoutProperty(ENVELOPE_LAYER, 'visibility') === 'visible' ? [ENVELOPE_LAYER] : [];
