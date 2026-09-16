import type { AnalysisSummary, AreaSummary } from '../analysis';
import type { AnalysisCategory } from '../config';
import type { ColorMode } from '../layers/buildings';

export type AnalysisId = 'capacidad' | 'altura' | 'asoleamiento' | 'transporte';

export interface RankingRow {
  barrio: string;
  value: number;
  label: string;
}

export interface Ranking {
  title: string;
  color: string;
  rows: RankingRow[];
}

export interface StatsContext {
  name: string;
  area: AreaSummary;
  summary: AnalysisSummary;
  focus: Set<AnalysisCategory>;
}

/**
 * Un caso de uso de la app. Cada análisis define su pregunta, cómo se pintan
 * los edificios y qué muestra el panel. Los "próximamente" sólo describen.
 */
export interface AnalysisDef {
  id: AnalysisId;
  title: string;
  question: string;
  description: string;
  status: 'disponible' | 'proximamente';
  /** Icono de 24×24 (contenido del <svg>). */
  icon: string;
  diagram?: string;
  colorMode?: ColorMode;
  /** Muestra la envolvente permitida sin construir. */
  envelope?: boolean;
  /** Las categorías del dock/breakdown filtran los edificios. */
  filterable?: boolean;
  stats?: (ctx: StatsContext) => string;
  rankings?: (summary: AnalysisSummary) => Ranking[];
  method?: (summary: AnalysisSummary) => string;
}
