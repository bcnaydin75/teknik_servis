#!/usr/bin/env node
/**
 * PWA ikonları — kare koyu zemin + ortada gümüş mühür.
 * Mor hale / glow yok; arka plan düz #080a16.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const srcPath = path.join(root, "public/brand-logo.png");
const outDir = path.join(root, "public/icons");

if (!fs.existsSync(srcPath)) {
  console.error("public/brand-logo.png bulunamadı");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

/** Düz koyu zemin — mavi/mor kayma yok (nötr siyah) */
const BG = { r: 12, g: 12, b: 14, alpha: 1 };

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/></svg>`
  );
}

function isMetalPixel(r, g, b, a) {
  if (a < 180) return false;
  const lum = (r + g + b) / 3;
  return lum > 95 && Math.abs(r - g) < 45 && Math.abs(g - b) < 55 && r > 85;
}

function isCyanPixel(r, g, b, a) {
  if (a < 180) return false;
  return b > 115 && b > r + 20 && b >= g;
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
  const metalPts = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (isMetalPixel(r, g, b, a) || isCyanPixel(r, g, b, a)) {
        sumX += x;
        sumY += y;
        n++;
        if (isMetalPixel(r, g, b, a)) metalPts.push([x, y]);
      }
    }
  }

  if (!n || metalPts.length < 20) {
    throw new Error("Amblem metal halkası bulunamadı");
  }

  const cx = sumX / n;
  const cy = sumY / n;
  let maxR = 0;
  for (const [x, y] of metalPts) {
    maxR = Math.max(maxR, Math.hypot(x - cx, y - cy));
  }

  // Sadece mühür dairesi — dışındaki mor/indigo halo kesilir
  const keepR = maxR + 1.5;
  let s = Math.ceil(keepR * 2) + 4;
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
  const localCx = cx - left;
  const localCy = cy - top;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const i = (y * cw + x) * 4;
      const dist = Math.hypot(x - localCx, y - localCy);
      if (dist > keepR) {
        d[i + 3] = 0;
        continue;
      }

      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      const lum = (r + g + b) / 3;

      // Daire içinde ama mühür dışı koyu mor/indigo — şeffaf
      const isHalo =
        lum < 70 &&
        b > g + 8 &&
        b > r + 5 &&
        !isMetalPixel(r, g, b, a) &&
        !isCyanPixel(r, g, b, a);

      if (isHalo && dist > keepR * 0.82) {
        d[i + 3] = 0;
      }
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

async function makeFilledIcon(canvasSize, fillRatio, outFile) {
  const badge = await extractBadgeOnly();
  const logoSize = Math.round(canvasSize * fillRatio);

  const resized = await sharp(badge)
    .resize(logoSize, logoSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  // Önce düz zemin
  let canvas = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Son geçiş: kalan indigo pikselleri düz zemine boya
  const px = canvas.data;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;
  const badgeOuter = (logoSize / 2) * 0.98;

  for (let y = 0; y < canvasSize; y++) {
    for (let x = 0; x < canvasSize; x++) {
      const i = (y * canvasSize + x) * 4;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      const lum = (r + g + b) / 3;
      const dist = Math.hypot(x - cx, y - cy);

      // Mühür dışı her şeyi düz zemine çek (mor/indigo hale kalmasın)
      if (dist > badgeOuter + 1) {
        px[i] = BG.r;
        px[i + 1] = BG.g;
        px[i + 2] = BG.b;
        px[i + 3] = 255;
        continue;
      }
      const isIndigo =
        lum < 65 && b >= g + 8 && b >= r + 6 && Math.abs(r - g) < 20;
      if (isIndigo && dist > badgeOuter * 0.88) {
        px[i] = BG.r;
        px[i + 1] = BG.g;
        px[i + 2] = BG.b;
        px[i + 3] = 255;
      }
    }
  }

  await sharp(px, {
    raw: { width: canvasSize, height: canvasSize, channels: 4 },
  })
    .png()
    .toFile(outFile);

  console.log("wrote", path.relative(root, outFile));
}

await makeFilledIcon(192, 0.88, path.join(outDir, "icon-192.png"));
await makeFilledIcon(512, 0.88, path.join(outDir, "icon-512.png"));
await makeFilledIcon(512, 0.72, path.join(outDir, "icon-maskable-512.png"));
await makeFilledIcon(180, 0.88, path.join(root, "public/apple-touch-icon.png"));
await makeFilledIcon(32, 0.9, path.join(root, "public/favicon.png"));

// Next.js app icon
await makeFilledIcon(512, 0.88, path.join(root, "src/app/icon.png"));

console.log("PWA ikonları güncellendi.");
