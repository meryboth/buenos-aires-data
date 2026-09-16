import { addProtocol } from 'maplibre-gl';
import { Protocol } from 'pmtiles';

// Tope de la caché de tiles ya descomprimidos (los tiles de edificios pesan hasta ~3 MB).
const CACHE_BUDGET_BYTES = 96 * 1024 * 1024;

type TileResponse = Awaited<ReturnType<Protocol['tilev4']>>;

/**
 * Registra el protocolo pmtiles:// con una caché en memoria compartida.
 *
 * Cada vista de edificios usa su propia fuente sobre el mismo archivo (ver buildings.ts), y la
 * librería pmtiles no guarda los tiles leídos: sin esta caché, cambiar a "Altura" volvía a
 * descargar los mismos tiles. MapLibre transfiere el buffer al worker (queda inutilizable), por
 * eso cada respuesta es una copia.
 */
export function registerPmtilesProtocol() {
  const protocol = new Protocol();
  const cache = new Map<string, Promise<TileResponse>>();
  const sizes = new Map<string, number>();
  let total = 0;

  const evict = () => {
    for (const key of cache.keys()) {
      if (total <= CACHE_BUDGET_BYTES) break;
      total -= sizes.get(key) ?? 0;
      sizes.delete(key);
      cache.delete(key);
    }
  };

  addProtocol('pmtiles', async (params) => {
    const key = params.url;
    let pending = cache.get(key);
    if (pending) {
      // Menos usado recientemente al final de la cola de desalojo.
      cache.delete(key);
      cache.set(key, pending);
    } else {
      // La descarga compartida no se cancela si una fuente deja de necesitar el tile: otra puede usarlo.
      pending = protocol.tilev4(params, new AbortController());
      cache.set(key, pending);
      pending.then(
        (res) => {
          const bytes = res.data instanceof Uint8Array ? res.data.byteLength : 0;
          if (!cache.has(key)) return;
          sizes.set(key, bytes);
          total += bytes;
          evict();
        },
        () => cache.delete(key),
      );
    }
    const res = await pending;
    return res.data instanceof Uint8Array ? { ...res, data: res.data.slice() } : res;
  });
}
