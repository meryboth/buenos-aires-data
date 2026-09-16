import { ANALYSIS_CATEGORIES } from '../config';
import { kpi, stackWithBreakdown } from '../ui/charts';
import { esc, fmtInt, fmtPct, pct } from '../ui/dom';
import type { AnalysisDef } from './types';

const color = (id: string) => ANALYSIS_CATEGORIES.find((c) => c.id === id)!.color;

// Un edificio construido y, en punteado, la altura que permite el código.
const diagram = `
  <svg class="concept__svg" viewBox="0 0 120 84" role="img" aria-label="Un edificio más bajo que la altura que permite el código">
    <line x1="4" y1="78" x2="116" y2="78" stroke="currentColor" stroke-opacity=".25"/>
    <rect x="18" y="12" width="34" height="66" rx="2" fill="#9ec5f4" fill-opacity=".14" stroke="#9ec5f4" stroke-dasharray="3 3"/>
    <rect x="18" y="48" width="34" height="30" rx="2" fill="#3987e5"/>
    <line x1="58" y1="12" x2="64" y2="12" stroke="currentColor" stroke-opacity=".5"/>
    <line x1="58" y1="48" x2="64" y2="48" stroke="currentColor" stroke-opacity=".5"/>
    <path d="M61 16v28M58.5 19 61 16l2.5 3M58.5 41 61 44l2.5-3" stroke="#9ec5f4" stroke-width="1.2" fill="none"/>
    <text x="68" y="15" class="concept__label">permitido</text>
    <text x="68" y="33" class="concept__label concept__label--accent">puede crecer</text>
    <text x="68" y="51" class="concept__label">construido</text>
  </svg>`;

export const capacidad: AnalysisDef = {
  id: 'capacidad',
  title: 'Capacidad constructiva',
  question: '¿Cuánto se puede construir todavía?',
  description: 'Comparamos la altura de cada edificio con la máxima que permite el Código Urbanístico en su parcela.',
  status: 'disponible',
  icon: '<rect x="4" y="11" width="6" height="9" rx="1"/><rect x="4" y="4" width="6" height="16" rx="1" stroke-dasharray="2 2"/><rect x="14" y="7" width="6" height="13" rx="1"/>',
  diagram,
  colorMode: 'normativa',
  envelope: true,
  filterable: true,

  stats({ area, focus }) {
    const c = area.categorias;
    const total = area.parcelas;
    return `
      <div class="hero-kpi">
        <strong style="color:${color('rem_media')}">${fmtPct(pct(c.rem_media + c.rem_alta, total))}</strong>
        <span>de las parcelas todavía puede crecer en altura</span>
      </div>
      <div class="kpis">
        ${kpi(fmtPct(pct(c.excede, total)), 'más altas que el código actual')}
        ${kpi(`${fmtInt(area.volumenRemanenteM3 / 1e6)} M m³`, 'volumen teórico sin construir')}
      </div>
      ${stackWithBreakdown(
        ANALYSIS_CATEGORIES.map((cat) => ({
          id: cat.id,
          label: cat.label,
          hint: cat.hint,
          color: cat.color,
          value: c[cat.id],
          dim: focus.size > 0 && !focus.has(cat.id),
          pressed: focus.has(cat.id),
        })),
        total,
        'parcelas',
        { action: 'focus' },
      )}`;
  },

  rankings(summary) {
    const excess = [...summary.barrios]
      .filter((b) => b.parcelas >= 500)
      .sort((a, b) => pct(b.categorias.excede, b.parcelas) - pct(a.categorias.excede, a.parcelas));
    return [
      {
        title: 'Dónde más se puede crecer',
        color: color('rem_alta'),
        rows: summary.barrios.slice(0, 5).map((b) => ({
          barrio: b.barrio,
          value: b.volumenRemanenteM3,
          label: `${fmtInt(b.volumenRemanenteM3 / 1e6)} M m³`,
        })),
      },
      {
        title: 'Dónde más se supera el código actual',
        color: color('excede'),
        rows: excess.slice(0, 5).map((b) => {
          const v = pct(b.categorias.excede, b.parcelas);
          return { barrio: b.barrio, value: v, label: fmtPct(v) };
        }),
      },
    ];
  },

  method({ metodologia: m }) {
    return `
      <dl class="method">
        <dt>Altura permitida</dt><dd>${esc(m.alturaPermitida)}</dd>
        <dt>Altura construida</dt><dd>${esc(m.alturaConstruida)}</dd>
        <dt>Tolerancia</dt><dd>±${m.toleranciaM} m: tanques y salas de máquinas pueden superar el plano límite.</dd>
        <dt>Volumen sin construir</dt><dd>${esc(m.volumenRemanente)}</dd>
        <dt>Más alto que el código</dt><dd>No implica irregularidad: muchos edificios son anteriores a la norma vigente.</dd>
      </dl>`;
  },
};
