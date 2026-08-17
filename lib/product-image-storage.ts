import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { productImagesBucket } from "@/lib/product-image-urls";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 15000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

export type StoredProductImage = {
  sourceUrl: string;
  storedUrl: string;
  path: string;
  skipped: boolean;
};

export function storagePathForProductImage(input: { slug: string; sku?: string | null; sourceUrl: string; index: number; contentType?: string | null }) {
  const code = safeSegment(input.sku || input.slug);
  const urlHash = createHash("sha256").update(input.sourceUrl).digest("hex").slice(0, 16);
  const extension = extensionForContentType(input.contentType) ?? extensionFromUrl(input.sourceUrl) ?? "jpg";
  return `products/${safeSegment(input.slug)}/${code}-${input.index + 1}-${urlHash}.${extension}`;
}

export async function storeProductImage(input: {
  slug: string;
  sku?: string | null;
  sourceUrl: string;
  index: number;
  currentImages?: string[];
}): Promise<StoredProductImage> {
  const preflightPath = storagePathForProductImage(input);
  const existing = input.currentImages?.find((image) => image.includes(preflightPath));
  if (existing) return { sourceUrl: input.sourceUrl, storedUrl: existing, path: preflightPath, skipped: true };

  const downloaded = await downloadProductImage(input.sourceUrl);
  const path = storagePathForProductImage({ ...input, contentType: downloaded.contentType });
  const current = input.currentImages?.find((image) => image.includes(path));
  if (current) return { sourceUrl: input.sourceUrl, storedUrl: current, path, skipped: true };

  const supabase = createAdminClient();
  const bucket = productImagesBucket();
  const { error } = await supabase.storage.from(bucket).upload(path, downloaded.bytes, {
    contentType: downloaded.contentType,
    upsert: true,
    cacheControl: "31536000"
  });
  if (error) throw new Error(`Storage upload failed for ${input.sourceUrl}: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { sourceUrl: input.sourceUrl, storedUrl: data.publicUrl, path, skipped: false };
}

async function downloadProductImage(sourceUrl: string) {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error(`Invalid image URL: ${sourceUrl}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`Image URL must use http or https: ${sourceUrl}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { redirect: "follow", signal: controller.signal });
  } catch (error) {
    throw new Error(error instanceof DOMException && error.name === "AbortError" ? `Image download timed out: ${sourceUrl}` : `Image download failed: ${sourceUrl}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error(`Image URL returned HTTP ${response.status}: ${sourceUrl}`);
  const contentType = cleanContentType(response.headers.get("content-type"));
  if (!contentType || !ALLOWED_IMAGE_TYPES.has(contentType)) throw new Error(`Image URL did not return a supported image type: ${sourceUrl}`);

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMAGE_BYTES) throw new Error(`Image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB: ${sourceUrl}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) throw new Error(`Image is larger than ${MAX_IMAGE_BYTES / 1024 / 1024} MB: ${sourceUrl}`);
  if (bytes.length === 0) throw new Error(`Image download was empty: ${sourceUrl}`);
  return { bytes, contentType };
}

function cleanContentType(value: string | null) {
  return value?.split(";")[0]?.trim().toLowerCase() || null;
}

function extensionForContentType(contentType?: string | null) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/gif") return "gif";
  if (contentType === "image/avif") return "avif";
  return null;
}

function extensionFromUrl(sourceUrl: string) {
  const pathname = new URL(sourceUrl).pathname.toLowerCase();
  const match = pathname.match(/\.([a-z0-9]{2,5})$/);
  return match?.[1] && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(match[1]) ? (match[1] === "jpeg" ? "jpg" : match[1]) : null;
}

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "product";
}
