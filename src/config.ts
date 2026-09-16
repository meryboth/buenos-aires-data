export const INITIAL_VIEW = {
  center: [-58.3816, -34.6037] as [number, number], // Obelisco
  zoom: 14.5,
  pitch: 60,
  bearing: -20,
};

export const CABA_BOUNDS: [[number, number], [number, number]] = [
  [-58.62, -34.78],
  [-58.2, -34.48],
];

// Estilo base gratuito de CARTO (sin API key). Requiere atribución, incluida en el estilo.
export const BASEMAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';

// Cada capa es un archivo PMTiles; el protocolo pmtiles:// (registrado en main.ts) lee cada tile
// con un pedido por rango, así la app funciona en cualquier hosting estático.
const tilesUrl = (layer: string) =>
  `pmtiles://${location.origin}${import.meta.env.BASE_URL}tiles/${layer}.pmtiles/{z}/{x}/{y}`;
export const BUILDING_TILES = tilesUrl('buildings');
export const PARCEL_TILES = tilesUrl('parcels');

// Rampa secuencial azul (un tono). Sobre fondo oscuro lo bajo se funde y lo alto resalta.
export const HEIGHT_RAMP: [number, string][] = [
  [0, '#0d366b'],
  [6, '#184f95'],
  [12, '#256abf'],
  [24, '#3987e5'],
  [45, '#6da7ec'],
  [80, '#9ec5f4'],
  [150, '#cde2fb'],
];

// Análisis "construido vs. permitido". Escala divergente: azul = capacidad remanente,
// gris = en el límite, rojo = supera la norma. Validada para visión de colores atípica
// sobre el fondo oscuro; la leyenda siempre acompaña con texto.
export type AnalysisCategory = 'rem_alta' | 'rem_media' | 'limite' | 'excede' | 'catalogado' | 'especial' | 'sin_dato';

export const ANALYSIS_CATEGORIES: { id: AnalysisCategory; label: string; short: string; hint: string; color: string }[] = [
  { id: 'rem_alta', short: '+4 pisos', label: 'Puede crecer +4 pisos', hint: 'Lo construido está más de 12 m por debajo de lo permitido', color: '#3987e5' },
  { id: 'rem_media', short: '1–4 pisos', label: 'Puede crecer 1 a 4 pisos', hint: 'Faltan entre 3 y 12 m para llegar a lo permitido', color: '#9ec5f4' },
  { id: 'limite', short: 'Al límite', label: 'Ya usa lo permitido', hint: 'Construido y permitido coinciden (±3 m)', color: '#8f8d87' },
  { id: 'excede', short: 'Sobre el código', label: 'Más alto que el código actual', hint: 'Suele ser un edificio anterior a la norma vigente, no una infracción', color: '#e66767' },
  { id: 'catalogado', short: 'Patrimonio', label: 'Patrimonio protegido', hint: 'Edificio catalogado: no se puede reemplazar libremente', color: '#eed27a' },
  { id: 'especial', short: 'Especiales', label: 'Reglas especiales', hint: 'Urbanizaciones, áreas históricas y otros distritos sin altura única', color: '#4a4945' },
  { id: 'sin_dato', short: 'Sin dato', label: 'Sin dato', hint: 'La parcela no figura en el Código Urbanístico publicado', color: '#2e2e2c' },
];

export const HIGHLIGHT = { hover: '#ffffff', selected: '#1baf7a' };

// Color de lo que queda fuera del foco cuando se filtran categorías desde la leyenda.
export const DIMMED = '#1c1c1b';

export const DATA_URL = (name: string) => `${import.meta.env.BASE_URL}data/${name}.geojson`;
