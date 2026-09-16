import { icons } from './dom';

export interface ToolbarCallbacks {
  onToggle3D: () => boolean; // devuelve si quedó en 3D
  onToggleOrbit: () => boolean; // devuelve si quedó orbitando
  onReset: () => void;
}

export function renderToolbar(root: HTMLElement, cb: ToolbarCallbacks) {
  root.innerHTML = `
    <button type="button" class="tool" data-tool="3d" aria-label="Cambiar a vista 2D" title="Vista 2D / 3D">${icons.square}<span>2D</span></button>
    <button type="button" class="tool" data-tool="orbit" aria-pressed="false" aria-label="Girar alrededor" title="Girar alrededor">${icons.orbit}</button>
    <button type="button" class="tool" data-tool="reset" aria-label="Vista inicial" title="Vista inicial">${icons.home}</button>
  `;
  const btn3d = root.querySelector<HTMLButtonElement>('[data-tool="3d"]')!;
  const btnOrbit = root.querySelector<HTMLButtonElement>('[data-tool="orbit"]')!;

  root.addEventListener('click', (e) => {
    const tool = (e.target as HTMLElement).closest<HTMLElement>('[data-tool]')?.dataset.tool;
    if (tool === '3d') set3D(cb.onToggle3D());
    if (tool === 'orbit') setOrbit(cb.onToggleOrbit());
    if (tool === 'reset') cb.onReset();
  });

  const set3D = (is3D: boolean) => {
    btn3d.innerHTML = is3D ? `${icons.square}<span>2D</span>` : `${icons.cube}<span>3D</span>`;
    btn3d.setAttribute('aria-label', is3D ? 'Cambiar a vista 2D' : 'Cambiar a vista 3D');
  };
  const setOrbit = (on: boolean) => {
    btnOrbit.innerHTML = on ? icons.pause : icons.orbit;
    btnOrbit.setAttribute('aria-pressed', String(on));
  };
  return { set3D, setOrbit };
}
