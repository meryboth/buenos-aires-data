import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin, type ViteDevServer, type PreviewServer } from 'vite';

// Sirve los vector tiles directamente desde disco:
// - Tiles fuera de la ciudad no existen: 204 (tile vacío) en vez del fallback SPA a index.html,
//   que MapLibre intentaría decodificar como protobuf.
// - Vite guarda la lista de archivos de public/ al arrancar; si se regeneran los tiles con el
//   servidor corriendo, los nuevos caerían en ese mismo fallback.
function serveTiles(): Plugin {
  const install = (server: ViteDevServer | PreviewServer, root: string) => {
    const tilesDir = path.join(root, 'tiles');
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split('?')[0] ?? '';
      if (!url.startsWith('/tiles/') || !url.endsWith('.pbf')) return next();
      const file = path.join(root, decodeURIComponent(url));
      if (!file.startsWith(tilesDir)) return next();
      fs.stat(file, (err, stat) => {
        if (err) {
          res.statusCode = 204;
          return res.end();
        }
        res.setHeader('Content-Type', 'application/x-protobuf');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Cache-Control', 'no-cache');
        fs.createReadStream(file).pipe(res);
      });
    });
  };
  return {
    name: 'serve-tiles',
    configureServer: (server) => install(server, path.resolve('public')),
    configurePreviewServer: (server) => install(server, path.resolve('dist')),
  };
}

export default defineConfig({
  plugins: [serveTiles()],
  server: { port: 5180 },
  preview: { port: 4180 },
  build: { chunkSizeWarningLimit: 2500 },
});
