#!/usr/bin/env node
/**
 * PWA ikonları — brand-logo.png tam kare ikon olarak yeniden boyutlanır.
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

async function makeIcon(size, outFile, { padRatio = 0 } = {}) {
  if (padRatio <= 0) {
    await sharp(srcPath)
      .resize(size, size, { fit: "cover", position: "centre" })
      .png()
      .toFile(outFile);
  } else {
    const inner = Math.round(size * (1 - padRatio));
    const resized = await sharp(srcPath)
      .resize(inner, inner, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    // Maskable safe zone: kenardan padding, arka plan köşeden örneklenir
    const { data, info } = await sharp(srcPath)
      .resize(8, 8, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const bg = { r: data[0], g: data[1], b: data[2], alpha: 255 };
    await sharp({
      create: { width: size, height: size, channels: 4, background: bg },
    })
      .composite([{ input: resized, gravity: "centre" }])
      .png()
      .toFile(outFile);
  }
  console.log("wrote", path.relative(root, outFile));
}

await makeIcon(192, path.join(outDir, "icon-192.png"));
await makeIcon(512, path.join(outDir, "icon-512.png"));
await makeIcon(512, path.join(outDir, "icon-maskable-512.png"), { padRatio: 0.1 });
await makeIcon(180, path.join(root, "public/apple-touch-icon.png"));
await makeIcon(32, path.join(root, "public/favicon.png"));
await makeIcon(512, path.join(root, "src/app/icon.png"));

console.log("PWA ikonları güncellendi.");
