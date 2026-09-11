import { randomUUID } from "node:crypto";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";
// Extracted from the supplied Word master. These are intentionally not
// substitutes: the converter health check and each response must prove them.
const TEMPLATE_FONTS = ["Arial", "Calibri", "Courier New", "Symbol", "Wingdings"];
const MAX_DOCX_BYTES = 10 * 1024 * 1024;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = Number(process.env.DOCX_CONVERTER_TIMEOUT_MS || 45_000);

function converterError(status: number, body: string) {
  const detail = body.replace(/[\r\n]+/g, " ").slice(0, 240).trim();
  return new Error(`DOCX conversion failed (${status})${detail ? `: ${detail}` : "."}`);
}

/** Converts only through the configured private LibreOffice service. */
export async function convertDocxToPdf(docx: Buffer, requiredFonts = TEMPLATE_FONTS): Promise<Buffer> {
  const endpoint = process.env.DOCX_CONVERTER_URL;
  const token = process.env.DOCX_CONVERTER_TOKEN;
  if (!endpoint || !token) throw new Error("DOCX conversion is not configured. A private Ceter LibreOffice service is required.");
  if (!/^https:\/\//i.test(endpoint)) throw new Error("DOCX conversion endpoint must use HTTPS.");
  if (docx.length === 0 || docx.length > MAX_DOCX_BYTES) throw new Error("DOCX conversion input exceeds the 10 MB limit.");

  const requestId = randomUUID();
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": DOCX_MIME,
          authorization: `Bearer ${token}`,
          "x-request-id": requestId,
          "x-docx-required-fonts": requiredFonts.join(",")
        },
        body: new Uint8Array(docx),
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) {
        if (attempt === 0 && response.status >= 500) continue;
        throw converterError(response.status, await response.text());
      }
      if (!response.headers.get("content-type")?.toLowerCase().includes(PDF_MIME)) throw new Error("DOCX converter returned a non-PDF response.");
      const length = Number(response.headers.get("content-length") || 0);
      if (length > MAX_PDF_BYTES) throw new Error("DOCX converter returned an oversized PDF.");
      const pdf = Buffer.from(await response.arrayBuffer());
      if (pdf.length < 5 || pdf.length > MAX_PDF_BYTES || !pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("DOCX converter returned an invalid PDF.");
      const available = (response.headers.get("x-docx-converter-fonts") || "").split(",").map((font) => font.trim().toLowerCase()).filter(Boolean);
      const missing = requiredFonts.filter((font) => !available.includes(font.toLowerCase()));
      if (missing.length) throw new Error(`DOCX converter did not verify required template fonts: ${missing.join(", ")}.`);
      return pdf;
    } catch (error) {
      if (attempt === 0 && (error instanceof DOMException && error.name === "AbortError")) continue;
      if (error instanceof DOMException && error.name === "AbortError") throw new Error(`DOCX conversion timed out after ${REQUEST_TIMEOUT_MS} ms.`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("DOCX conversion failed after retrying the private service.");
}
