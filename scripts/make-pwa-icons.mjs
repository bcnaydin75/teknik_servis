#!/usr/bin/env node
/**
 * PWA ikonları — sadece ortalanmış yuvarlak amblem (ikonu doldurur).
 * Kullanım: node scripts/make-pwa-icons.mjs
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

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>
    </svg>`
  );
}

/** Kaynakta kaymış amblemi metalik/cyan piksellerden bulup ortala */
async function extractCenteredBadge() {
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
        a > 200 && lum > 100 && Math.abs(r - g) < 40 && Math.abs(g - b) < 50;
      const isCyan = a > 200 && b > 100 && b > r + 15;
      if (isMetal || isCyan) {
        sumX += x;
        sumY += y;
        n++;
        pts.push([x, y]);
      }
    }
  }

  if (n < 100) {
    // fallback: kare ortala
    const side = Math.min(w, h);
    return sharp(srcPath)
      .extract({
        left: Math.floor((w - side) / 2),
        top: Math.floor((h - side) / 2),
        width: side,
        height: side,
      })
      .ensureAlpha()
      .png()
      .toBuffer();
  }

  const cx = sumX / n;
  const cy = sumY / n;
  let maxR = 0;
  for (const [x, y] of pts) {
    maxR = Math.max(maxR, Math.hypot(x - cx, y - cy));
  }

  const pad = 8;
  let s = Math.ceil(maxR * 2) + pad * 2;
  s = Math.min(s, w, h);
  let left = Math.round(cx - s / 2);
  let top = Math.round(cy - s / 2);
  left = Math.max(0, Math.min(w - s, left));
  top = Math.max(0, Math.min(h - s, top));
  const finalS = Math.min(s, w - left, h - top);

  return sharp(srcPath)
    .extract({ left, top, width: finalS, height: finalS })
    .ensureAlpha()
    .png()
    .toBuffer();
}

async function makeIcon(canvasSize, fillRatio, outFile) {
  const badge = await extractCenteredBadge();
  const logoSize = Math.round(canvasSize * fillRatio);

  const resized = await sharp(badge)
    .resize(logoSize, logoSize, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  const circular = await sharp(resized)
    .composite([{ input: circleMask(logoSize), blend: "dest-in" }])
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
    .composite([{ input: circular, gravity: "centre" }])
    .png()
    .toFile(outFile);

  console.log("wrote", path.relative(root, outFile));
}

await makeIcon(192, 1, path.join(outDir, "icon-192.png"));
await makeIcon(512, 1, path.join(outDir, "icon-512.png"));
await makeIcon(512, 0.92, path.join(outDir, "icon-maskable-512.png"));
await makeIcon(180, 1, path.join(root, "public/apple-touch-icon.png"));
await makeIcon(32, 1, path.join(root, "public/favicon.png"));

const preview = path.join(outDir, "_badge-preview.png");
if (fs.existsSync(preview)) fs.unlinkSync(preview);

console.log("PWA ikonları güncellendi (sadece yuvarlak amblem).");
