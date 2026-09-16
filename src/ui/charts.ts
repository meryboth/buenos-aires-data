import type { Ranking } from '../analyses/types';
import { esc, fmtInt, fmtPct, pct } from './dom';

export interface Segment {
  id: string;
  label: string;
  color: string;
  value: number;
  hint?: string;
  dim?: boolean;
  pressed?: boolean;
}

/** Barra 100 % apilada + desglose con etiquetas (la tabla accesible del gráfico). */
export function stackWithBreakdown(segments: Segment[], total: number, unit: string, opts: { action?: string } = {}) {
  const visible = segments.filter((s) => s.value > 0);
  const bar = visible
    .map(
      (s) =>
        `<span style="flex-grow:${s.value};background:${s.color}" class="${s.dim ? 'is-dim' : ''}" title="${esc(s.label)}: ${fmtInt(s.value)} ${unit} (${fmtPct(pct(s.value, total))})"></span>`,
    )
    .join('');
  const rows = visible
    .map((s) => {
      const inner = `<i style="background:${s.color}"></i><span>${esc(s.label)}</span><b>${fmtPct(pct(s.value, total))}</b>`;
      return opts.action
        ? `<li><button type="button" data-action="${opts.action}" data-cat="${s.id}" aria-pressed="${!!s.pressed}" class="${s.dim ? 'is-dim' : ''}" title="${esc(s.hint ?? '')}">${inner}</button></li>`
        : `<li><div class="breakdown__row" title="${esc(s.hint ?? '')}">${inner}</div></li>`;
    })
    .join('');
  return `
    <div class="stack" role="img" aria-label="Distribución de ${unit}">${bar}</div>
    <ul class="breakdown">${rows}</ul>`;
}

export function rankingsHtml(rankings: Ranking[]) {
  return `
    <div class="rankings">
      ${rankings
        .map((r) => {
          const max = Math.max(...r.rows.map((row) => row.value), 1);
          return `
          <h4>${esc(r.title)}</h4>
          <ol class="rank">
            ${r.rows
              .map(
                (row, i) => `
              <li>
                <button type="button" data-action="barrio" data-barrio="${esc(row.barrio)}" title="Ver ${esc(row.barrio)}">
                  <span class="rank__pos">${i + 1}</span>
                  <span class="rank__name">${esc(row.barrio)}</span>
                  <span class="rank__bar"><i style="width:${(row.value / max) * 100}%;background:${r.color}"></i></span>
                  <span class="rank__value">${row.label}</span>
                </button>
              </li>`,
              )
              .join('')}
          </ol>`;
        })
        .join('')}
    </div>`;
}

export const kpi = (value: string, label: string) => `<div><strong>${value}</strong><span>${esc(label)}</span></div>`;
