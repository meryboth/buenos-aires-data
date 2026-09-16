// Escritor mínimo de archivos PMTiles v3 (https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md).
// Un solo directorio raíz (alcanza para miles de tiles), tiles y metadatos comprimidos con gzip.
// La librería `pmtiles` sólo lee; para escribir se usa esto.
import fs from 'node:fs';
import { gzipSync } from 'node:zlib';
import { Compression, TileType, zxyToTileId } from 'pmtiles';

const HEADER_BYTES = 127;

function writeVarint(out, value) {
  let v = value;
  while (v >= 0x80) {
    out.push((v % 0x80) | 0x80);
    v = Math.floor(v / 0x80);
  }
  out.push(v);
}

/** Directorio: ids por delta, largos de corrida, tamaños y offsets (0 = contiguo al anterior). */
function serializeDirectory(entries) {
  const out = [];
  writeVarint(out, entries.length);
  let lastId = 0;
  for (const e of entries) {
    writeVarint(out, e.tileId - lastId);
    lastId = e.tileId;
  }
  for (const e of entries) writeVarint(out, e.runLength);
  for (const e of entries) writeVarint(out, e.length);
  entries.forEach((e, i) => {
    const contiguous = i > 0 && e.offset === entries[i - 1].offset + entries[i - 1].length;
    writeVarint(out, contiguous ? 0 : e.offset + 1);
  });
  return Buffer.from(out);
}

/**
 * @param {string} file
 * @param {{ z: number, x: number, y: number, data: Buffer }[]} tiles  MVT sin comprimir
 * @param {{ minzoom: number, maxzoom: number, bounds: number[], metadata: object }} info
 * @returns {{ bytes: number, tiles: number }}
 */
export function writePmtiles(file, tiles, { minzoom, maxzoom, bounds, metadata }) {
  const sorted = tiles
    .map((t) => ({ tileId: zxyToTileId(t.z, t.x, t.y), data: gzipSync(t.data, { level: 9 }) }))
    .sort((a, b) => a.tileId - b.tileId);

  let offset = 0;
  const entries = sorted.map((t) => {
    const entry = { tileId: t.tileId, offset, length: t.data.length, runLength: 1 };
    offset += t.data.length;
    return entry;
  });

  const rootDir = gzipSync(serializeDirectory(entries));
  const meta = gzipSync(Buffer.from(JSON.stringify(metadata)));
  const tileData = Buffer.concat(sorted.map((t) => t.data));

  const rootOffset = HEADER_BYTES;
  const metaOffset = rootOffset + rootDir.length;
  const leafOffset = metaOffset + meta.length;
  const dataOffset = leafOffset; // sin directorios hoja

  const h = Buffer.alloc(HEADER_BYTES);
  h.write('PMTiles', 0, 'ascii');
  h.writeUInt8(3, 7);
  const u64 = (pos, v) => h.writeBigUInt64LE(BigInt(v), pos);
  u64(8, rootOffset);
  u64(16, rootDir.length);
  u64(24, metaOffset);
  u64(32, meta.length);
  u64(40, leafOffset);
  u64(48, 0);
  u64(56, dataOffset);
  u64(64, tileData.length);
  u64(72, entries.length); // tiles direccionados
  u64(80, entries.length); // entradas
  u64(88, entries.length); // contenidos distintos
  h.writeUInt8(1, 96); // ordenado por tileId
  h.writeUInt8(Compression.Gzip, 97);
  h.writeUInt8(Compression.Gzip, 98);
  h.writeUInt8(TileType.Mvt, 99);
  h.writeUInt8(minzoom, 100);
  h.writeUInt8(maxzoom, 101);
  const e7 = (v) => Math.round(v * 1e7);
  h.writeInt32LE(e7(bounds[0]), 102);
  h.writeInt32LE(e7(bounds[1]), 106);
  h.writeInt32LE(e7(bounds[2]), 110);
  h.writeInt32LE(e7(bounds[3]), 114);
  h.writeUInt8(maxzoom, 118);
  h.writeInt32LE(e7((bounds[0] + bounds[2]) / 2), 119);
  h.writeInt32LE(e7((bounds[1] + bounds[3]) / 2), 123);

  fs.writeFileSync(file, Buffer.concat([h, rootDir, meta, tileData]));
  return { bytes: HEADER_BYTES + rootDir.length + meta.length + tileData.length, tiles: entries.length };
}
