import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';

// Sirve los archivos PMTiles directamente desde disco, con pedidos por rango (como un hosting
// estático). Vite guarda la lista de archivos de public/ al arrancar: sin esto, un .pmtiles
// regenerado con el servidor corriendo caería en el fallback a index.html.
function serveTiles(): Plugin {
  const install = (server: ViteDevServer | PreviewServer, root: string) => {
    const tilesDir = path.join(root, 'tiles');
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] ?? '';
      if (!url.startsWith('/tiles/') || !url.endsWith('.pmtiles')) return next();
      const file = path.join(root, decodeURIComponent(url));
      if (!file.startsWith(tilesDir)) return next();
      fs.stat(file, (err, stat) => {
        if (err) {
          res.statusCode = 404;
          return res.end();
        }
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'no-cache');
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
        if (!range) {
          res.setHeader('Content-Length', stat.size);
          return fs.createReadStream(file).pipe(res);
        }
        const start = range[1] ? Number(range[1]) : Math.max(0, stat.size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
        if (start > end || start >= stat.size) {
          res.statusCode = 416;
          res.setHeader('Content-Range', `bytes */${stat.size}`);
          return res.end();
        }
        res.statusCode = 206;
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', end - start + 1);
        fs.createReadStream(file, { start, end }).pipe(res);
      });
    });
  };
  return {
    name: 'serve-tiles',
    configureServer: (server) => install(server, path.resolve('public')),
    configurePreviewServer: (server) => install(server, path.resolve('dist')),
  };
}

// Mientras la app no esté publicada, la miniatura para redes se sirve desde el repositorio
// (las redes necesitan una URL absoluta).
const REPO_OG_IMAGE = 'https://raw.githubusercontent.com/meryboth/buenos-aires-data/main/public/og-image.jpg';

/** Metadatos que dependen de dónde se publica la app (VITE_SITE_URL en .env). */
function siteMetadata(siteUrl: string): Plugin {
  const url = siteUrl.replace(/\/+$/, '');
  return {
    name: 'site-metadata',
    transformIndexHtml(html) {
      const withImage = html.replaceAll('__OG_IMAGE__', url ? `${url}/og-image.jpg` : REPO_OG_IMAGE);
      if (!url) return withImage;
      return {
        html: withImage.replace('"@type": "WebApplication",', `"@type": "WebApplication",
        "url": "${url}/",`),
        tags: [
          { tag: 'link', attrs: { rel: 'canonical', href: `${url}/` }, injectTo: 'head' },
          { tag: 'meta', attrs: { property: 'og:url', content: `${url}/` }, injectTo: 'head' },
        ],
      };
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [serveTiles(), siteMetadata(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '')],
  server: { port: 5180 },
  preview: { port: 4180 },
  build: { chunkSizeWarningLimit: 2500 },
}));
