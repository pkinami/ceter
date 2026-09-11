import dns from "node:dns/promises";
import net from "node:net";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { productImagesBucket } from "@/lib/product-image-urls";
import { safePathSegment, validateImageBytes } from "@/lib/image-validation";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 4;
const ALLOWED_PORTS = new Set(["", "443", "80"]);

export type StoredProductImage = {
  sourceUrl: string;
  storedUrl: string;
  path: string;
  sha256: string;
  skipped: boolean;
};

export function storagePathForProductImage(input: { slug: string; sku?: string | null; sourceUrl?: string; index?: number; sha256?: string; extension?: string; contentType?: string | null }) {
  const digest = input.sha256 ?? "pending";
  const extension = input.extension && /^[a-z0-9]{2,5}$/.test(input.extension) ? input.extension : "webp";
  return `products/${safePathSegment(input.slug)}/${digest}.${extension}`;
}

export async function storeProductImage(input: {
  slug: string;
  sku?: string | null;
  sourceUrl: string;
  index: number;
  currentImages?: string[];
}): Promise<StoredProductImage> {
  const downloaded = await downloadProductImage(input.sourceUrl);
  const path = storagePathForProductImage({ slug: input.slug, sha256: downloaded.sha256, extension: downloaded.extension });
  const existing = input.currentImages?.find((image) => image.includes(path));
  if (existing) return { sourceUrl: input.sourceUrl, storedUrl: existing, path, sha256: downloaded.sha256, skipped: true };

  const supabase = createServiceRoleClient();
  const bucket = productImagesBucket();
  const alreadyStored = await objectExists(supabase, bucket, path);
  if (!alreadyStored) {
    const { error } = await supabase.storage.from(bucket).upload(path, downloaded.bytes, {
      contentType: downloaded.contentType,
      upsert: false,
      cacheControl: "31536000"
    });
    if (error && !/already exists/i.test(error.message)) throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { sourceUrl: input.sourceUrl, storedUrl: data.publicUrl, path, sha256: downloaded.sha256, skipped: alreadyStored };
}

async function downloadProductImage(sourceUrl: string) {
  let url = normalizeImageUrl(sourceUrl);
  const visited = new Set<string>();

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    await assertSafeHttpUrl(url);
    if (visited.has(url.toString())) throw new Error("Image redirect loop detected.");
    visited.add(url.toString());

    const response = await fetchWithTimeout(url);
    if (isRedirect(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Image redirect response did not include a location.");
      if (redirects === MAX_REDIRECTS) throw new Error("Image redirect limit exceeded.");
      url = normalizeImageUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) throw new Error(`Image URL returned HTTP ${response.status}.`);
    const contentType = cleanContentType(response.headers.get("content-type"));
    if (!contentType) throw new Error("Image URL did not return a supported image content type.");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMAGE_BYTES) throw new Error("Image response is too large.");
    const bytes = await readBoundedResponse(response);
    const metadata = validateImageBytes(bytes, contentType);
    return { bytes, contentType: metadata.contentType, extension: metadata.extension, sha256: metadata.sha256, width: metadata.width, height: metadata.height };
  }

  throw new Error("Image redirect limit exceeded.");
}

function normalizeImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid image URL.");
  }
  if (url.username || url.password) throw new Error("Image URL cannot include credentials.");
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Image URL must use HTTP or HTTPS.");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("Image URL must use HTTPS in production.");
  if (!ALLOWED_PORTS.has(url.port)) throw new Error("Image URL uses an unsupported port.");
  url.hash = "";
  return url;
}

async function assertSafeHttpUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) throw new Error("Image URL host is not allowed.");
  if (host === "169.254.169.254") throw new Error("Image URL host is not allowed.");
  const records = net.isIP(host) ? [{ address: host }] : await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length) throw new Error("Image URL host could not be resolved.");
  for (const record of records) {
    if (isBlockedAddress(record.address)) throw new Error("Image URL resolves to a blocked network address.");
  }
}

function isBlockedAddress(address: string) {
  const family = net.isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    return normalized === "::1" || normalized === "::" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized.startsWith("::ffff:127.") || normalized.startsWith("::ffff:10.") || normalized.includes("169.254.169.254");
  }
  return true;
}

async function fetchWithTimeout(url: URL) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { accept: "image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1" }
    });
  } catch (error) {
    throw new Error(error instanceof DOMException && error.name === "AbortError" ? "Image download timed out." : "Image download failed.");
  } finally {
    clearTimeout(timeout);
  }
}

async function readBoundedResponse(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_IMAGE_BYTES) throw new Error("Image response is too large.");
    return bytes;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const chunk = Buffer.from(value);
    total += chunk.length;
    if (total > MAX_IMAGE_BYTES) throw new Error("Image response is too large.");
    chunks.push(chunk);
  }
  if (total === 0) throw new Error("Image download was empty.");
  return Buffer.concat(chunks);
}

function cleanContentType(value: string | null) {
  const contentType = value?.split(";")[0]?.trim().toLowerCase() ?? "";
  return contentType === "image/jpeg" || contentType === "image/png" || contentType === "image/webp" ? contentType : null;
}

function isRedirect(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

async function objectExists(supabase: ReturnType<typeof createServiceRoleClient>, bucket: string, storagePath: string) {
  const dir = storagePath.split("/").slice(0, -1).join("/");
  const name = storagePath.split("/").pop();
  const { data, error } = await supabase.storage.from(bucket).list(dir, { search: name, limit: 1 });
  if (error) return false;
  return data?.some((item) => item.name === name) ?? false;
}
