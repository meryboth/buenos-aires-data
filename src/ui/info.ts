import { esc, fmtM, icons } from './dom';

export interface InfoCard {
  eyebrow?: string;
  title: string;
  badge?: { label: string; hint?: string; color: string };
  gauge?: { built: number; perm: number; color: string };
  rows: [string, string][];
}

/**
 * Indicador "construido vs. permitido": el contorno punteado es la altura permitida
 * y el relleno, lo construido. Misma escala para ambos.
 */
function gaugeHtml({ built, perm, color }: NonNullable<InfoCard['gauge']>) {
  const H = 96;
  const max = Math.max(built, perm, 1) * 1.08;
  const y = (v: number) => H - (v / max) * H;
  const storeys = Math.round((perm - built) / 3);
  const diff =
    Math.abs(perm - built) <= 3
      ? 'Usa la altura permitida'
      : built > perm
        ? `${fmtM(built - perm)} por encima`
        : `Puede crecer ~${storeys} ${storeys === 1 ? 'piso' : 'pisos'}`;
  return `
    <div class="gauge">
      <svg viewBox="0 0 56 ${H + 2}" width="56" height="${H + 2}" aria-hidden="true">
        <rect x="8" y="${y(perm)}" width="40" height="${H - y(perm)}" rx="3" fill="${color}" fill-opacity=".12" stroke="#cfcdc7" stroke-opacity=".7" stroke-dasharray="3 3"/>
        <rect x="8" y="${y(built)}" width="40" height="${H - y(built)}" rx="3" fill="${color}"/>
        <line x1="0" y1="${H + 1}" x2="56" y2="${H + 1}" stroke="#cfcdc7" stroke-opacity=".3"/>
      </svg>
      <div class="gauge__legend">
        <div><span>Construido</span><strong>${fmtM(built)}</strong></div>
        <div><span>Permitido</span><strong>${fmtM(perm)}</strong></div>
        <p style="--c:${color}">${esc(diff)}</p>
      </div>
    </div>`;
}

export function renderInfo(root: HTMLElement, info: InfoCard | null) {
  if (!info) {
    root.hidden = true;
    return;
  }
  root.hidden = false;
  root.innerHTML = `
    <button type="button" class="icon-btn info__close" aria-label="Cerrar">${icons.close}</button>
    ${info.eyebrow ? `<span class="eyebrow">${esc(info.eyebrow)}</span>` : ''}
    <h3>${esc(info.title)}</h3>
    ${info.badge ? `<p class="badge" style="--c:${info.badge.color}"><i></i><span>${esc(info.badge.label)}${info.badge.hint ? `<small>${esc(info.badge.hint)}</small>` : ''}</span></p>` : ''}
    ${info.gauge && info.gauge.perm > 0 ? gaugeHtml(info.gauge) : ''}
    ${info.rows.length ? `<dl>${info.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
  `;
  root.querySelector('.info__close')!.addEventListener('click', () => renderInfo(root, null));
}
