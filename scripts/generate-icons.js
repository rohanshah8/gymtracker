#!/usr/bin/env node
/**
 * Generates placeholder PWA icons — a dark background with an orange
 * circle mark, matching the app's brand colors. No image libraries or
 * external deps: this is a minimal, from-scratch PNG encoder (raw RGB
 * scanlines, zlib deflate, manual CRC32) so it runs anywhere Node does.
 *
 * These are intentionally plain — swap them for real branded icons
 * before shipping (e.g. via `npx pwa-asset-generator your-logo.svg
 * public/icons`). Re-run with `npm run generate-icons`.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const BG = [0x17, 0x17, 0x17]; // neutral-900 — matches app/globals.css
const MARK = [0xf9, 0x73, 0x16]; // brand orange — matches tailwind.config.ts

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePNG(size, { maskable = false } = {}) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor (RGB)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  const cx = size / 2;
  const cy = size / 2;
  // Maskable icons get cropped by the OS, so keep the mark inside the safe zone.
  const radius = size * (maskable ? 0.3 : 0.34);

  const raw = Buffer.alloc(size * (1 + size * 3));
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0; // per-row filter byte: None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const inMark = dx * dx + dy * dy <= radius * radius;
      const [r, g, b] = inMark ? MARK : BG;
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([signature, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const t of targets) {
  const png = generatePNG(t.size, { maskable: t.maskable });
  fs.writeFileSync(path.join(outDir, t.file), png);
  console.log(`Generated public/icons/${t.file} (${t.size}x${t.size})`);
}

console.log('\nThese are placeholder icons (solid background + circle mark).');
console.log('Swap them for real branded icons before shipping.');
