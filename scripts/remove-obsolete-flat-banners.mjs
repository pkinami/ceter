import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "public", "banners");
const obsolete = [
  "category-photocopiers-desktop.webp",
  "category-photocopiers-mobile.webp",
  "category-printers-desktop.webp",
  "category-printers-mobile.webp",
  "category-toners-desktop.webp",
  "category-toners-mobile.webp",
  "hero-business-it-support-desktop.webp",
  "hero-business-it-support-mobile.webp",
  "hero-office-printer-desktop.webp",
  "hero-office-printer-mobile.webp",
  "hero-toners-consumables-desktop.webp",
  "hero-toners-consumables-mobile.webp",
  "services-cctv-desktop.webp",
  "services-cctv-mobile.webp",
  "services-maintenance-support-desktop.webp",
  "services-maintenance-support-mobile.webp",
  "services-networking-desktop.webp",
  "services-networking-mobile.webp"
];

for (const file of obsolete) {
  const target = path.join(root, file);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
