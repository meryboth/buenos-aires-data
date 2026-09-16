import maplibregl, { type MapGeoJSONFeature } from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { GeoJsonLayer } from '@deck.gl/layers';
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';

import { ANALYSES, DEFAULT_ANALYSIS, getAnalysis, type AnalysisId } from './analyses';
import {
  analysisBadge,
  analysisGauge,
  analysisRows,
  formatSmp,
  loadSummary,
  normalizeName,
  type AnalysisSummary,
} from './analysis';
import { BASEMAP_STYLE, CABA_BOUNDS, DATA_URL, INITIAL_VIEW, type AnalysisCategory } from './config';
import {
  BUILDINGS_ANCHOR,
  activeBuildingLayers,
  addBuildings,
  buildingSources,
  setBuildingsView,
  setBuildingsVisible,
} from './layers/buildings';
import { addEnvelope, setEnvelopeView, visibleEnvelopeLayers } from './layers/envelope';
import {
  DATA_LAYERS,
  PICK_FALLBACK_LAYERS,
  PICK_PRIORITY_LAYERS,
  buildDataLayers,
  describeDataFeature,
  type DataLayerId,
} from './layers/transport';
import { renderDock } from './ui/dock';
import { renderInfo } from './ui/info';
import { renderAnalysis, renderPanel, renderStats, renderSummaryError, setBarrioSelect, type AppState } from './ui/panel';
import { createMapStatus } from './ui/status';
import { renderToolbar } from './ui/toolbar';

// El análisis activo viaja en el hash (#capacidad, #altura) para poder compartir el enlace.
const fromHash = location.hash.slice(1) as AnalysisId;
const state: AppState = {
  analysis: ANALYSES.some((a) => a.id === fromHash && a.status === 'disponible') ? fromHash : DEFAULT_ANALYSIS,
  active: new Set(['edificios', 'envolvente', ...DATA_LAYERS.filter((l) => l.defaultOn).map((l) => l.id)]),
  focus: new Set(),
  barrio: null,
};

const CITY_VIEW = { center: [-58.445, -34.615] as [number, number], zoom: 12.1, pitch: 45, bearing: -15 };
const params = new URLSearchParams(location.search);
const withIntro = !params.has('nointro') && !matchMedia('(prefers-reduced-motion: reduce)').matches;

// MapLibre 5 procesa los tiles con un solo worker por defecto. Con 2 la carga inicial baja
// ~20 % (npm run bench); más de 4 no mejora. ?workers=N permite probar otros valores.
maplibregl.setWorkerCount(
  Number(params.get('workers')) || Math.min(4, Math.max(2, Math.floor((navigator.hardwareConcurrency || 4) / 4))),
);
// El antialiasing (MSAA) cuesta ~25 % de FPS en GPUs integradas. En pantallas de alta densidad
// casi no se nota, así que sólo se activa en las comunes. ?aa=0|1 lo fuerza.
const antialias = params.has('aa') ? params.get('aa') !== '0' : devicePixelRatio < 1.5;

// Sin WebGL no hay mapa 3D: se avisa en la pantalla de carga en vez de quedar cargando.
if (!document.createElement('canvas').getContext('webgl2')) {
  const loader = document.getElementById('loader')!;
  loader.querySelector('.loader__bar')?.remove();
  loader.querySelector('p')!.outerHTML =
    '<p class="loader__error">Tu navegador no soporta WebGL 2, necesario para mostrar la ciudad en 3D. Probá con una versión actual de Chrome, Edge, Firefox o Safari.</p>';
  throw new Error('WebGL 2 no disponible');
}

const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAP_STYLE,
  ...(withIntro ? { ...CITY_VIEW, pitch: 20, bearing: -60 } : INITIAL_VIEW),
  maxBounds: CABA_BOUNDS,
  maxPitch: 80,
  attributionControl: { compact: true },
  canvasContextAttributes: { antialias },
});
map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
map.addControl(overlay);
// Acceso para pruebas automáticas (smoke/bench): siempre en desarrollo, con ?debug en producción.
if (import.meta.env.DEV || params.has('debug')) Object.assign(window, { map, overlay });

const $ = (id: string) => document.getElementById(id)!;
const panelEl = $('panel');
const infoEl = $('info');
const dockEl = $('dock');
let summary: AnalysisSummary | undefined;
const status = createMapStatus($('status'), map);

// --- Barrios: extensión para centrar el mapa y contorno del barrio elegido ---
const barrioFeatures = new Map<string, GeoJSON.Feature>();
const barrioBounds = (f: GeoJSON.Feature) => {
  const b = new maplibregl.LngLatBounds();
  const walk = (c: any): void => (typeof c[0] === 'number' ? void b.extend(c as [number, number]) : c.forEach(walk));
  walk((f.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon).coordinates);
  return b;
};
fetch(DATA_URL('barrios'))
  .then((r) => r.json())
  .then((fc: GeoJSON.FeatureCollection) => {
    for (const f of fc.features) barrioFeatures.set(normalizeName(String(f.properties?.barrio ?? '')), f);
  })
  .catch((err) => console.warn('No se pudieron cargar los barrios', err));

