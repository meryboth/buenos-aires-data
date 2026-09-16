export const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export const pct = (n: number, total: number) => (total ? (n / total) * 100 : 0);
export const fmtPct = (n: number) =>
  n > 0 && n < 0.1 ? '<0,1 %' : `${n.toLocaleString('es-AR', { maximumFractionDigits: n < 10 ? 1 : 0 })} %`;
export const fmtInt = (n: number) => Math.round(n).toLocaleString('es-AR');
export const fmtM = (n: number) => `${n.toLocaleString('es-AR', { maximumFractionDigits: 1 })} m`;

const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  cube: svg('<path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z"/><path d="M12 12 20 7.5M12 12v9M12 12 4 7.5"/>'),
  square: svg('<rect x="4" y="4" width="16" height="16" rx="2"/>'),
  orbit: svg('<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  home: svg('<path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  collapse: svg('<path d="M15 6l-6 6 6 6"/>'),
  expand: svg('<path d="M9 6l6 6-6 6"/>'),
};

/** Isotipo (mismo dibujo que public/favicon.svg, sin el fondo). */
export const brandMark = `
  <svg class="brand__mark" viewBox="6 6 52 52" aria-hidden="true">
    <rect x="10" y="17" width="12" height="36" rx="2.5" fill="none" stroke="#9ec5f4" stroke-width="2" stroke-dasharray="3.5 3"/>
    <rect x="9" y="36" width="14" height="18" rx="3" fill="#9ec5f4"/>
    <rect x="26" y="10" width="12" height="43" rx="2.5" fill="#3987e5"/>
    <rect x="42" y="24" width="12" height="29" rx="2.5" fill="#e66767"/>
  </svg>`;
