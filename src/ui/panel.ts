import { ANALYSES, type AnalysisDef, type AnalysisId } from '../analyses';
import type { AnalysisSummary } from '../analysis';
import type { AnalysisCategory } from '../config';
import { DATA_LAYERS, type DataLayerId } from '../layers/transport';
import { rankingsHtml } from './charts';
import { brandMark, esc, fmtInt, icons } from './dom';

export type LayerToggle = DataLayerId | 'edificios' | 'envolvente';

export interface AppState {
  analysis: AnalysisId;
  active: Set<LayerToggle>;
  focus: Set<AnalysisCategory>;
  barrio: string | null;
}

export interface PanelCallbacks {
  onAnalysis: (id: AnalysisId) => void;
  onToggle: (id: LayerToggle, on: boolean) => void;
  onBarrio: (barrio: string | null) => void;
  onFocus: (cat: AnalysisCategory) => void;
}

const LAYER_TEXT: Record<LayerToggle, [string, string]> = {
  edificios: ['Edificios 3D', '1,4 millones de volúmenes · Tejido urbano'],
  envolvente: ['Lo que falta construir', 'Envolvente permitida (análisis de capacidad)'],
  colectivos: ['Recorridos de colectivos', 'Transporte y Obras Públicas'],
  ciclovias: ['Ciclovías', 'Transporte y Obras Públicas'],
  barrios: ['Límites de barrios', 'Ministerio de Educación'],
};

const iconSvg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

const chevron = iconSvg('<path d="m7 10 5 5 5-5"/>');

