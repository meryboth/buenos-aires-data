// Smoke test visual: abre la app en Edge/Chrome headless, espera a que el mapa
// termine de cargar, reporta errores de consola y guarda una captura.
// Uso: npm run smoke -- [url] [salida.png] [--all-layers] [--at=lon,lat,zoom[,pitch,bearing]]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const allLayers = args.includes('--all-layers');
const at = args.find((a) => a.startsWith('--at='))?.slice(5).split(',').map(Number);
const [base = 'http://localhost:5180/', out = 'smoke.png'] = args.filter((a) => !a.startsWith('--'));
// Sin animación de entrada, para que la cámara quede fija en la vista inicial.
const url = base + (base.includes('?') ? '&' : '?') + 'nointro';

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const executablePath = CANDIDATES.find((p) => fs.existsSync(p));
if (!executablePath) throw new Error('No se encontró Edge/Chrome. Definí BROWSER_PATH.');

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1400,850'],
  defaultViewport: { width: 1400, height: 850 },
});
const page = await browser.newPage();
const problems = [];
page.on('console', async (m) => {
  if (!['error', 'warning'].includes(m.type())) return;
  // Los Error llegan como "[object Error]": se extrae el mensaje real.
  const details = await Promise.all(
    m.args().map((arg) => arg.evaluate((v) => (v instanceof Error ? v.stack ?? v.message : String(v))).catch(() => '')),
  );
  problems.push(`[${m.type()}] ${details.filter(Boolean).join(' ') || m.text()}`);
});
page.on('pageerror', (e) => problems.push(`[pageerror] ${e.stack ?? e.message}`));
page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'networkidle2', timeout: 60_000 });
// window.map sólo se expone en desarrollo (sin eso, `window.map` es el <div id="map">).
await page
  .waitForFunction(() => typeof window.map?.loaded === 'function' && document.body.dataset.ready === '1', { timeout: 60_000 })
  .catch(() => problems.push('[smoke] window.map no disponible (¿build de producción?)'));
if (allLayers) {
  await page.$$eval('#panel input[type=checkbox]:not(:checked)', (inputs) => inputs.forEach((i) => i.click()));
}
const state = await page.evaluate(async (at) => {
  const map = window.map;
  if (typeof map?.loaded !== 'function') return {};
  if (at) {
    const [lng, lat, zoom, pitch = 60, bearing = -20] = at;
    map.jumpTo({ center: [lng, lat], zoom, pitch, bearing });
    await new Promise((r) => setTimeout(r, 300));
  }
  const idle = await Promise.race([
    new Promise((resolve) => (map.loaded() ? resolve(true) : map.once('idle', () => resolve(true)))),
    new Promise((resolve) => setTimeout(() => resolve(false), 40_000)),
  ]);
  return {
    idle,
    zoom: map.getZoom().toFixed(2),
    buildingsRendered: map.queryRenderedFeatures({
      layers: map.getStyle().layers.filter((l) => l.type === 'fill-extrusion' && l.id.startsWith('buildings-') && map.getPaintProperty(l.id, 'fill-extrusion-opacity') === 1).map((l) => l.id),
    }).length,
    dataLayers: ['barrios', 'colectivos', 'ciclovias'].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none'),
  };
}, at);
// Clic en un edificio cercano al centro para verificar la ficha de información.
await page.mouse.click(900, 600);
await new Promise((r) => setTimeout(r, 500));
state.infoAfterClick = await page.$eval('#info', (el) => (el.hidden ? null : el.innerText.replace(/\s+/g, ' ').trim()));
await page.screenshot({ path: out });
await browser.close();

console.log(JSON.stringify(state, null, 2));
console.log(problems.length ? problems.join('\n') : 'Sin errores de consola.');
console.log(`Captura: ${out}`);