// --- Capas ---
const dataLayerIds = new Set<string>(DATA_LAYERS.map((l) => l.id));
function refreshDataLayers() {
  const selected = state.barrio ? barrioFeatures.get(normalizeName(state.barrio)) : undefined;
  overlay.setProps({
    layers: [
      ...buildDataLayers(new Set([...state.active].filter((id) => dataLayerIds.has(id)) as DataLayerId[])),
      selected
        ? new GeoJsonLayer({
          id: 'barrio-foco',
          data: [selected],
          filled: false,
          getLineColor: [255, 255, 255, 230],
          lineWidthUnits: 'pixels',
          getLineWidth: 3,
          beforeId: BUILDINGS_ANCHOR,
        })
        : null,
    ],
  });
}
const current = () => getAnalysis(state.analysis);
const colorMode = () => current().colorMode ?? 'altura';
const refreshEnvelope = () =>
  setEnvelopeView(map, !!current().envelope && state.active.has('envolvente') && state.active.has('edificios'), state.focus);

let mapReady = false;
function refreshAnalysisView() {
  const analysis = current();
  if (mapReady) {
    setBuildingsView(map, colorMode(), state.focus);
    refreshEnvelope();
  }
  renderDock(dockEl, analysis, state.focus, setFocus);
  if (summary) renderStats(panelEl, analysis, summary, state);
}

function selectAnalysis(id: AnalysisId) {
  if (id === state.analysis) return;
  state.analysis = id;
  state.focus.clear();
  const { title } = current();
  status.applying(`Aplicando «${title}»…`, `${title}: listo`);
  history.replaceState(null, '', `#${id}`);
  renderAnalysis(panelEl, current(), summary, state);
  refreshAnalysisView();
}

function setFocus(cat: AnalysisCategory | null) {
  if (cat === null) state.focus.clear();
  else if (state.focus.has(cat)) state.focus.delete(cat);
  else state.focus.add(cat);
  // Mostrar u ocultar el filtro ya preparado es instantáneo; filtrar otras categorías requiere procesar tiles.
  status.applying('Filtrando edificios…', state.focus.size ? 'Filtro aplicado' : 'Todas las categorías', { quiet: true });
  refreshAnalysisView();
}

function selectBarrio(barrio: string | null, fly = true) {
  state.barrio = barrio;
  setBarrioSelect(panelEl, barrio);
  if (summary) renderStats(panelEl, current(), summary, state);
  refreshDataLayers();
  stopOrbit();
  if (!fly) return;
  const feature = barrio ? barrioFeatures.get(normalizeName(barrio)) : undefined;
  if (feature) map.fitBounds(barrioBounds(feature), { padding: { top: 40, bottom: 110, left: 380, right: 40 }, pitch: 55, bearing: map.getBearing(), duration: 1800 });
  else map.flyTo({ ...CITY_VIEW, duration: 1800 });
}

map.on('load', () => {
  addBuildings(map);
  addEnvelope(map);
  mapReady = true;
  refreshAnalysisView();
  refreshDataLayers();

  // La pantalla de carga se va con los primeros edificios; el resto se completa con el aviso
  // "Cargando edificios…" en vez de bloquear hasta que termine todo.
  const onData = (e: maplibregl.MapSourceDataEvent) => {
    if (!e.tile || !buildingSources(map).includes(e.sourceId)) return;
    map.off('sourcedata', onData);
    performance.mark('buildings-visible');
    const loader = $('loader');
    loader.classList.add('is-hidden');
    setTimeout(() => loader.remove(), 600);
    if (withIntro) map.flyTo({ ...INITIAL_VIEW, duration: 5000, curve: 1.2, essential: true });
    // Marca para pruebas automáticas: intro terminada y tiles cargados.
    const whenSettled = () => {
      if (map.loaded() && !map.isMoving()) document.body.dataset.ready = '1';
      else setTimeout(whenSettled, 100);
    };
    whenSettled();
  };
  map.on('sourcedata', onData);
});

// --- Interfaz ---
loadSummary()
  .then((s) => {
    summary = s;
    const names = s.barrios.map((b) => b.barrio).sort((a, b) => a.localeCompare(b, 'es'));
    mountPanel(names);
    renderAnalysis(panelEl, current(), s, state);
  })
  .catch((err) => {
    console.error(err);
    mountPanel([]);
    renderAnalysis(panelEl, current(), undefined, state);
    renderSummaryError(panelEl);
  });

function mountPanel(barrios: string[]) {
  renderPanel(panelEl, state, barrios, {
    onToggle(id, on) {
      if (on) state.active.add(id);
      else state.active.delete(id);
      if (id === 'edificios') {
        setBuildingsVisible(map, on);
        refreshEnvelope();
      } else if (id === 'envolvente') refreshEnvelope();
      else refreshDataLayers();
    },
    onAnalysis: selectAnalysis,
    onBarrio: (barrio) => selectBarrio(barrio),
    onFocus: setFocus,
  });
}
renderDock(dockEl, current(), state.focus, setFocus);

