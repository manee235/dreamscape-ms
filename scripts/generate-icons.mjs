// Pure JS script to generate valid PNG icon files for PWA
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size, bgRGB, fgRGB) {
  const width = size;
  const height = size;

  // Uncompressed raw image bytes with filter byte per row
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Check if inside circle or compass pointer
      const insideCircle = Math.abs(dist - radius) <= size * 0.04;
      const insideCenter = dist <= size * 0.08;
      const insideDiamond = (Math.abs(dx) * 1.5 + Math.abs(dy)) <= size * 0.35;

      if (insideCircle || insideCenter || insideDiamond) {
        rawData[pixelOffset] = fgRGB[0];     // R
        rawData[pixelOffset + 1] = fgRGB[1]; // G
        rawData[pixelOffset + 2] = fgRGB[2]; // B
        rawData[pixelOffset + 3] = 255;       // A
      } else {
        rawData[pixelOffset] = bgRGB[0];     // R
        rawData[pixelOffset + 1] = bgRGB[1]; // G
        rawData[pixelOffset + 2] = bgRGB[2]; // B
        rawData[pixelOffset + 3] = 255;       // A
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', deflated);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// CRC32 table & function
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const bg = [15, 20, 31];    // #0f141f dark navy
const fg = [0, 210, 147];   // #00d293 mint emerald

const p192 = createPNG(192, bg, fg);
fs.writeFileSync(path.resolve('public/icon-192.png'), p192);
console.log('Created public/icon-192.png');

const p512 = createPNG(512, bg, fg);
fs.writeFileSync(path.resolve('public/icon-512.png'), p512);
console.log('Created public/icon-512.png');
