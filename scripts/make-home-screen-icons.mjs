import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "public/admin-logo.png");

function isBackground(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max < 50) return true;
  if (r < 55 && g < 60 && b < 95 && max - min < 40) return true;
  return false;
}

function floodFillBackground(pixels, width, height) {
  const visited = new Uint8Array(width * height);
  const queue = [];

  for (let x = 0; x < width; x++) {
    queue.push(x, 0, x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(0, y, width - 1, y);
  }

  while (queue.length) {
    const y = queue.pop();
    const x = queue.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;

    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;

    const i = idx * 4;
    if (!isBackground(pixels[i], pixels[i + 1], pixels[i + 2])) continue;

    pixels[i + 3] = 0;
    queue.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
}

function circleMaskSvg(size, radiusRatio = 0.485) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * radiusRatio;
  return Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="white"/>
    </svg>`
  );
}

async function makeCircularIcon(input, output, size) {
  const workSize = Math.max(size, 512);
  const { data, info } = await sharp(input)
    .resize(workSize, workSize, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.from(data);
  floodFillBackground(pixels, info.width, info.height);

  const cleaned = await sharp(pixels, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(cleaned)
    .composite([{ input: circleMaskSvg(size), blend: "dest-in" }])
    .png()
    .toFile(output);
}

const outputs = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-maskable-512.png", 512],
  ["public/apple-touch-icon.png", 180],
  ["src/app/apple-icon.png", 180],
  ["src/app/icon.png", 48],
];

for (const [rel, size] of outputs) {
  await makeCircularIcon(src, path.join(root, rel), size);
}

console.log("Circular transparent home screen icons generated.");
