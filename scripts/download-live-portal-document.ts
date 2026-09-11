import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const [documentNumber, outputName] = process.argv.slice(2);

if (!documentNumber || !outputName) {
  throw new Error("Usage: tsx scripts/download-live-portal-document.ts <document-number> <output-name>");
}

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15_000 });
  try {
    const page = browser.contexts()[0].pages().find((item) => item.url().includes("/account"));
    if (!page) throw new Error("The authenticated customer portal page is unavailable.");
    await page.reload({ waitUntil: "domcontentloaded" });
    const row = page.locator("tr", { hasText: documentNumber }).first();
    const href = await row.getByRole("link", { name: "Download PDF" }).getAttribute("href");
    if (!href) throw new Error(`${documentNumber} has no customer download link.`);
    const response = await page.request.get(href);
    if (!response.ok()) throw new Error(`${documentNumber} download returned HTTP ${response.status()}.`);
    const bytes = await response.body();
    if (bytes.subarray(0, 4).toString("ascii") !== "%PDF") throw new Error(`${documentNumber} did not return a PDF.`);
    const directory = "C:/ceter/document-verification/live";
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${directory}/${outputName}`, bytes);
    console.log(`${documentNumber}: ${bytes.length} bytes -> ${directory}/${outputName}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
