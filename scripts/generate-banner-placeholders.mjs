import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const specs = {
  hero: {
    tall: [[720, 900], [1080, 1350], [1440, 1800]],
    mid: [[1024, 576], [1280, 720], [1600, 900]],
    wide: [[1280, 480], [1920, 720], [2560, 960]]
  },
  category: {
    tall: [[720, 400], [1080, 600]],
    mid: [[1024, 439], [1280, 549]],
    wide: [[1280, 360], [1600, 450], [2400, 675]]
  },
  services: {
    tall: [[720, 432], [1080, 648]],
    mid: [[1024, 512], [1280, 640]],
    wide: [[1280, 400], [1600, 500], [2400, 750]]
  }
};

const slugs = {
  hero: ["office-printer", "toners-consumables", "business-it-support"],
  category: ["printers", "photocopiers", "toners"],
  services: ["cctv", "networking", "maintenance-support"]
};

const colors = {
  hero: ["#0B1E39", "#14B8A6"],
  category: ["#334155", "#14B8A6"],
  services: ["#0B1E39", "#D97706"]
};

const root = path.join(process.cwd(), "public", "banners");

for (const group of Object.keys(specs)) {
  fs.mkdirSync(path.join(root, group), { recursive: true });
}

for (const [group, shapes] of Object.entries(specs)) {
  for (const slug of slugs[group]) {
    for (const [shape, sizes] of Object.entries(shapes)) {
      for (const [width, height] of sizes) {
        const file = path.join(root, group, `${slug}-${shape}-${width}.webp`);
        await sharp(Buffer.from(svg({ group, slug, shape, width, height }))).webp({ quality: 82 }).toFile(file);
      }
    }
  }
}

function svg({ group, slug, shape, width, height }) {
  const [start, end] = colors[group];
  const title = `${group}/${slug}`;
  const titleSize = Math.max(28, Math.round(width / 34));
  const metaSize = Math.max(18, Math.round(width / 58));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${start}"/>
      <stop offset="1" stop-color="${end}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g)"/>
  <rect x="${Math.round(width * 0.56)}" y="0" width="${Math.round(width * 0.44)}" height="${height}" fill="#F7F8FA" opacity="0.16"/>
  <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.45)}" r="${Math.round(Math.min(width, height) * 0.18)}" fill="#ffffff" opacity="0.15"/>
  <rect x="${Math.round(width * 0.64)}" y="${Math.round(height * 0.56)}" width="${Math.round(width * 0.22)}" height="${Math.round(height * 0.12)}" rx="8" fill="#ffffff" opacity="0.18"/>
  <text x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.52)}" fill="#ffffff" font-family="Arial, sans-serif" font-size="${titleSize}" font-weight="700">${title}</text>
  <text x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.62)}" fill="#E2E8F0" font-family="Arial, sans-serif" font-size="${metaSize}">${shape} ${width}x${height} placeholder</text>
</svg>`;
}
