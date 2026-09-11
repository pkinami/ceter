import { join } from "node:path";
import sharp from "sharp";

const dir = join(process.cwd(), "document-verification/renders");
const reference = join(dir, "reference.png");
const generated = join(dir, "quotation.png");

async function main() {
  const a = sharp(reference); const b = sharp(generated);
  const [am, bm] = await Promise.all([a.metadata(), b.metadata()]);
  const width = Math.min(am.width!, bm.width!); const height = Math.min(am.height!, bm.height!);
  const left = await a.resize(width, height, { fit: "fill" }).png().toBuffer();
  const right = await b.resize(width, height, { fit: "fill" }).png().toBuffer();
  await sharp({ create: { width: width * 2, height, channels: 4, background: "white" } })
    .composite([{ input: left, left: 0, top: 0 }, { input: right, left: width, top: 0 }])
    .png().toFile(join(dir, "reference-vs-generated-side-by-side.png"));
  await sharp(left).composite([{ input: right, blend: "difference" }])
    .png().toFile(join(dir, "reference-vs-generated-overlay.png"));
}
main().catch((error) => { console.error(error); process.exit(1); });
