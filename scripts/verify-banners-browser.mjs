import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import WebSocket from "ws";

const root = process.cwd();
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 3020 + Math.floor(Math.random() * 1000);
const debugPort = 9229 + Math.floor(Math.random() * 1000);
const chromeProfileDir = path.join(root, ".tmp", `banner-chrome-${process.pid}`);
const baseUrl = `http://127.0.0.1:${port}`;
const routes = ["/", "/category", "/category/multifunction-printers", "/category/photocopiers", "/category/toners-and-ink"];
const widths = [375, 834, 1440];

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", String(port)], {
  cwd: process.cwd(),
  stdio: "ignore"
});

let chrome;
try {
  fs.mkdirSync(chromeProfileDir, { recursive: true });
  await waitForHttp(`${baseUrl}/`, 60000);
  chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--user-data-dir=${chromeProfileDir}`,
    "--remote-allow-origins=*",
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${debugPort}`,
    "about:blank"
  ], { stdio: "ignore" });
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`, 30000);

  for (const width of widths) {
    for (const route of routes) {
      console.log(`Inspecting ${route} at ${width}px`);
      const result = await inspectPage(`${baseUrl}${route}`, width);
      console.log(`${route} ${width}px ${result.map((item) => `${item.shape}:${item.complete ? "complete" : "pending"}:${item.width}`).join(",") || "no-banner"} ${result.map((item) => item.currentSrc).join(" | ")}`);
    }
  }
} finally {
  if (chrome) chrome.kill();
  server.kill();
  fs.rmSync(chromeProfileDir, { recursive: true, force: true });
}

async function inspectPage(url, width) {
  const tab = await json(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let nextId = 1;
  const pending = new Map();
  ws.on("message", (raw) => {
    const message = JSON.parse(String(raw));
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out opening DevTools websocket for ${url}`)), 10000);
    ws.once("open", () => {
      clearTimeout(timeout);
      resolve();
    });
    ws.once("error", reject);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = nextId++;
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timed out waiting for ${method} on ${url}`));
    }, 15000);
    pending.set(id, (message) => {
      clearTimeout(timeout);
      resolve(message);
    });
    ws.send(JSON.stringify({ id, method, params }));
  });
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1200, deviceScaleFactor: 1, mobile: width < 768 });
  await send("Page.navigate", { url });
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `new Promise((resolve) => {
      if (document.readyState === 'complete') resolve(true);
      else window.addEventListener('load', () => resolve(true), { once: true });
      setTimeout(() => resolve(false), 8000);
    })`
  });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const evaluated = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `Array.from(document.querySelectorAll('picture img')).map((img) => ({ currentSrc: img.currentSrc, complete: img.complete, width: img.naturalWidth, shape: (img.currentSrc.match(/-(wide|mid|tall)-/) || [,'unknown'])[1] }))`
  });
  ws.close();
  await json(`http://127.0.0.1:${debugPort}/json/close/${tab.id}`).catch(() => null);
  return evaluated.result.result.value;
}

function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) resolve();
        else retry();
      }).on("error", retry);
    };
    const retry = () => {
      if (Date.now() - start > timeoutMs) reject(new Error(`Timed out waiting for ${url}`));
      else setTimeout(attempt, 500);
    };
    attempt();
  });
}

function json(url, options = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: options.method ?? "GET" }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => {
        clearTimeout(timeout);
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    const timeout = setTimeout(() => {
      request.destroy(new Error(`Timed out requesting ${url}`));
    }, options.timeoutMs ?? 10000);
    request.end();
  });
}
