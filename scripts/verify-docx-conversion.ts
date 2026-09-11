import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { populateQuotationDocx, type WordQuotationInput } from "../lib/business/word-template";

const output = join(process.cwd(), "document-verification", "docx-converter");
const soffice = process.env.SOFFICE_PATH || "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
const run = (command: string, args: string[]) => new Promise<void>((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true }); let messages = "";
  child.stdout.on("data", (data) => { messages += data; }); child.stderr.on("data", (data) => { messages += data; });
  child.on("error", reject); child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${messages}`)));
});
async function assertTemplateFonts(docx: Buffer) {
  const zip = await JSZip.loadAsync(docx); const xml = await zip.file("word/document.xml")!.async("string");
  const fonts = [...new Set([...xml.matchAll(/w:(?:ascii|hAnsi|eastAsia|cs)="([^"]+)"/g)].map((match) => match[1]))];
  const windowsFiles: Record<string, string> = { Arial: "arial.ttf", Calibri: "calibri.ttf", "Courier New": "cour.ttf", Symbol: "symbol.ttf", Wingdings: "wingding.ttf" };
  for (const font of fonts) {
    const file = windowsFiles[font];
    if (file && !existsSync(join(process.env.WINDIR || "C:\\Windows", "Fonts", file))) throw new Error(`Template font is not installed locally: ${font}`);
  }
  return fonts;
}
async function convert(name: string, input: WordQuotationInput) {
  const docx = await populateQuotationDocx(input); await assertTemplateFonts(docx);
  const docxPath = join(output, `${name}.docx`); await writeFile(docxPath, docx);
  if (!existsSync(soffice)) { console.log(`${name}: DOCX created; LibreOffice is not installed yet.`); return; }
  await run(soffice, ["--headless", "--convert-to", "pdf:writer_pdf_Export", "--outdir", output, docxPath]);
  const pdfPath = join(output, `${name}.pdf`); const pdf = await PDFDocument.load(await readFile(pdfPath));
  if (!pdf.getPageCount()) throw new Error(`${name} has no pages`);
  console.log(`${name}: ${pdf.getPageCount()} page(s), ${pdfPath}`);
}
async function main() {
  await mkdir(output, { recursive: true });
  const only = process.env.DOCX_VERIFY_CASE;
  const verify = async (name: string, input: WordQuotationInput) => { if (!only || only === name) await convert(name, input); };
  const base = { number: "QTN-DOCX-VERIFY-001", issueDate: "11/09/2026", validUntil: "11/10/2026", customerName: "Ceter conversion verification", customerAddress: "Nairobi, Kenya", totals: [["Subtotal", "KES 1,000.00"], ["Discount", "KES 0.00"], ["VAT", "KES 160.00"], ["Total Due", "KES 1,160.00"]] as Array<[string, string]> };
  await verify("one-item", { ...base, lines: [{ description: "One verified item", quantity: 1, unitPrice: "KES 1,000.00", total: "KES 1,160.00" }] });
  await verify("multiple-items", { ...base, number: "QTN-DOCX-VERIFY-002", lines: Array.from({ length: 5 }, (_, index) => ({ description: `Verified item ${index + 1}`, quantity: index + 1, unitPrice: "KES 1,000.00", total: "KES 1,160.00" })) });
  await verify("long-description", { ...base, number: "QTN-DOCX-VERIFY-003", lines: [{ description: "Long quotation line description that must retain the Word master cell formatting while wrapping naturally without inserting space before the subtotal row", quantity: 1, unitPrice: "KES 1,000.00", total: "KES 1,160.00" }] });
  await verify("multipage", { ...base, number: "QTN-DOCX-VERIFY-004", lines: Array.from({ length: 24 }, (_, index) => ({ description: `Multipage conversion item ${index + 1}`, quantity: 1, unitPrice: "KES 1,000.00", total: "KES 1,160.00" })) });
}
main().catch((error) => { console.error(error); process.exit(1); });
