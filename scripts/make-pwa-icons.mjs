#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "public/brand-logo.png");
const outDir = path.join(root, "public/icons");
fs.mkdirSync(outDir, { recursive: true });

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  );
}

async function extractBadgeOnly() {
  const { data, info } = await sharp(srcPath)
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  let sumX = 0;
  let sumY = 0;
  let n = 0;
  const pts = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const lum = (r + g + b) / 3;
      const isMetal =
        a > 200 && lum > 100 && Math.abs(r - g) < 40 && Math.abs(g - b) < 50 && r > 90;
      const isCyan = a > 200 && b > 110 && b > r + 15;
      if (isMetal || isCyan) {
        sumX += x;
        sumY += y;
        n++;
        pts.push([x, y]);
      }
    }
  }

  const cx = sumX / n;
  const cy = sumY / n;
  let maxR = 0;
  for (const [x, y] of pts) maxR = Math.max(maxR, Math.hypot(x - cx, y - cy));

  let s = Math.ceil(maxR * 2) + 10;
  s = Math.min(s, w, h);
  let left = Math.max(0, Math.min(w - s, Math.round(cx - s / 2)));
  let top = Math.max(0, Math.min(h - s, Math.round(cy - s / 2)));
  const finalS = Math.min(s, w - left, h - top);

  const crop = await sharp(srcPath)
    .extract({ left, top, width: finalS, height: finalS })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const d = crop.data;
  const cw = crop.info.width;
  const ch = crop.info.height;

  // Koyu navy zemini sil — gümüş halka + mavi dişli + yazı kalsın
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = (r + g + b) / 3;
    const isCyan = b > 90 && b >= r;
    const isMetal = lum > 80 && Math.abs(r - g) < 50 && r > 65;
    const isBlueText = b > 50 && b >= g && b >= r - 10 && lum > 35 && lum < 160;
    if (!isCyan && !isMetal && !isBlueText && lum < 70) {
      d[i + 3] = 0;
    }
  }

  const cleared = await sharp(d, {
    raw: { width: cw, height: ch, channels: 4 },
  })
    .png()
    .toBuffer();

  const trimmed = await sharp(cleared).trim({ threshold: 5 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width ?? 1, meta.height ?? 1);

  const squared = await sharp(trimmed)
    .resize(side, side, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  return sharp(squared)
    .composite([{ input: circleMask(side), blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function makeIcon(canvasSize, fillRatio, outFile) {
  const badge = await extractBadgeOnly();
  const logoSize = Math.round(canvasSize * fillRatio);

  const resized = await sharp(badge)
    .resize(logoSize, logoSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(outFile);

  console.log("wrote", path.relative(root, outFile));
}

const badge = await extractBadgeOnly();
await sharp(badge).resize(512, 512).png().toFile(path.join(outDir, "icon-512.png"));
await sharp(badge).resize(192, 192).png().toFile(path.join(outDir, "icon-192.png"));
await sharp(badge)
  .resize(Math.round(512 * 0.9), Math.round(512 * 0.9), {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toBuffer()
  .then((buf) =>
    sharp({
      create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: buf, gravity: "centre" }])
      .png()
      .toFile(path.join(outDir, "icon-maskable-512.png"))
  );
await sharp(badge).resize(180, 180).png().toFile(path.join(root, "public/apple-touch-icon.png"));
await sharp(badge).resize(32, 32).png().toFile(path.join(root, "public/favicon.png"));

for (const f of ["_t.png", "_t2.png", "_badge-preview.png"]) {
  const p = path.join(outDir, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log("done");
