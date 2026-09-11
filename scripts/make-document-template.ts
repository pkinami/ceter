/**
 * Creates permanent PDF artwork from a preparation copy of the actual Word
 * master. This runs at release time only; production never invokes Word,
 * LibreOffice, or a conversion service.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { PDFDocument, rgb } from "pdf-lib";

const root = process.cwd();
const preparation = join(root, "document-verification", "preparation");
const master = join(root, "Ceter_Combined_Quotation.docx");
const prepared = join(preparation, "Ceter_Combined_Quotation.prepared.docx");
const exported = join(preparation, "Ceter_Combined_Quotation.prepared.pdf");
const firstArt = join(root, "public", "templates", "ceter-quotation-first-page-art.pdf");
const continuationArt = join(root, "public", "templates", "ceter-quotation-continuation-art.pdf");

function runPowerShell(script: string) {
  const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Word preparation export failed.");
}

async function main() {
  if (!existsSync(master)) throw new Error("Ceter_Combined_Quotation.docx is required to create permanent artwork.");
  mkdirSync(preparation, { recursive: true }); mkdirSync(join(root, "public", "templates"), { recursive: true });
  // White glyphs preserve every paragraph/table measurement in the original
  // master while removing the filled sample's variable values before export.
  const ps = `& '${join(root, "scripts", "prepare-word-master.ps1")}' -Master '${master}' -Prepared '${prepared}' -Pdf '${exported}'`;
  runPowerShell(ps);
  const source = await PDFDocument.load(readFileSync(exported));
  if (source.getPageCount() !== 1) throw new Error("The Word master preparation export must be one Letter page.");
  const art = await PDFDocument.create(); const [page] = await art.copyPages(source, [0]); art.addPage(page);
  // Bottom-left PDF coordinates. These envelopes contain only dynamic values;
  // the original Word header and logo remain untouched.
  for (const [x, y, width, height] of [[398, 568, 164, 38], [50, 482, 512, 80], [48, 42, 514, 447], [0, 0, 612, 43]] as const) page.drawRectangle({ x, y, width, height, color: rgb(1, 1, 1) });
  writeFileSync(firstArt, await art.save());
  const continuation = await PDFDocument.create(); continuation.addPage([612, 792]).drawRectangle({ x: 0, y: 0, width: .01, height: .01, color: rgb(1, 1, 1), opacity: 0 });
  writeFileSync(continuationArt, await continuation.save());
  console.log(`Prepared copy: ${prepared}\nNative Word export: ${exported}\nArtwork: ${firstArt}\n${continuationArt}`);
}
main().catch((error) => { console.error(error); process.exit(1); });
