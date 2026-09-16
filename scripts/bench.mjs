// Benchmark de rendimiento con GPU real (Edge/Chrome headless + ANGLE D3D11).
// Mide carga inicial, datos descargados, memoria, FPS orbitando, costo del hover y cambio de análisis.
// Uso: npm run build && npm run preview, y luego npm run bench -- http://localhost:4180/ [--runs=N]
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => a.startsWith('--runs='))?.slice(7) ?? 1);
const [base = 'http://localhost:5180/'] = args.filter((a) => !a.startsWith('--'));
const url = base + (base.includes('?') ? '&' : '?') + 'nointro&debug';

const executablePath = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));
if (!executablePath) throw new Error('No se encontró Edge/Chrome. Definí BROWSER_PATH.');

async function runOnce() {
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync', '--disable-frame-rate-limit'],
    defaultViewport: { width: 1400, height: 850 },
  });
  const page = await browser.newPage();
  const cdp = await page.createCDPSession();
  await cdp.send('Performance.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  const bytes = { tiles: 0, data: 0, js: 0, other: 0 };
  // Los tiles los descarga un Web Worker de MapLibre: se escucha la red de la página y de sus workers.
  const track = (session) => {
    const urls = new Map();
    session.on('Network.responseReceived', (e) => urls.set(e.requestId, e.response.url));
    session.on('Network.loadingFinished', (e) => {
      const u = urls.get(e.requestId) ?? '';
      const key = u.includes('/tiles/') || u.includes('.mvt') ? 'tiles' : u.includes('/data/') ? 'data' : /\.(m?js|ts)(\?|$)/.test(u) ? 'js' : 'other';
      bytes[key] += e.encodedDataLength;
    });
  };
  track(cdp);
  page.on('workercreated', (worker) => {
    track(worker.client);
    worker.client.send('Network.enable').catch(() => {});
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const d = gl?.getExtension('WEBGL_debug_renderer_info');
    return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'desconocido';
  });

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.ready === '1', { timeout: 120_000 });
  const loadMs = Date.now() - t0;

  const waitLoaded = () =>
    page.evaluate(() => new Promise((r) => { const c = () => (window.map.loaded() ? r() : setTimeout(c, 20)); c(); }));

  // FPS orbitando 3 s
  const fps = await page.evaluate(async () => {
    const m = window.map;
    let frames = 0;
    const count = () => frames++;
    m.on('render', count);
    const start = performance.now();
    const times = [];
    let last = start;
    await new Promise((resolve) => {
      const step = (now) => {
        times.push(now - last);
        last = now;
        m.setBearing(m.getBearing() + 0.5);
        if (now - start < 3000) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    m.off('render', count);
    times.sort((a, b) => a - b);
    return { avg: Math.round((frames / (performance.now() - start)) * 1000), p95FrameMs: Math.round(times[Math.floor(times.length * 0.95)]) };
  });
  await waitLoaded();

  // Hover: 60 movimientos sobre la ciudad
  const hoverStart = Date.now();
  for (let i = 0; i < 60; i++) await page.mouse.move(500 + i * 12, 300 + (i % 10) * 30);
  const hoverMsPerMove = Math.round(((Date.now() - hoverStart) / 60) * 10) / 10;

  // Cambio de análisis
  const switchTo = async (id) => {
    const t = Date.now();
    await page.evaluate((id) => {
      document.querySelector('[data-action="picker"]').click();
      document.querySelector(`[data-analysis="${id}"]`).click();
    }, id);
    await waitLoaded();
    return Date.now() - t;
  };
  const switchAlturaMs = await switchTo('altura');
  const switchCapacidadMs = await switchTo('capacidad');
  const filterMs = await (async () => {
    const t = Date.now();
    await page.click('.chip[data-cat="excede"]');
    await waitLoaded();
    return Date.now() - t;
  })();

  const { metrics } = await cdp.send('Performance.getMetrics');
  const metric = (n) => metrics.find((m) => m.name === n)?.value ?? 0;
  await browser.close();

  return {
    renderer,
    loadMs,
    tilesMB: +(bytes.tiles / 1e6).toFixed(1),
    dataMB: +(bytes.data / 1e6).toFixed(1),
    jsMB: +(bytes.js / 1e6).toFixed(1),
    heapMB: Math.round(metric('JSHeapUsedSize') / 1e6),
    fps: fps.avg,
    p95FrameMs: fps.p95FrameMs,
    hoverMsPerMove,
    switchAlturaMs,
    switchCapacidadMs,
    filterMs,
    errors: errors.length,
  };
}

const results = [];
for (let i = 0; i < runs; i++) results.push(await runOnce());
const { renderer } = results[0];
const median = (key) => {
  const v = results.map((r) => r[key]).sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
};
const summary = Object.fromEntries(Object.keys(results[0]).filter((k) => k !== 'renderer').map((k) => [k, median(k)]));
console.log(`GPU: ${renderer} · ${runs} corrida(s), mediana`);
console.table(summary);
