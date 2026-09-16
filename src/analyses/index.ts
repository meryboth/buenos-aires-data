import { altura } from './altura';
import { capacidad } from './capacidad';
import type { AnalysisDef, AnalysisId } from './types';

export type { AnalysisDef, AnalysisId } from './types';

/** Casos de uso de la app, en el orden en que aparecen en el selector. */
export const ANALYSES: AnalysisDef[] = [
  capacidad,
  altura,
  {
    id: 'asoleamiento',
    title: 'Sol y sombra',
    question: '¿Qué calles y plazas pierden sol si se construye todo lo permitido?',
    description: 'Sombras proyectadas en invierno con la ciudad actual y con la envolvente completa.',
    status: 'proximamente',
    icon: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/>',
  },
  {
    id: 'transporte',
    title: 'Densidad y transporte',
    question: '¿Se puede construir más donde hay subte, tren y Metrobus?',
    description: 'Capacidad remanente cruzada con la distancia a las estaciones.',
    status: 'proximamente',
    icon: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l1.5-4M15 21l-1.5-4"/><circle cx="9" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/>',
  },
];

export const DEFAULT_ANALYSIS: AnalysisId = 'capacidad';

export const getAnalysis = (id: AnalysisId) => ANALYSES.find((a) => a.id === id) ?? capacidad;
