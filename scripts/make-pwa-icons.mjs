#!/usr/bin/env node
/**
 * PWA ikonları — sadece yuvarlak amblem, ikonu doldurur (kenar boşluğu yok).
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

/**
 * Amblemi kareye cover ile sığdırıp daireye keser.
 * ratio=1 → tam doldurur (any ikon).
 * ratio<1 → maskable güvenli alan için hafif içe alır.
 */
async function makeIcon(canvasSize, fillRatio, outFile) {
  const logoSize = Math.round(canvasSize * fillRatio);

  const squareLogo = await sharp(srcPath)
    .resize(logoSize, logoSize, {
      fit: "cover",
      position: "centre",
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const circular = await sharp(squareLogo)
    .composite([{ input: circleMask(logoSize), blend: "dest-in" }])
    .png()
    .toBuffer();

  // Şeffaf kare canvas — Android/iOS köşeleri kendisi yuvarlar;
  // ortada sadece dolu yuvarlak amblem kalır.
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

// any: yuvarlak ikonu tamamen doldursun
await makeIcon(192, 1, path.join(outDir, "icon-192.png"));
await makeIcon(512, 1, path.join(outDir, "icon-512.png"));
// maskable: OS maskesi için ~10% iç boşluk
await makeIcon(512, 0.9, path.join(outDir, "icon-maskable-512.png"));
await makeIcon(180, 1, path.join(root, "public/apple-touch-icon.png"));
await makeIcon(32, 1, path.join(root, "public/favicon.png"));

console.log("PWA ikonları güncellendi (sadece yuvarlak).");