// --- Herramientas de cámara ---
let orbitFrame = 0;
const spin = () => {
  map.setBearing(map.getBearing() + 0.06);
  orbitFrame = requestAnimationFrame(spin);
};
function stopOrbit() {
  if (!orbitFrame) return;
  cancelAnimationFrame(orbitFrame);
  orbitFrame = 0;
  toolbar.setOrbit(false);
}
const toolbar = renderToolbar($('toolbar'), {
  onToggle3D() {
    const to3D = map.getPitch() < 5;
    map.easeTo({ pitch: to3D ? 60 : 0, duration: 900 });
    return to3D;
  },
  onToggleOrbit() {
    if (orbitFrame) {
      stopOrbit();
      return false;
    }
    orbitFrame = requestAnimationFrame(spin);
    return true;
  },
  onReset() {
    selectBarrio(null, false);
    map.flyTo({ ...INITIAL_VIEW, duration: 1800 });
  },
});
map.on('pitchend', () => toolbar.set3D(map.getPitch() >= 5));
for (const ev of ['mousedown', 'touchstart', 'wheel'] as const) map.on(ev, stopOrbit);

// --- Hover y selección de edificios (feature-state) ---
let hoveredId: string | number | undefined;
let selectedId: string | number | undefined;

// El resaltado se aplica en todas las fuentes de edificios creadas (una por vista).
const setFeatureState = (id: string | number | undefined, s: Record<string, boolean>) => {
  if (id === undefined) return;
  for (const source of buildingSources(map)) map.setFeatureState({ source, sourceLayer: 'buildings', id }, s);
};

const renderedAt = (point: maplibregl.PointLike, layers: string[]): MapGeoJSONFeature | undefined => {
  const queryable = layers.filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none');
  return queryable.length ? map.queryRenderedFeatures(point, { layers: queryable })[0] : undefined;
};
const buildingAt = (point: maplibregl.PointLike) => renderedAt(point, activeBuildingLayers(map));

// Orden de selección: líneas (ciclovías, colectivos) > edificios > envolvente > barrios.
// El pick de deck.gl lee píxeles de la GPU: sólo se hace si hay capas de líneas activas.
const pickDeck = (point: maplibregl.Point, layerIds: string[]) => {
  const active = layerIds.filter((id) => state.active.has(id as DataLayerId));
  return active.length ? overlay.pickObject({ x: point.x, y: point.y, radius: 4, layerIds: active }) : null;
};

// Hover: como máximo una consulta por cuadro, y ninguna mientras la cámara se mueve.
let hoverPoint: maplibregl.Point | null = null;
let hoverFrame = 0;
function updateHover() {
  hoverFrame = 0;
  if (!hoverPoint || map.isMoving()) return;
  const deckHit = pickDeck(hoverPoint, PICK_PRIORITY_LAYERS);
  const building = deckHit ? undefined : buildingAt(hoverPoint);
  if (building?.id !== hoveredId) {
    setFeatureState(hoveredId, { hover: false });
    hoveredId = building?.id;
    setFeatureState(hoveredId, { hover: true });
  }
  map.getCanvas().style.cursor = deckHit || building ? 'pointer' : '';
}
map.on('mousemove', (e) => {
  hoverPoint = e.point;
  if (!hoverFrame) hoverFrame = requestAnimationFrame(updateHover);
});
map.getCanvas().addEventListener('mouseleave', () => {
  hoverPoint = null;
  setFeatureState(hoveredId, { hover: false });
  hoveredId = undefined;
});

map.on('click', (e) => {
  setFeatureState(selectedId, { selected: false });
  selectedId = undefined;

  const deckHit = pickDeck(e.point, PICK_PRIORITY_LAYERS);
  if (deckHit?.object && deckHit.layer) {
    return renderInfo(infoEl, describeDataFeature(deckHit.layer.id, deckHit.object.properties ?? {}));
  }

  const building = buildingAt(e.point);
  if (building) {
    selectedId = building.id;
    setFeatureState(selectedId, { selected: true });
    const p = building.properties;
    return renderInfo(infoEl, {
      eyebrow: 'Parcela',
      title: formatSmp(p.smp),
      badge: analysisBadge(p),
      gauge: analysisGauge(p),
      rows: [
        ['Volumen elegido', `${Number(p.altura).toFixed(1)} m${p.sospechosa ? ' (acotado: dato fuera de rango)' : ''}`],
        ...analysisRows(p),
      ],
    });
  }

  const parcel = renderedAt(e.point, visibleEnvelopeLayers(map));
  if (parcel) {
    const p = parcel.properties;
    return renderInfo(infoEl, {
      eyebrow: `Parcela · ${p.barrio}`,
      title: formatSmp(p.smp),
      badge: analysisBadge(p),
      gauge: analysisGauge(p),
      rows: [['Superficie', `${Number(p.area).toLocaleString('es-AR')} m²`], ...analysisRows(p)],
    });
  }

  const area = pickDeck(e.point, PICK_FALLBACK_LAYERS);
  renderInfo(infoEl, area?.object && area.layer ? describeDataFeature(area.layer.id, area.object.properties ?? {}) : null);
});
