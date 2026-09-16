import type { Map as MLMap, ExpressionSpecification, FilterSpecification } from 'maplibre-gl';
import { ANALYSIS_CATEGORIES, BUILDING_TILES, HEIGHT_RAMP, HIGHLIGHT, type AnalysisCategory } from '../config';

export type ColorMode = 'altura' | 'normativa';

// Rendimiento (medido con npm run bench):
// - En MapLibre, agregar una capa, cambiar su filtro o un color que depende de los datos
//   reprocesa TODA la fuente, con todas sus capas. Por eso cada vista usa su propia fuente
//   (mismos tiles, que el navegador ya tiene en caché): cambiar una no reprocesa las otras.
// - Cada vista se crea recién cuando se usa por primera vez; después se alterna por opacidad,
//   que es instantáneo (las capas con opacidad 0 no se dibujan).
// - Opacidad exactamente 1 → MapLibre dibuja las extrusiones en una sola pasada.
type ViewId = 'altura' | 'normativa' | 'foco';

const VIEWS: Record<ViewId, { source: string; layer: string }> = {
  normativa: { source: 'buildings-normativa', layer: 'buildings-normativa' },
  altura: { source: 'buildings-altura', layer: 'buildings-altura' },
  // Sólo las categorías filtradas, sobre la vista normativa atenuada.
  foco: { source: 'buildings-foco', layer: 'buildings-foco' },
};

/** Capa vacía que marca el lugar de los edificios en el orden de dibujo (para intercalar otras). */
export const BUILDINGS_ANCHOR = 'buildings-anchor';
const BUILDINGS_TOP = 'buildings-top';

const OPACITY = { on: 1, ghost: 0.12, off: 0 };

const withHighlight = (base: ExpressionSpecification): ExpressionSpecification => [
  'case',
  ['boolean', ['feature-state', 'selected'], false],
  HIGHLIGHT.selected,
  ['boolean', ['feature-state', 'hover'], false],
  HIGHLIGHT.hover,
  base,
];

export const colorByCategory = [
  'match',
  ['get', 'cat'],
  ...ANALYSIS_CATEGORIES.flatMap((c) => [c.id, c.color]),
  '#2e2e2c',
] as unknown as ExpressionSpecification;

const colorByHeight = ['interpolate', ['linear'], ['get', 'altura'], ...HEIGHT_RAMP.flat()] as ExpressionSpecification;

const focusFilter = (focus: Set<AnalysisCategory>) =>
  ['in', ['get', 'cat'], ['literal', [...focus].sort()]] as unknown as FilterSpecification;

export function addBuildings(map: MLMap) {
  // Marcadores de orden: capas sin datos y ocultas, no cuestan nada.
  map.addLayer({ id: BUILDINGS_ANCHOR, type: 'background', layout: { visibility: 'none' } });
  map.addLayer({ id: BUILDINGS_TOP, type: 'background', layout: { visibility: 'none' } });
}

function ensureView(map: MLMap, view: ViewId, focus: Set<AnalysisCategory>) {
  const { source, layer } = VIEWS[view];
  if (map.getLayer(layer)) return false;
  map.addSource(source, {
    type: 'vector',
    tiles: [BUILDING_TILES],
    minzoom: 12,
    maxzoom: 14, // por encima se sobre-amplían los tiles z14
    attribution: 'Tejido urbano y Código Urbanístico © <a href="https://data.buenosaires.gob.ar">BA Data</a>',
  });
  map.addLayer(
    {
      id: layer,
      type: 'fill-extrusion',
      source,
      'source-layer': 'buildings',
      ...(view === 'foco' && { filter: focusFilter(focus) }),
      paint: {
        'fill-extrusion-color': withHighlight(view === 'altura' ? colorByHeight : colorByCategory),
        'fill-extrusion-height': ['get', 'altura'],
        'fill-extrusion-opacity': OPACITY.off,
        'fill-extrusion-opacity-transition': { duration: 0 },
        'fill-extrusion-vertical-gradient': true,
      },
    },
    BUILDINGS_TOP,
  );
  return true;
}

const setOpacity = (map: MLMap, view: ViewId, value: number) => {
  const { layer } = VIEWS[view];
  if (map.getLayer(layer)) map.setPaintProperty(layer, 'fill-extrusion-opacity', value);
};

/**
 * Muestra la vista pedida. Devuelve true si hubo que procesar tiles (tarda); false si fue
 * sólo un cambio de opacidad (instantáneo).
 */
export function setBuildingsView(map: MLMap, mode: ColorMode, focus: Set<AnalysisCategory>) {
  if (mode === 'altura') {
    const heavy = ensureView(map, 'altura', focus);
    setOpacity(map, 'altura', OPACITY.on);
    setOpacity(map, 'normativa', OPACITY.off);
    setOpacity(map, 'foco', OPACITY.off);
    return heavy;
  }

  let heavy = ensureView(map, 'normativa', focus);
  setOpacity(map, 'altura', OPACITY.off);
  if (focus.size === 0) {
    setOpacity(map, 'normativa', OPACITY.on);
    setOpacity(map, 'foco', OPACITY.off);
    return heavy;
  }
  if (ensureView(map, 'foco', focus)) heavy = true;
  else {
    const next = focusFilter(focus);
    if (JSON.stringify(map.getFilter(VIEWS.foco.layer)) !== JSON.stringify(next)) {
      map.setFilter(VIEWS.foco.layer, next);
      heavy = true;
    }
  }
  setOpacity(map, 'normativa', OPACITY.ghost);
  setOpacity(map, 'foco', OPACITY.on);
  return heavy;
}

/** Capas que se ven con opacidad plena (para clic y hover). */
export function activeBuildingLayers(map: MLMap) {
  return Object.values(VIEWS)
    .map((v) => v.layer)
    .filter((id) => map.getLayer(id) && map.getPaintProperty(id, 'fill-extrusion-opacity') === OPACITY.on);
}

/** Fuentes creadas (el estado de hover/selección se aplica en todas). */
export function buildingSources(map: MLMap) {
  return Object.values(VIEWS)
    .map((v) => v.source)
    .filter((id) => map.getSource(id));
}

export function setBuildingsVisible(map: MLMap, visible: boolean) {
  for (const { layer } of Object.values(VIEWS)) {
    if (map.getLayer(layer)) map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
  }
}
