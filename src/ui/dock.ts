import { ANALYSIS_CATEGORIES, HEIGHT_RAMP, type AnalysisCategory } from '../config';
import type { AnalysisDef } from '../analyses';
import { esc } from './dom';

/**
 * Leyenda flotante al pie del mapa. En los análisis filtrables cada categoría es un filtro:
 * al elegirla se apagan las demás.
 */
export function renderDock(
  root: HTMLElement,
  analysis: AnalysisDef,
  focus: Set<AnalysisCategory>,
  onFocus: (cat: AnalysisCategory | null) => void,
) {
  root.hidden = !analysis.colorMode;
  if (analysis.colorMode === 'altura') {
    const gradient = HEIGHT_RAMP.map(([h, c]) => `${c} ${(h / 150) * 100}%`).join(', ');
    root.innerHTML = `
      <div class="dock__ramp">
        <span>Altura</span>
        <div class="ramp" style="background: linear-gradient(to right, ${gradient})"></div>
        <div class="ramp__labels"><span>0 m</span><span>45 m</span><span>150+ m</span></div>
      </div>`;
    root.onclick = null;
    return;
  }

  root.innerHTML = `
    <span class="dock__label">Filtrar</span>
    <span class="dock__group">Puede crecer</span>
    ${ANALYSIS_CATEGORIES.filter((c) => c.id !== 'sin_dato')
      .map(
        (c) => `
      <button type="button" class="chip ${focus.size && !focus.has(c.id) ? 'is-dim' : ''}" data-cat="${c.id}"
        aria-pressed="${focus.has(c.id)}" title="${esc(c.label)}: ${esc(c.hint)}">
        <i style="background:${c.color}"></i>${esc(c.short)}
      </button>${c.id === 'rem_media' ? '<span class="dock__sep" aria-hidden="true"></span>' : ''}`,
      )
      .join('')}
    ${focus.size ? '<button type="button" class="chip chip--ghost" data-cat="">Ver todo</button>' : ''}
  `;
  root.onclick = (e) => {
    const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-cat]');
    if (chip) onFocus((chip.dataset.cat || null) as AnalysisCategory | null);
  };
}
