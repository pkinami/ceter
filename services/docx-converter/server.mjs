import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const port = Number(process.env.PORT || 8080);
const token = process.env.DOCX_CONVERTER_TOKEN;
const maxBytes = Number(process.env.DOCX_CONVERTER_MAX_BYTES || 10 * 1024 * 1024);
const timeoutMs = Number(process.env.DOCX_CONVERTER_TIMEOUT_MS || 45_000);
const maxConcurrent = Number(process.env.DOCX_CONVERTER_MAX_CONCURRENT || 2);
const requiredFonts = (process.env.DOCX_CONVERTER_FONTS || "Arial,Calibri,Courier New,Symbol,Wingdings").split(",").map((value) => value.trim()).filter(Boolean);
let active = 0;

if (!token || token.length < 32) throw new Error("DOCX_CONVERTER_TOKEN must be a random secret of at least 32 characters.");
const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { ...options, windowsHide: true }); let output = "";
  child.stdout.on("data", (data) => { output += data; }); child.stderr.on("data", (data) => { output += data; });
  const timer = setTimeout(() => { child.kill("SIGKILL"); reject(new Error(`${command} timed out`)); }, timeoutMs);
  child.on("error", reject); child.on("close", (code) => { clearTimeout(timer); if (code === 0) resolve(output); else reject(new Error(`${command} exited ${code}: ${output.slice(-500)}`)); });
});
async function assertFonts(fonts) {
  for (const font of fonts) {
    const match = String(await run("fc-match", ["--format=%{family}", font])).split(",").map((value) => value.trim().toLowerCase());
    if (!match.includes(font.toLowerCase())) throw new Error(`Required font is unavailable: ${font}`);
  }
}
function authorized(request) {
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, "") || "";
  return supplied.length === token.length && timingSafeEqual(Buffer.from(supplied), Buffer.from(token));
}
function send(response, status, body, headers = {}) { response.writeHead(status, { "cache-control": "no-store", ...headers }); response.end(body); }

await assertFonts(requiredFonts);
createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/healthz") return send(response, 200, JSON.stringify({ ok: true, fonts: requiredFonts }), { "content-type": "application/json" });
  if (request.method !== "POST" || request.url !== "/convert") return send(response, 404, "Not found");
  if (!authorized(request)) return send(response, 401, "Unauthorized");
  if (request.headers["content-type"]?.split(";")[0] !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return send(response, 415, "Expected DOCX content type");
  if (active >= maxConcurrent) return send(response, 429, "Converter is busy", { "retry-after": "2" });
  active++;
  let directory;
  try {
    const chunks = []; let bytes = 0;
    for await (const chunk of request) { bytes += chunk.length; if (bytes > maxBytes) throw Object.assign(new Error("DOCX exceeds request limit"), { status: 413 }); chunks.push(chunk); }
    const requested = String(request.headers["x-docx-required-fonts"] || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (requested.some((font) => !requiredFonts.some((available) => available.toLowerCase() === font.toLowerCase()))) throw Object.assign(new Error("Requested template fonts are not provisioned"), { status: 422 });
    directory = await mkdtemp(join(tmpdir(), "ceter-docx-"));
    const input = join(directory, "input.docx"); await writeFile(input, Buffer.concat(chunks), { mode: 0o600 });
    await run("soffice", ["--headless", "--nologo", "--nodefault", "--nolockcheck", `-env:UserInstallation=file://${join(directory, "lo-profile")}`, "--convert-to", "pdf:writer_pdf_Export", "--outdir", directory, input]);
    const output = join(directory, "input.pdf"); const pdf = await readFile(output);
    if (!pdf.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("LibreOffice did not produce a PDF");
    const pdfFonts = String(await run("pdffonts", [output])).toLowerCase();
    for (const font of requested) if (!pdfFonts.includes(font.toLowerCase())) throw new Error(`PDF does not embed template font: ${font}`);
    send(response, 200, pdf, { "content-type": "application/pdf", "content-length": String(pdf.length), "x-docx-converter-fonts": requiredFonts.join(","), "x-request-id": String(request.headers["x-request-id"] || "") });
  } catch (error) { send(response, error.status || 500, error.message || "Conversion failed"); }
  finally { active--; if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined); }
}).listen(port, "0.0.0.0", () => console.log(`Ceter DOCX converter listening on ${port}`));
