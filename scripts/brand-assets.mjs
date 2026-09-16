// Genera los íconos, la miniatura para redes (Open Graph) y la vista previa del repo en GitHub.
// Parte de public/favicon.svg y de una captura real de la app.
// Uso: npm run build && npm run preview, y luego npm run brand [-- http://localhost:4180/]
// Necesita ffmpeg en el PATH para el favicon.ico.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { PUBLIC_DATA, ROOT } from './lib/common.mjs';

const base = process.argv[2] ?? 'http://localhost:4180/';
const PUBLIC = path.join(ROOT, 'public');
const DOCS = path.join(ROOT, 'docs');

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

const dataUrl = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
const favicon = fs.readFileSync(path.join(PUBLIC, 'favicon.svg'), 'utf8');
const fonts = `
  @font-face { font-family: 'Space Grotesk'; font-weight: 300 700;
    src: url(${dataUrl(path.join(ROOT, 'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2'), 'font/woff2')}) format('woff2'); }
  @font-face { font-family: 'Inter'; font-weight: 100 900;
    src: url(${dataUrl(path.join(ROOT, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'), 'font/woff2')}) format('woff2'); }`;

async function render(html, { width, height, file, type = 'png', transparent = false }) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><head><style>
    ${fonts}
    html, body { margin: 0; width: ${width}px; height: ${height}px; overflow: hidden; background: ${transparent ? 'transparent' : '#0b0b0c'}; }
  </style></head><body>${html}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, type, ...(type === 'jpeg' && { quality: 88 }), omitBackground: transparent });
  await page.close();
  console.log(`✓ ${path.relative(ROOT, file)} (${Math.round(fs.statSync(file).size / 1024)} KB)`);
}

// --- Íconos ---
const icon = (size) => `<div style="width:${size}px;height:${size}px">${favicon.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>`;
for (const [size, name] of [
  [32, 'favicon-32.png'],
  [180, 'apple-touch-icon.png'],
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
]) {
  await render(icon(size), { width: size, height: size, file: path.join(PUBLIC, name), transparent: true });
}
// Ícono "maskable": fondo a sangre y dibujo dentro de la zona segura (80 %) para Android.
await render(
  `<div style="width:512px;height:512px;background:#0b0b0c;display:grid;place-items:center">
     ${favicon.replace('<svg ', '<svg width="400" height="400" ').replace('rx="14"', 'rx="0"')}
   </div>`,
  { width: 512, height: 512, file: path.join(PUBLIC, 'icon-maskable-512.png') },
);
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(PUBLIC, 'favicon-32.png'), path.join(PUBLIC, 'favicon.ico')]);
fs.rmSync(path.join(PUBLIC, 'favicon-32.png'));
console.log('✓ public/favicon.ico');

// --- Fondo: la ciudad sin interfaz ---
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto(`${base}?nointro&debug`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.body.dataset.ready === '1', { timeout: 120_000 });
await page.addStyleTag({ content: '#panel, #dock, #toolbar, #status, #info, .maplibregl-control-container { display: none !important; }' });
await page.evaluate(() => window.map.jumpTo({ center: [-58.3745, -34.6045], zoom: 15.1, pitch: 64, bearing: -28 }));
await page.evaluate(
  () => new Promise((r) => { const c = () => (window.map.loaded() ? r() : setTimeout(c, 50)); c(); }),
);
await new Promise((r) => setTimeout(r, 800));
const backgroundFile = path.join(DOCS, '.fondo-tmp.png');
fs.mkdirSync(DOCS, { recursive: true });
await page.screenshot({ path: backgroundFile });
await page.close();
const background = dataUrl(backgroundFile, 'image/png');

// --- Miniatura ---
const summary = JSON.parse(fs.readFileSync(path.join(PUBLIC_DATA, 'resumen-barrios.json'), 'utf8'));
const c = summary.ciudad.categorias;
const canGrow = Math.round(((c.rem_media + c.rem_alta) / summary.ciudad.parcelas) * 100);

const card = (width, height) => `
  <div style="position:relative;width:${width}px;height:${height}px;font-family:Inter,sans-serif;color:#f3f2ef;
              background:url(${background}) center/cover">
    <div style="position:absolute;inset:0;background:linear-gradient(90deg,#0b0b0c 0%,rgba(11,11,12,.92) 38%,rgba(11,11,12,.25) 75%,rgba(11,11,12,.1) 100%)"></div>
    <div style="position:absolute;left:72px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;gap:26px;width:${Math.round(width * 0.52)}px">
      <div style="display:flex;align-items:center;gap:18px">
        ${favicon.replace('<svg ', '<svg width="76" height="76" ')}
        <div style="font-family:'Space Grotesk';line-height:1">
          <div style="font-size:44px;font-weight:700;letter-spacing:-1px">Buenos Aires</div>
          <div style="font-size:19px;font-weight:500;letter-spacing:8px;color:#3dd6a0;margin-top:6px">DATA DRIVEN</div>
        </div>
      </div>
      <div style="font-family:'Space Grotesk';font-size:40px;font-weight:600;line-height:1.15;letter-spacing:-.5px">
        La ciudad en 3D,<br>leída con datos abiertos
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${[
          [`${canGrow} %`, 'de las parcelas puede crecer'],
          ['1,4 M', 'volúmenes edificados'],
          ['48', 'barrios analizados'],
        ]
          .map(
            ([v, l]) => `<div style="padding:12px 16px;border-radius:12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14)">
              <div style="font-family:'Space Grotesk';font-size:28px;font-weight:700;color:#9ec5f4">${v}</div>
              <div style="font-size:15px;color:#c9c7c1">${l}</div></div>`,
          )
          .join('')}
      </div>
      <div style="font-size:17px;color:#a09e98">Open source · Urbanismo · GIS · 3D web</div>
    </div>
  </div>`;

await render(card(1200, 630), { width: 1200, height: 630, file: path.join(PUBLIC, 'og-image.jpg'), type: 'jpeg' });
await render(card(1280, 640), { width: 1280, height: 640, file: path.join(DOCS, 'social-preview.jpg'), type: 'jpeg' });
fs.rmSync(backgroundFile);

await browser.close();
