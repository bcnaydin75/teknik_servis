#!/usr/bin/env node
/**
 * PWA ikonları — kullanıcı örneğindeki gibi amblem;
 * dış zemin amblemin içi gibi koyu (mor/beyaz yok), kareyi tamamen kaplar.
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

/** Amblem içi gibi koyu lacivert-siyah (mor değil) */
const BG = { r: 8, g: 10, b: 22, alpha: 1 };

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

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = (r + g + b) / 3;
    const isCyan = b > 90 && b >= r;
    const isMetal = lum > 80 && Math.abs(r - g) < 50 && r > 65;
    const isBlueText = b > 50 && b >= g && b >= r - 10 && lum > 35 && lum < 160;
    // Mor / koyu zemin / parıltı — hepsi şeffaf; sadece amblem kalsın
    if (!isCyan && !isMetal && !isBlueText) {
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

  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(outFile);

  console.log("wrote", path.relative(root, outFile));
}

await makeFilledIcon(192, 0.92, path.join(outDir, "icon-192.png"));
await makeFilledIcon(512, 0.92, path.join(outDir, "icon-512.png"));
await makeFilledIcon(512, 0.75, path.join(outDir, "icon-maskable-512.png"));
await makeFilledIcon(180, 0.92, path.join(root, "public/apple-touch-icon.png"));
await makeFilledIcon(32, 0.94, path.join(root, "public/favicon.png"));

console.log("PWA ikonları güncellendi.");
