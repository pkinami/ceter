import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9223", { timeout: 15_000 });
  try {
    const context = browser.contexts()[0];
    for (const [pdf, png] of [["Ceter_Combined_Quotation.pdf", "reference.png"], ["public/templates/ceter-quotation-visual-template.pdf", "blank-template.png"], ["document-verification/quotation.pdf", "quotation.png"]]) {
      const page = await context.newPage();
      await page.goto(pathToFileURL(resolve(pdf)).href, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(750);
      await page.getByRole("button", { name: "Got it" }).click({ timeout: 300 }).catch(() => undefined);
      await page.screenshot({ path: resolve("document-verification/renders", png), fullPage: true });
      await page.close();
    }
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exit(1); });
