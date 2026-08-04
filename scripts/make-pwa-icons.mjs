#!/usr/bin/env node
/**
 * Temiz PWA ikonları — brand-logo'yu daire maskeleyip düz slate zemine yerleştirir.
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

const BG = { r: 15, g: 23, b: 42, alpha: 1 }; // #0f172a

function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>
    </svg>`
  );
}

/** Logo'yu kareye sığdır, daireye kes, düz zemine oturt */
async function makeIcon(canvasSize, logoRatio, outFile) {
  const logoSize = Math.round(canvasSize * logoRatio);

  const squareLogo = await sharp(srcPath)
    .resize(logoSize, logoSize, {
      fit: "cover",
      position: "centre",
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const circular = await sharp(squareLogo)
    .composite([
      {
        input: circleMask(logoSize),
        blend: "dest-in",
      },
    ])
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
    .composite([{ input: circular, gravity: "centre" }])
    .png()
    .toFile(outFile);

  console.log("wrote", path.relative(root, outFile));
}

await makeIcon(192, 0.92, path.join(outDir, "icon-192.png"));
await makeIcon(512, 0.92, path.join(outDir, "icon-512.png"));
await makeIcon(512, 0.72, path.join(outDir, "icon-maskable-512.png"));
await makeIcon(180, 0.92, path.join(root, "public/apple-touch-icon.png"));
await makeIcon(32, 0.94, path.join(root, "public/favicon.png"));

console.log("PWA ikonları güncellendi.");
