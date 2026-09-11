// Direct-page CDP downloader. It avoids Playwright's browser-wide attachment
// when Chrome exposes non-page UI targets, while retaining the customer's
// authenticated browser context and the portal's normal download endpoint.
import { mkdirSync, writeFileSync } from "node:fs";

const [number, output] = process.argv.slice(2);
if (!number || !output) throw new Error("Usage: node scripts/download-live-portal-document-cdp.mjs <number> <output>");

const targets = await (await fetch("http://127.0.0.1:9223/json/list")).json();
const target = targets.find((item) => item.type === "page" && item.url.includes("/account"));
if (!target?.webSocketDebuggerUrl) throw new Error("Authenticated customer account page is unavailable from CDP.");
const socket = new WebSocket(target.webSocketDebuggerUrl);
const result = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error("Customer CDP download timed out.")), 30_000);
  socket.onopen = () => socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { awaitPromise: true, returnByValue: true, expression: `fetch(location.href).then((response) => response.text()).then((html) => { const document = new DOMParser().parseFromString(html, 'text/html'); const link = [...document.querySelectorAll('a')].find((a) => a.textContent?.includes('Download PDF') && a.closest('tr')?.textContent?.includes(${JSON.stringify(number)})); if (!link) throw new Error('Customer portal has no download link for ${number}'); return fetch(new URL(link.getAttribute('href'), location.href)).then(async (response) => { const bytes = new Uint8Array(await response.arrayBuffer()); let binary = ''; for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return { status: response.status, base64: btoa(binary) }; }); })` } }));
  socket.onmessage = (event) => { const message = JSON.parse(event.data); if (message.id !== 1) return; clearTimeout(timeout); socket.close(); if (message.error || message.result?.exceptionDetails) reject(new Error(message.error?.message || message.result.exceptionDetails.text)); else resolve(message.result.result.value); };
  socket.onerror = () => reject(new Error("Customer CDP socket failed."));
});
if (result.status !== 200) throw new Error(`${number} download returned HTTP ${result.status}.`);
const bytes = Buffer.from(result.base64, "base64");
if (!bytes.subarray(0, 4).equals(Buffer.from("%PDF"))) throw new Error(`${number} did not return a PDF.`);
mkdirSync("C:/ceter/document-verification/live", { recursive: true });
writeFileSync(`C:/ceter/document-verification/live/${output}`, bytes);
console.log(`${number}: ${bytes.length} bytes -> C:/ceter/document-verification/live/${output}`);
