import { ANALYSIS_CATEGORIES, type AnalysisCategory } from './config';

export interface CategoryCounts extends Record<AnalysisCategory, number> {}

export interface AreaSummary {
  parcelas: number;
  categorias: CategoryCounts;
  volumenRemanenteM3: number;
  alturas: {
    conEdificio: number;
    altas: number;
    /** Parcelas por rango de altura construida (ver metodologia.rangosAlturaM). */
    rangos: number[];
    mediaM: number;
  };
}

export interface AnalysisSummary {
  generatedAt: string;
  metodologia: {
    alturaPermitida: string;
    alturaConstruida: string;
    toleranciaM: number;
    volumenRemanente: string;
    alturaPorPiso: number;
    rangosAlturaM: number[];
    alturaEdificioAltoM: number;
    alturaMedia: string;
  };
  ciudad: AreaSummary;
  barrios: (AreaSummary & { barrio: string })[];
}

export async function loadSummary(): Promise<AnalysisSummary> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/resumen-barrios.json`);
  if (!res.ok) throw new Error(`No se pudo cargar el resumen (${res.status})`);
  return res.json();
}

/** Para comparar nombres de barrio entre datasets ("Nuñez" / "NUÑEZ" / "Nunez"). */
export const normalizeName = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** "2-34A-1" → "002-034A-001" (formato de catastro). */
export const formatSmp = (smp: string) =>
  String(smp ?? '')
    .split('-')
    .map((part) => part.replace(/^\d+/, (d) => d.padStart(3, '0')))
    .join('-');

const categoryOf = (p: Record<string, any>) => ANALYSIS_CATEGORIES.find((c) => c.id === p.cat);

export function analysisBadge(p: Record<string, any>) {
  const cat = categoryOf(p);
  return cat && { label: cat.label, hint: cat.hint, color: cat.color };
}

export function analysisGauge(p: Record<string, any>) {
  const cat = categoryOf(p);
  return { built: Number(p.hcons) || 0, perm: Number(p.perm) || 0, color: cat?.color ?? '#8f8d87' };
}

/** Datos normativos adicionales de una parcela (props de los tiles). */
export function analysisRows(p: Record<string, any>): [string, string][] {
  const rows: [string, string][] = [];
  if (p.dist) rows.push(['Distrito especial', p.dist]);
  if (p.obs) rows.push(['Observación', p.obs]);
  return rows;
}
