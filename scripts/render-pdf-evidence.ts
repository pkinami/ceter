import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const documents = [
  ["Ceter_Combined_Quotation.pdf", "reference.png"],
  ["public/templates/ceter-quotation-visual-template.pdf", "blank-template.png"],
  ["document-verification/quotation.pdf", "quotation.png"],
  ["document-verification/invoice-with-lpo.pdf", "invoice-with-lpo.png"],
  ["document-verification/invoice-without-lpo.pdf", "invoice-without-lpo.png"],
  ["document-verification/receipt.pdf", "receipt.png"],
  ["document-verification/delivery-note.pdf", "delivery-note.png"],
  ["document-verification/customer-statement.pdf", "customer-statement.png"],
  ["document-verification/purchase-order.pdf", "purchase-order.png"]
] as const;

async function main() {
  const outputDirectory = "C:/ceter/document-verification/renders";
  mkdirSync(outputDirectory, { recursive: true });
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15_000 });
  try {
    const context = browser.contexts()[0];
    for (const [file, output] of documents) {
      const page = await context.newPage();
      await page.goto(pathToFileURL(resolve(file)).href, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1_500);
      await page.getByRole("button", { name: "Got it" }).click({ timeout: 1_000 }).catch(() => undefined);
      await page.screenshot({ path: `${outputDirectory}/${output}`, fullPage: true });
      await page.mouse.wheel(0, 2_000);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${outputDirectory}/${output.replace(".png", "-closing.png")}`, fullPage: true });
      console.log(`${file} -> ${output}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
