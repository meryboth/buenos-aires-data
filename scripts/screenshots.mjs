// Genera las capturas de la documentación en docs/screenshots (GPU real, build de producción).
// Uso: npm run build && npm run preview, y luego npm run docs:screenshots [-- http://localhost:4180/]
// El GIF de la intro necesita ffmpeg en el PATH.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { ROOT } from './lib/common.mjs';

const base = process.argv[2] ?? 'http://localhost:4180/';
const OUT = path.join(ROOT, 'docs', 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

const executablePath = [
  process.env.BROWSER_PATH,
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p) => p && fs.existsSync(p));
if (!executablePath) throw new Error('No se encontró Edge/Chrome. Definí BROWSER_PATH.');

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'],
});

const DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const MOBILE = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function open({ hash = '', query = 'nointro&debug', viewport = DESKTOP } = {}) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`${base}?${query}${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.ready === '1' && document.querySelector('.rank button'), {
    timeout: 120_000,
  });
  return page;
}

const settle = async (page, extra = 600) => {
  await page.evaluate(
    () => new Promise((r) => { const c = () => (window.map.loaded() && !window.map.isMoving() ? r() : setTimeout(c, 50)); c(); }),
  );
  await pause(extra);
};

const camera = (page, view) => page.evaluate((v) => window.map.jumpTo(v), view);

async function shot(page, name) {
  const file = path.join(OUT, `${name}.webp`);
  await page.screenshot({ path: file, type: 'webp', quality: 82 });
  console.log(`✓ docs/screenshots/${name}.webp (${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

const CABALLITO = { center: [-58.4435, -34.6195], zoom: 16.3, pitch: 62, bearing: 30 };
const CATALINAS = { center: [-58.3668, -34.5985], zoom: 15.4, pitch: 66, bearing: 118 };

// 1. Vista principal
let page = await open();
await settle(page);
await shot(page, '01-capacidad');

// 2. Ficha de parcela con la envolvente sin construir
await camera(page, CABALLITO);
await settle(page);
await page.mouse.click(930, 600);
await pause(500);
await shot(page, '02-ficha-parcela');

// 3. Filtro desde la leyenda
await page.click('.info__close').catch(() => {});
await camera(page, { center: [-58.3816, -34.6037], zoom: 14.5, pitch: 60, bearing: -20 });
await page.click('.chip[data-cat="excede"]');
await settle(page, 900);
await shot(page, '03-filtro');

// 4. Selector de análisis abierto
await page.click('.chip--ghost');
await settle(page);
await page.waitForFunction(() => document.getElementById('status').hidden, { timeout: 10_000 }).catch(() => {});
await page.click('[data-action="picker"]');
await pause(400);
await shot(page, '04-selector-analisis');
await page.close();

// 5. Análisis de altura
page = await open({ hash: '#altura' });
await camera(page, CATALINAS);
await settle(page, 900);
await shot(page, '05-altura');
await page.close();

// 6. Barrio elegido
page = await open();
await page.select('[data-role="barrio"]', 'Palermo');
await pause(2500);
await settle(page, 900);
await shot(page, '06-barrio');

// 7. Pestaña Método
await page.click('[data-tab="metodo"]');
await pause(300);
await shot(page, '07-metodo');

// 8. Capas de movilidad
await page.click('[data-tab="capas"]');
for (const id of ['colectivos', 'ciclovias']) await page.click(`.switch:has(input[data-layer="${id}"])`);
await page.select('[data-role="barrio"]', '').catch(() => {});
await camera(page, { center: [-58.4205, -34.5965], zoom: 14.6, pitch: 55, bearing: -35 });
await settle(page, 1500);
await shot(page, '08-capas');
await page.close();

// 9. Celular
page = await open({ viewport: MOBILE });
await settle(page);
await shot(page, '09-celular');
await page.close();

// 10. GIF de la animación de entrada
try {
  page = await browser.newPage();
  await page.setViewport({ width: 960, height: 600, deviceScaleFactor: 1 });
  const webm = path.join(OUT, 'intro.webm');
  await page.goto(`${base}?debug`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !document.getElementById('loader'), { timeout: 120_000 });
  const recorder = await page.screencast({ path: webm });
  await pause(6500);
  await recorder.stop();
  const gif = path.join(OUT, 'intro.gif');
  execFileSync('ffmpeg', [
    '-loglevel', 'error', '-y', '-i', webm,
    '-vf', 'fps=8,scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
    gif,
  ]);
  fs.rmSync(webm);
  console.log(`✓ docs/screenshots/intro.gif (${Math.round(fs.statSync(gif).size / 1024)} KB)`);
} catch (err) {
  console.warn(`✗ GIF de la intro: ${err.message}`);
}

await browser.close();