export function renderPanel(root: HTMLElement, state: AppState, barrios: string[], cb: PanelCallbacks) {
  const available = ANALYSES.filter((a) => a.status === 'disponible').length;

  root.innerHTML = `
    <header class="panel__header">
      <div class="brand">${brandMark}<div class="brand__text"><strong>Buenos Aires</strong><span>Data Driven</span></div></div>
      <button type="button" class="icon-btn" data-action="collapse" aria-label="Ocultar panel" title="Ocultar panel">${icons.collapse}</button>
    </header>

    <nav class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="explorar">Explorar</button>
      <button role="tab" aria-selected="false" data-tab="capas">Capas</button>
      <button role="tab" aria-selected="false" data-tab="metodo">Método</button>
    </nav>

    <div class="panel__body">
      <section data-panel="explorar">
        <div class="picker">
          <span class="section-label">Análisis</span>
          <button type="button" class="picker__current" data-action="picker" aria-expanded="false" aria-haspopup="listbox">
            <span class="picker__icon" data-role="picker-icon"></span>
            <span class="picker__text"><b data-role="picker-title"></b><small>${available} disponibles · ${ANALYSES.length - available} en camino</small></span>
            <span class="picker__chevron">${chevron}</span>
          </button>
          <ul class="picker__menu" role="listbox" hidden>
            ${ANALYSES.map(
              (a) => `
              <li>
                <button type="button" role="option" data-analysis="${a.id}" ${a.status === 'proximamente' ? 'aria-disabled="true"' : ''}>
                  <span class="picker__icon">${iconSvg(a.icon)}</span>
                  <span class="picker__text">
                    <b>${esc(a.title)}${a.status === 'proximamente' ? '<em>Próximamente</em>' : ''}</b>
                    <small>${esc(a.question)}</small>
                  </span>
                </button>
              </li>`,
            ).join('')}
          </ul>
        </div>

        <div class="concept" data-role="concept"></div>

        <label class="select">
          <span>Zona</span>
          <select data-role="barrio">
            <option value="">Toda la ciudad</option>
            ${barrios.map((b) => `<option value="${esc(b)}" ${state.barrio === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}
          </select>
        </label>

        <div data-role="stats"><div class="skeleton"></div></div>
        <div data-role="rankings"></div>
      </section>

      <section data-panel="capas" hidden>
        <ul class="switches">
          ${(['edificios', 'envolvente', ...DATA_LAYERS.map((l) => l.id)] as LayerToggle[])
            .map(
              (id) => `
            <li>
              <label class="switch">
                <span><b>${esc(LAYER_TEXT[id][0])}</b><small>${esc(LAYER_TEXT[id][1])}</small></span>
                <input type="checkbox" role="switch" data-layer="${id}" ${state.active.has(id) ? 'checked' : ''} />
                <i aria-hidden="true"></i>
              </label>
            </li>`,
            )
            .join('')}
        </ul>
        <p class="hint">Arrastrá para mover · clic derecho y arrastrar para rotar e inclinar · clic en un edificio para ver su ficha.</p>
      </section>

      <section data-panel="metodo" hidden data-role="method"></section>
    </div>
  `;

  const panels = root.querySelectorAll<HTMLElement>('[data-panel]');
  root.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((tab, _, tabs) =>
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      panels.forEach((p) => (p.hidden = p.dataset.panel !== tab.dataset.tab));
    }),
  );

  const pickerBtn = root.querySelector<HTMLButtonElement>('[data-action="picker"]')!;
  const menu = root.querySelector<HTMLElement>('.picker__menu')!;
  const setMenu = (open: boolean) => {
    menu.hidden = !open;
    pickerBtn.setAttribute('aria-expanded', String(open));
  };
  document.addEventListener('click', (e) => {
    if (!root.querySelector('.picker')!.contains(e.target as Node)) setMenu(false);
  });
  root.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  root.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement | HTMLSelectElement;
    if (input.dataset.role === 'barrio') cb.onBarrio(input.value || null);
    else if (input instanceof HTMLInputElement && input.dataset.layer) cb.onToggle(input.dataset.layer as LayerToggle, input.checked);
  });

  root.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action], [data-analysis]');
    if (!target) return;
    if (target.dataset.analysis) {
      if (target.getAttribute('aria-disabled') === 'true') return;
      setMenu(false);
      cb.onAnalysis(target.dataset.analysis as AnalysisId);
      return;
    }
    switch (target.dataset.action) {
      case 'picker':
        return setMenu(menu.hasAttribute('hidden'));
      case 'collapse':
        return void root.classList.toggle('panel--collapsed');
      case 'barrio':
        return cb.onBarrio(target.dataset.barrio!);
      case 'focus':
        return cb.onFocus(target.dataset.cat as AnalysisCategory);
    }
  });
}

export function setBarrioSelect(root: HTMLElement, barrio: string | null) {
  root.querySelector<HTMLSelectElement>('[data-role="barrio"]')!.value = barrio ?? '';
}

/** Contenido que depende del análisis elegido. */
export function renderAnalysis(root: HTMLElement, analysis: AnalysisDef, summary: AnalysisSummary | undefined, state: AppState) {
  root.querySelector('[data-role="picker-icon"]')!.innerHTML = iconSvg(analysis.icon);
  root.querySelector('[data-role="picker-title"]')!.textContent = analysis.title;
  root.querySelectorAll<HTMLElement>('[data-analysis]').forEach((el) =>
    el.setAttribute('aria-selected', String(el.dataset.analysis === analysis.id)),
  );
  root.querySelector('[data-role="concept"]')!.innerHTML = `
    <div>
      <h2 class="concept__title">${esc(analysis.question)}</h2>
      <p>${esc(analysis.description)}</p>
    </div>
    ${analysis.diagram ?? ''}`;

  if (!summary) return;
  renderStats(root, analysis, summary, state);
  root.querySelector('[data-role="rankings"]')!.innerHTML = analysis.rankings ? rankingsHtml(analysis.rankings(summary)) : '';
  root.querySelector('[data-role="method"]')!.innerHTML = `
    <h4>${esc(analysis.title)}</h4>
    ${analysis.method?.(summary) ?? ''}
    <h4>Fuentes</h4>
    <ul class="sources">
      <li><a href="https://data.buenosaires.gob.ar/dataset/tejido-urbano" target="_blank" rel="noopener">Tejido urbano</a></li>
      <li><a href="https://data.buenosaires.gob.ar/dataset/codigo-urbanistico" target="_blank" rel="noopener">Código Urbanístico (dic. 2024)</a></li>
      <li><a href="https://data.buenosaires.gob.ar/dataset/parcelas" target="_blank" rel="noopener">Parcelas catastrales</a></li>
      <li><a href="https://data.buenosaires.gob.ar/dataset/barrios" target="_blank" rel="noopener">Barrios</a></li>
    </ul>
    <p class="hint">Datos procesados el ${new Date(summary.generatedAt).toLocaleDateString('es-AR')}.</p>`;
}

export function renderStats(root: HTMLElement, analysis: AnalysisDef, summary: AnalysisSummary, state: AppState) {
  const area = (state.barrio && summary.barrios.find((b) => b.barrio === state.barrio)) || summary.ciudad;
  const name = state.barrio && area !== summary.ciudad ? state.barrio : 'Toda la ciudad';
  root.querySelector('[data-role="stats"]')!.innerHTML = `
    <div class="stats__head"><h3>${esc(name)}</h3><span>${fmtInt(area.parcelas)} parcelas</span></div>
    ${analysis.stats?.({ name, area, summary, focus: state.focus }) ?? ''}`;
}

export function renderSummaryError(root: HTMLElement) {
  root.querySelector('[data-role="stats"]')!.innerHTML =
    '<p class="hint">No se pudo cargar el resumen. Corré <code>npm run data:parcels</code>.</p>';
}
