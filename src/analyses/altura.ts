import { kpi, stackWithBreakdown } from '../ui/charts';
import { esc, fmtM, fmtPct, pct } from '../ui/dom';
import type { AnalysisDef } from './types';

// Mismos tonos que la rampa del mapa en cada rango (de bajo a alto).
const BIN_COLORS = ['#184f95', '#256abf', '#3987e5', '#6da7ec', '#cde2fb'];
const STOREY_M = 3;

function binLabels(limits: number[]) {
  const storeys = (m: number) => Math.round(m / STOREY_M);
  return limits.map((max, i) => {
    const min = i === 0 ? 0 : limits[i - 1];
    return i === 0 ? `Hasta ${storeys(max)} pisos` : `${storeys(min) + 1} a ${storeys(max)} pisos`;
  }).concat(`Más de ${storeys(limits.at(-1)!)} pisos`);
}

const diagram = `
  <svg class="concept__svg" viewBox="0 0 120 84" role="img" aria-label="Edificios coloreados de oscuro a claro según su altura">
    <line x1="4" y1="78" x2="116" y2="78" stroke="currentColor" stroke-opacity=".25"/>
    <rect x="10" y="64" width="18" height="14" rx="2" fill="#184f95"/>
    <rect x="32" y="52" width="18" height="26" rx="2" fill="#256abf"/>
    <rect x="54" y="36" width="18" height="42" rx="2" fill="#3987e5"/>
    <rect x="76" y="20" width="18" height="58" rx="2" fill="#6da7ec"/>
    <rect x="98" y="6" width="16" height="72" rx="2" fill="#cde2fb"/>
  </svg>`;

export const altura: AnalysisDef = {
  id: 'altura',
  title: 'Altura de la ciudad',
  question: '¿Cómo crece la ciudad en altura?',
  description: 'Cada edificio se pinta según su altura relevada: cuanto más claro, más alto.',
  status: 'disponible',
  icon: '<path d="M4 20h16"/><rect x="5" y="13" width="4" height="7" rx=".5"/><rect x="10" y="8" width="4" height="12" rx=".5"/><rect x="15" y="4" width="4" height="16" rx=".5"/>',
  diagram,
  colorMode: 'altura',

  stats({ area, summary }) {
    const h = area.alturas;
    const labels = binLabels(summary.metodologia.rangosAlturaM);
    return `
      <div class="hero-kpi">
        <strong style="color:#9ec5f4">${fmtM(h.mediaM)}</strong>
        <span>altura media de lo construido (≈ ${Math.round(h.mediaM / STOREY_M)} pisos)</span>
      </div>
      <div class="kpis">
        ${kpi(fmtPct(pct(h.altas, h.conEdificio)), `parcelas con ${Math.round(summary.metodologia.alturaEdificioAltoM / STOREY_M)} pisos o más`)}
        ${kpi(fmtPct(pct(h.conEdificio, area.parcelas)), 'parcelas con edificación relevada')}
      </div>
      ${stackWithBreakdown(
        h.rangos.map((value, i) => ({ id: String(i), label: labels[i], color: BIN_COLORS[i], value })),
        h.conEdificio,
        'parcelas edificadas',
      )}`;
  },

  rankings(summary) {
    const withBuildings = summary.barrios.filter((b) => b.alturas.conEdificio >= 500);
    const tallPct = (b: (typeof withBuildings)[number]) => pct(b.alturas.altas, b.alturas.conEdificio);
    return [
      {
        title: 'Barrios más altos (altura media)',
        color: '#6da7ec',
        rows: [...withBuildings]
          .sort((a, b) => b.alturas.mediaM - a.alturas.mediaM)
          .slice(0, 5)
          .map((b) => ({ barrio: b.barrio, value: b.alturas.mediaM, label: fmtM(b.alturas.mediaM) })),
      },
      {
        title: 'Más parcelas con 10 pisos o más',
        color: '#cde2fb',
        rows: [...withBuildings]
          .sort((a, b) => tallPct(b) - tallPct(a))
          .slice(0, 5)
          .map((b) => ({ barrio: b.barrio, value: tallPct(b), label: fmtPct(tallPct(b)) })),
      },
    ];
  },

  method({ metodologia: m }) {
    return `
      <dl class="method">
        <dt>Altura</dt><dd>${esc(m.alturaConstruida)}</dd>
        <dt>Altura media</dt><dd>${esc(m.alturaMedia)}</dd>
        <dt>Pisos</dt><dd>Estimados a razón de ${m.alturaPorPiso} m por piso.</dd>
        <dt>Datos dudosos</dt><dd>Alturas mayores a 300 m se consideran errores de relevamiento y se acotan.</dd>
      </dl>`;
  },
};
