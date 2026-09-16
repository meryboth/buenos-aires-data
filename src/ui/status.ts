import type { Map as MLMap } from 'maplibre-gl';
import { esc } from './dom';

const spinner = '<span class="spinner" aria-hidden="true"></span>';
const check =
  '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>';

// Mínimo visible de un aviso de "aplicando", para que no parpadee cuando el cambio es rápido.
const MIN_BUSY_MS = 450;
// Si el cambio tarda más que esto, se atenúa el mapa (y se muestran los avisos silenciosos).
const SLOW_MS = 200;
// Las cargas de tiles cortas no muestran aviso.
const LOAD_DELAY_MS = 250;

/**
 * Aviso flotante sobre el mapa. Distingue dos situaciones:
 *  - "aplicando": el usuario cambió de análisis o filtro. Si el mapa tarda en reflejarlo, se atenúa
 *    hasta que termina, porque mientras tanto muestra colores viejos. Los avisos silenciosos
 *    (quiet) sólo aparecen si el cambio es lento.
 *  - "cargando": se están descargando tiles (al moverse o ir a un barrio).
 */
export function createMapStatus(root: HTMLElement, map: MLMap) {
  const mapEl = map.getContainer();
  type Busy = { label: string; since: number; quiet: boolean; slow: boolean; finishing: boolean };
  let busy: Busy | null = null;
  let loadTimer = 0;
  let hideTimer = 0;

  const show = (html: string, state: 'loading' | 'done') => {
    clearTimeout(hideTimer);
    root.innerHTML = html;
    root.dataset.state = state;
    root.hidden = false;
  };
  const hide = () => {
    root.hidden = true;
  };

  function finishBusy() {
    const job = busy;
    if (!job || job.finishing) return;
    job.finishing = true;
    if (job.quiet && !job.slow) {
      busy = null;
      return;
    }
    const { label, since } = job;
    const wait = Math.max(0, MIN_BUSY_MS - (performance.now() - since));
    setTimeout(() => {
      if (busy !== job) return; // hubo otro cambio mientras tanto
      busy = null;
      mapEl.classList.remove('is-updating');
      show(`${check}<span>${esc(label)}</span>`, 'done');
      hideTimer = window.setTimeout(hide, 1600);
    }, wait);
  }

  map.on('dataloading', () => {
    if (busy || loadTimer) return;
    loadTimer = window.setTimeout(() => {
      loadTimer = 0;
      if (!busy && !map.areTilesLoaded()) show(`${spinner}<span>Cargando edificios…</span>`, 'loading');
    }, LOAD_DELAY_MS);
  });

  map.on('idle', () => {
    clearTimeout(loadTimer);
    loadTimer = 0;
    if (busy) finishBusy();
    else if (root.dataset.state === 'loading') hide();
  });

  return {
    /** Llamar justo antes de cambiar colores o filtros de las capas. */
    applying(working: string, doneLabel: string, { quiet = false } = {}) {
      const job: Busy = { label: doneLabel, since: performance.now(), quiet, slow: false, finishing: false };
      busy = job;
      const loading = () => show(`${spinner}<span>${esc(working)}</span>`, 'loading');
      if (!quiet) loading();
      setTimeout(() => {
        if (busy !== job || job.finishing) return;
        job.slow = true;
        mapEl.classList.add('is-updating');
        loading();
      }, SLOW_MS);
      // 'idle' no siempre se dispara tras un recoloreo rápido: además se consulta el estado del mapa.
      const poll = () => {
        if (busy !== job) return;
        if (map.loaded() && !map.isMoving()) finishBusy();
        else setTimeout(poll, 120);
      };
      setTimeout(poll, 120);
    },
  };
}
