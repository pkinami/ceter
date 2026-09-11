import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { PDFDocument } from "pdf-lib";
import { readFileSync, readdirSync } from "node:fs";
import { chromium } from "playwright";

async function main() {
  const source = resolve("document-verification/docx-converter");
  const renders = resolve(source, "renders"); await mkdir(renders, { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15_000 });
  try {
    const context = browser.contexts()[0];
    for (const file of readdirSync(source).filter((entry) => entry.endsWith(".pdf"))) {
      const pages = (await PDFDocument.load(readFileSync(resolve(source, file)))).getPageCount();
      for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
        const page = await context.newPage();
        await page.setViewportSize({ width: 1280, height: 1500 });
        await page.goto(`${pathToFileURL(resolve(source, file)).href}#page=${pageNumber}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(800);
        await page.screenshot({ path: resolve(renders, `${file.replace(/\.pdf$/, "")}-page-${pageNumber}.png`) });
        await page.close();
      }
    }
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
