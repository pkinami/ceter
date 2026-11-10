"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BannerPlacement, OrderStatus, Prisma, ProductCondition, QuoteStatus, StockMovementReason, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseProductInteger, parseProductItemType, parseProductUnit } from "@/lib/admin/product-fields";
import { hasPermission, requireCapability, requirePermission } from "@/lib/admin/auth";
import type { HomepageSectionType } from "@/lib/types";
import { revalidateStorefront } from "@/lib/storefront-revalidation";
import { stockStatusForQuantity } from "@/lib/admin/data";
import { DELIVERY_REGIONS } from "@/lib/delivery";
import { normalizePublicAssetUrl } from "@/lib/banner-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { BANNER_ALLOWED_TYPES, BANNER_IMAGE_SLOTS, BANNER_MAX_FILE_SIZE, HOMEPAGE_BANNER_REQUIREMENTS, type BannerImageSlot } from "@/lib/banner-requirements";
import { safePathSegment, validateImageBytes } from "@/lib/image-validation";
import { productImagesBucket } from "@/lib/product-image-urls";
import { storeProductImage } from "@/lib/product-image-storage";

function parseImages(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text.split("\n").map((item) => item.trim()).filter(Boolean);
}

function parseSpecs(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error("Specifications must be a valid JSON object.");
  }
}

function nullableString(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function messageRedirect(path: string, key: "success" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function prismaMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
    return "That slug or name is already in use. Use a unique value.";
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

async function imageValueFromForm(formData: FormData, field: string, fallback?: string | null) {
  const file = formData.get(`${field}_file`);
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    return `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
  }
  return nullableString(formData.get(field)) ?? fallback ?? null;
}

async function uploadedProductImageUrl(file: FormDataEntryValue | null, slug: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 5 * 1024 * 1024) throw new Error("Product image uploads must be 5 MB or smaller.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata = validateImageBytes(bytes, file.type);
  const path = `products/${safePathSegment(slug)}/${metadata.sha256}.${metadata.extension}`;
  const supabase = createAdminClient();
  const bucket = productImagesBucket();
  const existing = await supabase.storage.from(bucket).list(`products/${safePathSegment(slug)}`, { search: `${metadata.sha256}.${metadata.extension}`, limit: 1 });
  if (!existing.error && existing.data?.some((item) => item.name === `${metadata.sha256}.${metadata.extension}`)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: metadata.contentType,
    upsert: false,
    cacheControl: "31536000"
  });
  if (error) throw new Error(`Product image upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

async function storedProductImageUrlFromForm(value: string | null, slug: string, currentImages: string[]) {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  const stored = await storeProductImage({ slug, sourceUrl: value, index: 0, currentImages });
  return stored.storedUrl;
}

function extensionForImageType(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/avif") return "avif";
  return "jpg";
}

function bannerImageValueFromForm(formData: FormData, field: string, fallback?: string | null) {
  const value = normalizePublicAssetUrl(nullableString(formData.get(field)) ?? fallback);
  if (!value) return null;
  if (!value.startsWith("/banners/") && !value.startsWith("/New_banner/") && !/^https?:\/\//i.test(value)) throw new Error("Banner images must be uploaded files, public URLs, or checked-in banner assets.");
  return value;
}

async function uploadedBannerImageUrl(file: FormDataEntryValue | null, slug: string, slot: BannerImageSlot) {
  if (!(file instanceof File) || file.size === 0) return null;
  const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
  if (!BANNER_ALLOWED_TYPES.includes(file.type as never)) throw new Error(`${requirement.label} must be JPG, PNG, or WebP.`);
  if (file.size > BANNER_MAX_FILE_SIZE) throw new Error(`${requirement.label} must be 3 MB or smaller.`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const metadata = validateImageBytes(bytes, file.type);
  if (metadata.width !== requirement.width || metadata.height !== requirement.height) {
    throw new Error(`${requirement.label} must be exactly ${requirement.width}x${requirement.height}px (${requirement.aspectRatio}). Selected image is ${metadata.width}x${metadata.height}px.`);
  }

  const path = `${safePathSegment(slug)}/${slot}/${metadata.sha256}.${metadata.extension}`;
  const supabase = createAdminClient();
  const bucket = bannerImagesBucket();
  const existing = await supabase.storage.from(bucket).list(`${safePathSegment(slug)}/${slot}`, { search: `${metadata.sha256}.${metadata.extension}`, limit: 1 });
  if (!existing.error && existing.data?.some((item) => item.name === `${metadata.sha256}.${metadata.extension}`)) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, path, width: metadata.width, height: metadata.height, sha256: metadata.sha256, contentType: metadata.contentType };
  }
  const { error } = await retrySupabaseStorageWrite(() => supabase.storage.from(bucket).upload(path, bytes, {
    contentType: metadata.contentType,
    upsert: false,
    cacheControl: "31536000"
  }));
  if (error) throw new Error(`Banner image upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, width: metadata.width, height: metadata.height, sha256: metadata.sha256, contentType: metadata.contentType };
}

async function uploadedBannerMasterImageUrl(file: FormDataEntryValue | null, slug: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!BANNER_ALLOWED_TYPES.includes(file.type as never)) throw new Error("Master banner image must be JPG, PNG, or WebP.");
  if (file.size > BANNER_MAX_FILE_SIZE) throw new Error("Master banner image must be 3 MB or smaller.");

  const bytes = Buffer.from(await file.arrayBuffer());
  const dimensions = imageDimensions(bytes, file.type);
  if (!dimensions) throw new Error("Master banner image dimensions could not be read.");
  if (dimensions.width < 1600 || dimensions.height < 500) {
    throw new Error(`Master banner image must be at least 1600x500px. Selected image is ${dimensions.width}x${dimensions.height}px.`);
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || extensionForImageType(file.type);
  const path = `banners/${slug}/master-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createAdminClient();
  const bucket = process.env.SUPABASE_BANNER_IMAGES_BUCKET || "banner-images";
  const { error } = await retrySupabaseStorageWrite(() => supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000"
  }));
  if (error) throw new Error(`Banner image upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, width: dimensions.width, height: dimensions.height };
}

function parseBannerVariants(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function bannerTextPosition(value: FormDataEntryValue | null) {
  const text = String(value ?? "left");
  return text === "center" || text === "right" ? text : "left";
}

function bannerOverlayOpacity(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? 70);
  return Number.isFinite(parsed) ? Math.min(95, Math.max(0, Math.round(parsed))) : 70;
}

function bannerBadgePosition(value: FormDataEntryValue | null) {
  const text = String(value ?? "top-left");
  return text === "top-right" || text === "bottom-left" || text === "bottom-right" ? text : "top-left";
}

function bannerBadgeColor(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return /^#[0-9a-f]{6}$/i.test(text) ? text : "#0f766e";
}

function normalizeBannerPlacement(value: FormDataEntryValue | null): BannerPlacement {
  const text = String(value ?? "main").trim();
  if (text === "service") return "services" as BannerPlacement;
  if (text === "main" || text === "category" || text === "services") return text as BannerPlacement;
  return "main" as BannerPlacement;
}

function parseDateTime(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) throw new Error("Schedule date/time is invalid.");
  return date;
}

function normalizeDestination(typeValue: FormDataEntryValue | null, hrefValue: FormDataEntryValue | null) {
  const destinationType = String(typeValue ?? "internal").trim();
  if (!["internal", "external", "category", "service"].includes(destinationType)) throw new Error("Destination type is invalid.");
  const href = nullableString(hrefValue);
  if (!href) return { destination_type: destinationType, cta_href: null };
  if (destinationType === "external") {
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      throw new Error("External CTA destination must be a valid HTTPS URL.");
    }
    if (url.protocol !== "https:") throw new Error("External CTA destination must use HTTPS.");
    if (url.username || url.password) throw new Error("External CTA destination cannot include credentials.");
    return { destination_type: destinationType, cta_href: url.toString() };
  }
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\") || href.includes("\n")) {
    throw new Error("Internal CTA destination must be a safe site-relative path.");
  }
  return { destination_type: destinationType, cta_href: href };
}

async function bannerImageVariantsFromForm(formData: FormData, slug: string) {
  const existing = new Map(parseBannerVariants(formData.get("existing_image_variants")).map((variant) => [String(variant.slot), variant]));
  const variants = [];
  for (const slot of BANNER_IMAGE_SLOTS) {
    if (formData.get(`remove_${slot}`) === "on") continue;
    const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
    const uploaded = await uploadedBannerImageUrl(formData.get(requirement.field), slug, slot);
    const existingVariant = existing.get(slot) as { url?: unknown; path?: unknown } | undefined;
    const url = uploaded?.url ?? String(existingVariant?.url ?? "").trim();
    if (!url) continue;
    variants.push({
      slot,
      url,
      path: uploaded?.path ?? (typeof existingVariant?.path === "string" ? existingVariant.path : null),
      width: requirement.width,
      height: requirement.height,
      aspectRatio: requirement.aspectRatio,
      shape: requirement.shape,
      sha256: uploaded?.sha256 ?? null
    });
  }
  return variants;
}

function bannerImagesBucket() {
  return process.env.SUPABASE_BANNER_IMAGES_BUCKET || "storefront-banners";
}

function storageObjectPathFromPublicUrl(value: string | null | undefined, bucket: string) {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = url.pathname.indexOf(marker);
  if (markerIndex < 0) return null;
  return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
}

async function removeBannerStorageObjects(urls: Array<string | null | undefined>) {
  const bucket = bannerImagesBucket();
  const paths = [...new Set(urls.map((url) => storageObjectPathFromPublicUrl(url, bucket)).filter((path): path is string => Boolean(path)))];
  if (!paths.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Banner storage cleanup failed: ${error.message}`);
}

async function removeProductStorageObjects(urls: Array<string | null | undefined>) {
  const bucket = productImagesBucket();
  const paths = [...new Set(urls.map((url) => storageObjectPathFromPublicUrl(url, bucket)).filter((path): path is string => Boolean(path)))];
  if (!paths.length) return;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw new Error(`Product storage cleanup failed: ${error.message}`);
}

function productImageUrls(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function retrySupabaseStorageWrite<T extends { error: { message: string } | null }>(operation: () => Promise<T>) {
  let result = await operation();
  for (let attempt = 0; result.error && isTransientStorageError(result.error.message) && attempt < 2; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    result = await operation();
  }
  return result;
}

function isTransientStorageError(message: string) {
  return /gateway timeout|timeout|temporarily unavailable|fetch failed|network/i.test(message);
}

function imageDimensions(bytes: Buffer, type: string) {
  if (type === "image/png" && bytes.length >= 24 && bytes.toString("ascii", 1, 4) === "PNG") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (type === "image/jpeg") return jpegDimensions(bytes);
  if (type === "image/webp") return webpDimensions(bytes);
  return null;
}

function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb) || (marker >= 0xcd && marker <= 0xcf)) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

function webpDimensions(bytes: Buffer) {
  if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X" && bytes.length >= 30) {
    return { width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunk === "VP8 " && bytes.length >= 30) {
    return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L" && bytes.length >= 25) {
    const bits = bytes.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export async function upsertProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const session = await requirePermission(id ? "products.update" : "products.create");
  const canManageCost = hasPermission(session, "products.cost_price.view");
  const returnTo = String(formData.get("return_to") ?? "/admin/products");
  const images = parseImages(formData.get("images"));
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? name));
  if (!name) messageRedirect(returnTo, "error", "Product name is required.");
  if (!slug) messageRedirect(returnTo, "error", "Product slug is required.");
  let uploadedImage: string | null = null;
  try {
    uploadedImage = await uploadedProductImageUrl(formData.get("primary_image_file"), slug);
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Product image could not be uploaded."));
  }
  const primaryImageUrl = nullableString(formData.get("primary_image"));
  let storedPrimaryImage: string | null = null;
  try {
    storedPrimaryImage = uploadedImage ? null : await storedProductImageUrlFromForm(primaryImageUrl, slug, images);
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Public product image URL could not be downloaded into storage."));
  }
  const selectedPrimaryImage = uploadedImage ?? storedPrimaryImage;
  const replacedPrimaryImage = uploadedImage ? primaryImageUrl : null;
  const productImages = selectedPrimaryImage
    ? [selectedPrimaryImage, ...images.filter((image) => image !== selectedPrimaryImage && image !== replacedPrimaryImage)]
    : images;
  const itemType = parseProductItemType(formData.get("item_type"));
  const unit = parseProductUnit(formData.get("unit"));
  const priceKes = parseProductInteger(formData.get("price_kes")) ?? -1;
  const costPriceKes = parseProductInteger(formData.get("cost_price_kes"), true);
  const stockQuantity = parseProductInteger(formData.get("stock_quantity") ?? "0") ?? -1;
  const reorderLevel = parseProductInteger(formData.get("reorder_level") ?? "0") ?? -1;
  const reorderQuantity = parseProductInteger(formData.get("reorder_quantity") ?? "0") ?? -1;
  const leadTime = parseProductInteger(formData.get("supplier_lead_time_days"), true);
  const condition = String(formData.get("condition") ?? "new") as ProductCondition;
  const stockStatus = String(formData.get("stock_status") ?? "in_stock") as StockStatus;
  let specs: Prisma.InputJsonValue;
  try {
    specs = parseSpecs(formData.get("specs")) as Prisma.InputJsonValue;
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Specifications must be a valid JSON object.");
  }
  const payload = {
    name,
    slug,
    description: String(formData.get("description") ?? "").trim(),
    category_id: String(formData.get("category_id") ?? "") || null,
    brand_id: String(formData.get("brand_id") ?? "") || null,
    price_kes: priceKes,
    mpn: nullableString(formData.get("mpn")),
    sku: nullableString(formData.get("sku")),
    item_type: itemType,
    unit,
    cost_price_kes: canManageCost ? costPriceKes : undefined,
    supplier_name: nullableString(formData.get("supplier_name")),
    supplier_lead_time_days: leadTime,
    reorder_level: reorderLevel,
    reorder_quantity: reorderQuantity,
    is_published: condition === "refurbished" ? false : formData.get("is_published") === "on",
    condition,
    stock_status: stockStatus,
    stock_quantity: stockQuantity,
    images: productImages,
    specs: specs!,
    is_featured: formData.get("is_featured") === "on",
    show_offer_badge: formData.get("show_offer_badge") === "on",
    show_flash_sale_badge: formData.get("show_flash_sale_badge") === "on"
  };

  if (!payload.item_type) messageRedirect(returnTo, "error", "Select a valid product type.");
  if (!payload.unit) messageRedirect(returnTo, "error", "Select a valid unit.");

  if (!payload.description) messageRedirect(returnTo, "error", "Product description is required.");
  if (!payload.category_id) messageRedirect(returnTo, "error", "Select a product category.");
  const [categoryExists, brandExists] = await Promise.all([
    prisma.category.count({ where: { id: payload.category_id } }),
    payload.brand_id ? prisma.brand.count({ where: { id: payload.brand_id } }) : Promise.resolve(1)
  ]);
  if (!categoryExists) messageRedirect(returnTo, "error", "Select an existing product category.");
  if (!brandExists) messageRedirect(returnTo, "error", "Select an existing brand.");
  if (!Number.isSafeInteger(priceKes) || priceKes < 0) messageRedirect(returnTo, "error", "Selling price must be a non-negative whole number.");
  if (costPriceKes !== null && (!Number.isSafeInteger(costPriceKes) || costPriceKes < 0)) messageRedirect(returnTo, "error", "Buying price must be a non-negative whole number.");
  if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0) messageRedirect(returnTo, "error", "Opening stock must be a non-negative whole number.");
  if (!Number.isSafeInteger(reorderLevel) || reorderLevel < 0 || !Number.isSafeInteger(reorderQuantity) || reorderQuantity < 0) messageRedirect(returnTo, "error", "Reorder values must be non-negative whole numbers.");
  if (leadTime !== null && (!Number.isSafeInteger(leadTime) || leadTime < 0)) messageRedirect(returnTo, "error", "Supplier lead time must be a non-negative whole number.");
  if (!(["new", "refurbished"] as string[]).includes(condition)) messageRedirect(returnTo, "error", "Condition must be new or refurbished.");
  if (!("in_stock,backorder,out_of_stock".split(",").includes(stockStatus))) messageRedirect(returnTo, "error", "Select a valid stock status.");
  const duplicateChecks: Prisma.ProductWhereInput[] = [{ slug: payload.slug }];
  if (payload.sku) duplicateChecks.push({ sku: payload.sku });
  if (payload.mpn) duplicateChecks.push({ mpn: payload.mpn });
  const duplicate = await prisma.product.findFirst({
    where: {
      id: id ? { not: id } : undefined,
      OR: duplicateChecks
    },
    select: { slug: true, sku: true, mpn: true }
  });
  if (duplicate) {
    if (duplicate.slug === payload.slug) messageRedirect(returnTo, "error", "Product slug is already in use.");
    if (payload.sku && duplicate.sku === payload.sku) messageRedirect(returnTo, "error", "SKU is already in use.");
    if (payload.mpn && duplicate.mpn === payload.mpn) messageRedirect(returnTo, "error", "MPN/model is already in use.");
  }
  let savedId = id;
  let savedCategorySlug: string | null = null;
  try {
  if (id) {
    const before = await prisma.product.findUnique({ where: { id } });
    const updatePayload: Prisma.ProductUncheckedUpdateInput = { ...payload };
    delete (updatePayload as { stock_quantity?: number }).stock_quantity;
    delete (updatePayload as { stock_status?: StockStatus }).stock_status;
    if (!canManageCost) delete (updatePayload as { cost_price_kes?: number | null }).cost_price_kes;
    const updated = await prisma.product.update({
      where: { id },
      data: updatePayload,
      include: { category: { select: { slug: true } } }
    });
    const retainedImages = new Set(productImageUrls(updated.images));
    await removeProductStorageObjects(productImageUrls(before?.images).filter((url) => !retainedImages.has(url)));
    savedCategorySlug = updated.category?.slug ?? null;
    const writes: Prisma.PrismaPromise<unknown>[] = [];
    if (before && before.price_kes !== updated.price_kes) {
      writes.push(
        prisma.priceHistory.updateMany({ where: { product_id: id, effective_to: null }, data: { effective_to: new Date() } }),
        prisma.priceHistory.create({ data: { product_id: id, price_kes: updated.price_kes, changed_by: session.userId, note: "Product form price change" } }),
        prisma.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: id, action: "price.change", before: { price_kes: before.price_kes }, after: { price_kes: updated.price_kes } } })
      );
    }
    if (writes.length) await prisma.$transaction(writes);
  } else {
    const created = await prisma.product.create({
      data: payload,
      include: { category: { select: { slug: true } } }
    });
    savedId = created.id;
    savedCategorySlug = created.category?.slug ?? null;
    const writes: Prisma.PrismaPromise<unknown>[] = [
      prisma.priceHistory.create({ data: { product_id: created.id, price_kes: created.price_kes, changed_by: session.userId, note: "Opening price" } })
    ];
    if (created.stock_quantity > 0) {
      writes.push(prisma.stockMovement.create({ data: { product_id: created.id, delta: created.stock_quantity, reason: "OPENING_BALANCE", reference: "Product created", user_id: session.userId } }));
    }
    await prisma.$transaction(writes);
  }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Product could not be saved."));
  }
  revalidateStorefront([`/product/${slug}`, savedCategorySlug ? `/category/${savedCategorySlug}` : null]);
  messageRedirect(returnTo.startsWith("/admin/business") ? returnTo : savedId ? `/admin/products/${savedId}/edit` : "/admin/products", "success", id ? "Product updated." : "Product created.");
}

export async function deleteProductAction(formData: FormData) {
  const session = await requirePermission("products.archive");
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/products", "error", "Product id is required.");
  const product = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, archived_at: true, category: { select: { slug: true } } }
  });
  try {
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { is_published: false, archived_at: new Date() } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: id, action: "product.archive", before: { archived_at: product?.archived_at ?? null }, after: { archived_at: "now", is_published: false } } })
    ]);
  } catch (error) {
    messageRedirect("/admin/products", "error", prismaMessage(error, "Product could not be archived."));
  }
  revalidateStorefront([product?.slug ? `/product/${product.slug}` : null, product?.category?.slug ? `/category/${product.category.slug}` : null]);
  messageRedirect("/admin/products", "success", "Product archived.");
}

export async function updateProductPublicationAction(formData: FormData) {
  const next = String(formData.get("next") ?? "") as "publish" | "unpublish" | "archive";
  const session = await requirePermission(next === "archive" ? "products.archive" : "products.publish");
  const id = String(formData.get("id") ?? "");
  const before = await prisma.product.findUnique({ where: { id }, select: { is_published: true, archived_at: true } });
  if (!before) throw new Error("Product not found.");
  const data = next === "publish"
    ? { is_published: true, archived_at: null }
    : next === "archive"
      ? { is_published: false, archived_at: new Date() }
      : { is_published: false };
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: id, action: `product.${next}`, before, after: data } })
  ]);
  revalidateStorefront();
  revalidatePath("/admin/products");
}

export async function updateProductFeaturedAction(formData: FormData) {
  const session = await requirePermission("storefront.featured.manage");
  const id = String(formData.get("id") ?? "");
  const featured = String(formData.get("featured") ?? "") === "true";
  const returnTo = String(formData.get("return_to") ?? "/admin/storefront/featured");
  if (!id) throw new Error("Product id is required.");
  const before = await prisma.product.findUnique({ where: { id }, select: { is_featured: true, slug: true } });
  if (!before) throw new Error("Product not found.");
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { is_featured: featured } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: id, action: featured ? "product.feature" : "product.unfeature", before, after: { is_featured: featured } } })
  ]);
  revalidateStorefront(["/", before.slug ? `/product/${before.slug}` : null]);
  revalidatePath("/admin/storefront/featured");
  messageRedirect(returnTo, "success", featured ? "Product added to Featured Products." : "Product removed from Featured Products.");
}

export async function updateOrderStatusAction(formData: FormData) {
  const session = await requireCapability("orders", ["full", "fulfil"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending") as OrderStatus;
  const before = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Order", entity_id: id, action: "status.change", before: before ?? {}, after: { status } } })
  ]);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
}

export async function updateQuoteStatusAction(formData: FormData) {
  const session = await requireCapability("quotes", ["full"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new") as QuoteStatus;
  const before = await prisma.quoteRequest.findUnique({ where: { id }, select: { status: true } });
  await prisma.$transaction([
    prisma.quoteRequest.update({ where: { id }, data: { status } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "QuoteRequest", entity_id: id, action: "status.change", before: before ?? {}, after: { status } } })
  ]);
  revalidatePath("/admin");
  revalidatePath("/admin/quotes");
}

export async function upsertCategoryAction(formData: FormData) {
  const session = await requirePermission("categories.manage");
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/categories");
  const image = await imageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
  const name = String(formData.get("name") ?? "").trim();
  const payload = {
    name,
    slug: slugify(String(formData.get("slug") ?? name)),
    description: nullableString(formData.get("description")),
    icon: nullableString(formData.get("icon")),
    image,
    parent_id: String(formData.get("parent_id") ?? "") || null,
    sort_order: Number(formData.get("sort_order") ?? 0)
  };

  if (!payload.name) messageRedirect(returnTo, "error", "Category name is required.");
  if (!payload.slug) messageRedirect(returnTo, "error", "Category slug is required.");
  if (payload.parent_id && id && payload.parent_id === id) messageRedirect(returnTo, "error", "A category cannot be its own parent.");
  if (payload.parent_id) {
    const parent = await prisma.category.findUnique({ where: { id: payload.parent_id }, include: { parent: true } });
    if (!parent) messageRedirect(returnTo, "error", "Parent category was not found.");
    if (parent.parent?.parent_id) messageRedirect(returnTo, "error", "Categories support only main > subcategory > leaf category.");
    if (id) {
      let cursor: { id: string; parent_id: string | null } | null = parent;
      while (cursor) {
        if (cursor.id === id) messageRedirect(returnTo, "error", "A category cannot be moved beneath itself or one of its descendants.");
        cursor = cursor.parent_id ? await prisma.category.findUnique({ where: { id: cursor.parent_id }, select: { id: true, parent_id: true } }) : null;
      }
    }
  }

  try {
  if (id) {
    const before = await prisma.category.findUnique({ where: { id } });
    await prisma.$transaction([
      prisma.category.update({ where: { id }, data: payload }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Category", entity_id: id, action: "category.update", before: before ?? {}, after: payload } })
    ]);
  } else {
    const created = await prisma.category.create({ data: payload });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Category", entity_id: created.id, action: "category.create", after: payload } });
  }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Category could not be saved."));
  }
  revalidateStorefront();
  messageRedirect(returnTo.startsWith("/admin/business") ? returnTo : "/admin/categories", "success", id ? "Category updated." : "Category created.");
}

export async function deleteCategoryAction(formData: FormData) {
  const session = await requirePermission("categories.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/categories", "error", "Category id is required.");
  const [children, products] = await Promise.all([
    prisma.category.count({ where: { parent_id: id } }),
    prisma.product.count({ where: { category_id: id, archived_at: null } })
  ]);
  if (children) messageRedirect("/admin/categories", "error", "Move or delete child categories before deleting this category.");
  if (products) messageRedirect("/admin/categories", "error", "Move products out of this category before deleting it.");
  try {
    await prisma.$transaction([
      prisma.category.delete({ where: { id } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Category", entity_id: id, action: "category.archive", after: { deleted: true } } })
    ]);
  } catch (error) {
    messageRedirect("/admin/categories", "error", prismaMessage(error, "Category could not be deleted."));
  }
  revalidateStorefront();
  messageRedirect("/admin/categories", "success", "Category deleted.");
}

export async function upsertBrandAction(formData: FormData) {
  const session = await requirePermission("brands.manage");
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/brands");
  const icon = await imageValueFromForm(formData, "icon", String(formData.get("existing_icon") ?? "") || null);
  const name = String(formData.get("name") ?? "").trim();
  const payload = {
    name,
    slug: slugify(String(formData.get("slug") ?? name)),
    icon
  };

  if (!payload.name) messageRedirect(returnTo, "error", "Brand name is required.");
  if (!payload.slug) messageRedirect(returnTo, "error", "Brand slug is required.");
  try {
  if (id) {
    const before = await prisma.brand.findUnique({ where: { id } });
    await prisma.$transaction([
      prisma.brand.update({ where: { id }, data: payload }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Brand", entity_id: id, action: "brand.update", before: before ?? {}, after: payload } })
    ]);
  } else {
    const created = await prisma.brand.create({ data: payload });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Brand", entity_id: created.id, action: "brand.create", after: payload } });
  }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Brand could not be saved."));
  }
  revalidateStorefront();
  messageRedirect("/admin/brands", "success", id ? "Brand updated." : "Brand created.");
}

export async function deleteBrandAction(formData: FormData) {
  const session = await requirePermission("brands.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/brands", "error", "Brand id is required.");
  const products = await prisma.product.count({ where: { brand_id: id, archived_at: null } });
  if (products) messageRedirect("/admin/brands", "error", "Move products out of this brand before deleting it.");
  try {
    await prisma.$transaction([
      prisma.brand.delete({ where: { id } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Brand", entity_id: id, action: "brand.archive", after: { deleted: true } } })
    ]);
  } catch (error) {
    messageRedirect("/admin/brands", "error", prismaMessage(error, "Brand could not be deleted."));
  }
  revalidateStorefront();
  messageRedirect("/admin/brands", "success", "Brand deleted.");
}

export async function upsertServiceAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/services");
  const image = await imageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
  const price = nullableString(formData.get("price_kes"));
  const title = String(formData.get("title") ?? "").trim();
  const payload = {
    title,
    slug: slugify(String(formData.get("slug") ?? title)),
    description: String(formData.get("description") ?? "").trim(),
    image,
    price_kes: price ? Number(price) : null,
    show_request_quote: formData.get("show_request_quote") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_enabled: formData.get("is_enabled") === "on"
  };

  if (!payload.title) messageRedirect(returnTo, "error", "Service title is required.");
  if (!payload.slug) messageRedirect(returnTo, "error", "Service slug is required.");
  if (!payload.description) messageRedirect(returnTo, "error", "Service description is required.");
  if ((payload.price_kes ?? 0) < 0) messageRedirect(returnTo, "error", "Service price cannot be negative.");

  try {
    if (id) {
      await prisma.serviceEntry.update({ where: { id }, data: payload });
    } else {
      await prisma.serviceEntry.create({ data: payload });
    }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Service could not be saved."));
  }
  revalidateStorefront();
  messageRedirect("/admin/services", "success", id ? "Service updated." : "Service created.");
}

export async function deleteServiceAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/services", "error", "Service id is required.");
  try {
    await prisma.serviceEntry.delete({ where: { id } });
  } catch (error) {
    messageRedirect("/admin/services", "error", prismaMessage(error, "Service could not be deleted."));
  }
  revalidateStorefront();
  messageRedirect("/admin/services", "success", "Service deleted.");
}

export async function upsertHomepageSectionAction(formData: FormData) {
  const session = await requirePermission("storefront.homepage.manage");
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/homepage");
  const title = String(formData.get("title") ?? "").trim();
  const payload = {
    title,
    section_type: String(formData.get("section_type") ?? "category_products") as HomepageSectionType,
    category_id: String(formData.get("category_id") ?? "") || null,
    sort_order: Number(formData.get("sort_order") ?? 0),
    product_limit: Number(formData.get("product_limit") ?? 8),
    is_enabled: formData.get("is_enabled") === "on"
  };

  if (!payload.title) messageRedirect(returnTo, "error", "Homepage section title is required.");
  if (payload.product_limit < 1 || payload.product_limit > 24) messageRedirect(returnTo, "error", "Product limit must be between 1 and 24.");
  if (payload.section_type === "category_products" && !payload.category_id) messageRedirect(returnTo, "error", "Choose a category for a category-products section.");

  try {
    if (id) {
      const before = await prisma.homepageSection.findUnique({ where: { id } });
      await prisma.$transaction([
        prisma.homepageSection.update({ where: { id }, data: payload }),
        prisma.auditLog.create({ data: { user_id: session.userId, entity: "HomepageSection", entity_id: id, action: "homepage.update", before: before ?? {}, after: payload } })
      ]);
    } else {
      const created = await prisma.homepageSection.create({ data: payload });
      await prisma.auditLog.create({ data: { user_id: session.userId, entity: "HomepageSection", entity_id: created.id, action: "homepage.create", after: payload } });
    }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Homepage section could not be saved."));
  }
  revalidateStorefront();
  messageRedirect(returnTo, "success", id ? "Homepage section updated." : "Homepage section created.");
}

export async function deleteHomepageSectionAction(formData: FormData) {
  const session = await requirePermission("storefront.homepage.manage");
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/homepage", "error", "Homepage section id is required.");
  try {
    await prisma.$transaction([
      prisma.homepageSection.delete({ where: { id } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "HomepageSection", entity_id: id, action: "homepage.archive", after: { deleted: true } } })
    ]);
  } catch (error) {
    messageRedirect("/admin/homepage", "error", prismaMessage(error, "Homepage section could not be deleted."));
  }
  revalidateStorefront();
  messageRedirect("/admin/storefront/homepage", "success", "Homepage section deleted.");
}

export type InventoryMatrixEdit = {
  id: string;
  updatedAt: string;
  mpn?: string | null;
  stock_quantity?: number;
  price_kes?: number;
  cost_price_kes?: number | null;
  note?: string;
};

export type InventoryMatrixResult = {
  ok: Array<{ id: string; updatedAt: string; mpn: string | null; stock_quantity: number; price_kes: number; cost_price_kes: number | null }>;
  failed: Array<{ id: string; reason: string }>;
};

export async function saveInventoryMatrixAction(edits: InventoryMatrixEdit[]): Promise<InventoryMatrixResult> {
  const session = await requireCapability("stock", ["edit"]);
  const result: InventoryMatrixResult = { ok: [], failed: [] };

  for (const edit of edits) {
    try {
      if ((edit.stock_quantity ?? 0) < 0 || (edit.price_kes ?? 0) < 0 || ((edit.cost_price_kes ?? 0) < 0)) {
        throw new Error("Negative stock and prices are not allowed.");
      }
      const current = await prisma.product.findUnique({ where: { id: edit.id } });
      if (!current) throw new Error("Product no longer exists.");
      if (current.updated_at.toISOString() !== edit.updatedAt) throw new Error("This row changed while you were editing.");

      const data: { stock_quantity?: number; stock_status?: StockStatus; price_kes?: number; cost_price_kes?: number | null; mpn?: string | null } = {};
      if (edit.stock_quantity !== undefined) data.stock_quantity = edit.stock_quantity;
      if (edit.stock_quantity !== undefined) data.stock_status = stockStatusForQuantity(edit.stock_quantity, current.stock_status);
      if (edit.price_kes !== undefined) data.price_kes = edit.price_kes;
      if (edit.cost_price_kes !== undefined) data.cost_price_kes = edit.cost_price_kes;
      if (edit.mpn !== undefined) data.mpn = edit.mpn?.trim() || null;

      const updated = await prisma.product.update({ where: { id: edit.id }, data });
      const writes: Prisma.PrismaPromise<unknown>[] = [];

      if (edit.stock_quantity !== undefined && edit.stock_quantity !== current.stock_quantity) {
        writes.push(prisma.stockMovement.create({
          data: {
            product_id: edit.id,
            delta: edit.stock_quantity - current.stock_quantity,
            reason: "CORRECTION",
            reference: edit.note || "Inventory matrix",
            user_id: session.userId
          }
        }));
      }

      if (edit.price_kes !== undefined && edit.price_kes !== current.price_kes) {
        writes.push(
          prisma.priceHistory.updateMany({ where: { product_id: edit.id, effective_to: null }, data: { effective_to: new Date() } }),
          prisma.priceHistory.create({
            data: { product_id: edit.id, price_kes: edit.price_kes, changed_by: session.userId, note: edit.note || "Inventory matrix price change" }
          })
        );
      }

      if (edit.price_kes !== undefined || edit.cost_price_kes !== undefined || edit.stock_quantity !== undefined || edit.mpn !== undefined) {
        writes.push(prisma.auditLog.create({
          data: {
            user_id: session.userId,
            entity: "Product",
            entity_id: edit.id,
            action: "inventory_matrix.update",
            before: { mpn: current.mpn, stock_quantity: current.stock_quantity, price_kes: current.price_kes, cost_price_kes: current.cost_price_kes },
            after: { mpn: updated.mpn, stock_quantity: updated.stock_quantity, price_kes: updated.price_kes, cost_price_kes: updated.cost_price_kes }
          }
        }));
      }

      if (writes.length) await prisma.$transaction(writes);

      result.ok.push({
        id: updated.id,
        updatedAt: updated.updated_at.toISOString(),
        mpn: updated.mpn,
        stock_quantity: updated.stock_quantity,
        price_kes: updated.price_kes,
        cost_price_kes: updated.cost_price_kes
      });
    } catch (error) {
      result.failed.push({ id: edit.id, reason: error instanceof Error ? error.message : "Save failed." });
    }
  }

  revalidateStorefront();
  return result;
}

export type BulkProductAction = "delete" | "publish" | "unpublish" | "set-category" | "set-price" | "set-stock";

export type BulkProductResult = {
  archived: number;
  deleted: number;
  updated: number;
  failed: Array<{ id: string; name: string; reason: string }>;
};

export async function bulkProductAction(ids: string[], action: BulkProductAction, value?: string | number | null): Promise<BulkProductResult> {
  const session = await requireCapability("price", ["edit"]);
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  const result: BulkProductResult = { archived: 0, deleted: 0, updated: 0, failed: [] };
  if (!uniqueIds.length) return result;

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds } },
    include: {
      _count: { select: { order_items: true, quote_lines: true, stock_movements: true, serials: true } }
    }
  });
  const foundIds = new Set(products.map((product) => product.id));
  for (const id of uniqueIds) {
    if (!foundIds.has(id)) result.failed.push({ id, name: id, reason: "Product no longer exists." });
  }

  if (action === "publish" || action === "unpublish") {
    const isPublished = action === "publish";
    await prisma.$transaction([
      prisma.product.updateMany({ where: { id: { in: products.map((product) => product.id) } }, data: { is_published: isPublished, archived_at: isPublished ? null : undefined } }),
      prisma.auditLog.createMany({
        data: products.map((product) => ({
          user_id: session.userId,
          entity: "Product",
          entity_id: product.id,
          action: `bulk.${action}`,
          before: { is_published: product.is_published },
          after: { is_published: isPublished }
        }))
      })
    ]);
    result.updated = products.length;
    revalidateStorefront();
    return result;
  }

  if (action === "set-category" || action === "set-price" || action === "set-stock") {
    if ((action === "set-price" || action === "set-stock") && (!Number.isFinite(Number(value)) || Number(value) < 0)) throw new Error("Value must be a non-negative number.");
    const data = action === "set-category"
      ? { category_id: value ? String(value) : null }
      : action === "set-price"
        ? { price_kes: Number(value) }
        : { stock_quantity: Number(value), stock_status: stockStatusForQuantity(Number(value)) };
    const changed = products.filter((product) =>
      action === "set-category" ? product.category_id !== data.category_id :
      action === "set-price" ? product.price_kes !== data.price_kes :
      product.stock_quantity !== data.stock_quantity
    );
    const now = new Date();
    const writes: Prisma.PrismaPromise<unknown>[] = [
      prisma.product.updateMany({ where: { id: { in: changed.map((product) => product.id) } }, data }),
      prisma.auditLog.createMany({
        data: changed.map((product) => ({
          user_id: session.userId,
          entity: "Product",
          entity_id: product.id,
          action: `bulk.${action}`,
          before: { category_id: product.category_id, price_kes: product.price_kes, stock_quantity: product.stock_quantity },
          after: {
            category_id: action === "set-category" ? data.category_id : product.category_id,
            price_kes: action === "set-price" ? data.price_kes : product.price_kes,
            stock_quantity: action === "set-stock" ? data.stock_quantity : product.stock_quantity
          }
        }))
      })
    ];
    if (action === "set-stock") {
      writes.push(prisma.stockMovement.createMany({
        data: changed.map((product) => ({
          product_id: product.id,
          delta: Number(value) - product.stock_quantity,
          reason: "CORRECTION",
          reference: "Bulk action",
          user_id: session.userId
        }))
      }));
    }
    if (action === "set-price") {
      writes.push(
        prisma.priceHistory.updateMany({ where: { product_id: { in: changed.map((product) => product.id) }, effective_to: null }, data: { effective_to: now } }),
        prisma.priceHistory.createMany({
          data: changed.map((product) => ({
            product_id: product.id,
            price_kes: Number(value),
            changed_by: session.userId,
            note: "Bulk price change"
          }))
        })
      );
    }
    if (changed.length) await prisma.$transaction(writes);
    result.updated = changed.length;
    revalidateStorefront();
    return result;
  }

  const archive = products.filter((product) => product._count.order_items > 0 || product._count.quote_lines > 0 || product._count.stock_movements > 0 || product._count.serials > 0);
  const remove = products.filter((product) => !archive.includes(product));
  const now = new Date();
  const writes: Prisma.PrismaPromise<unknown>[] = [];
  if (archive.length) {
    writes.push(
      prisma.product.updateMany({ where: { id: { in: archive.map((product) => product.id) } }, data: { is_published: false, archived_at: now } }),
      prisma.auditLog.createMany({
        data: archive.map((product) => ({
          user_id: session.userId,
          entity: "Product",
          entity_id: product.id,
          action: "product.archive",
          before: { is_published: product.is_published, archived_at: product.archived_at },
          after: { is_published: false, archived_at: now.toISOString() }
        }))
      })
    );
  }
  if (remove.length) {
    writes.push(
      prisma.auditLog.createMany({
        data: remove.map((product) => ({
          user_id: session.userId,
          entity: "Product",
          entity_id: product.id,
          action: "product.delete",
          before: { name: product.name, slug: product.slug },
          after: {}
        }))
      }),
      prisma.product.deleteMany({ where: { id: { in: remove.map((product) => product.id) } } })
    );
  }
  if (writes.length) await prisma.$transaction(writes);
  result.archived = archive.length;
  result.deleted = remove.length;

  revalidateStorefront();
  return result;
}

export async function updateProductPricingAction(formData: FormData) {
  const session = await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const price_kes = Number(formData.get("price_kes") ?? 0);
  const cost_price_kes = nullableNumber(formData.get("cost_price_kes"));
  if (!id) throw new Error("Product id is required.");
  if (price_kes < 0 || (cost_price_kes ?? 0) < 0) throw new Error("Negative prices are not allowed.");
  const before = await prisma.product.findUnique({ where: { id }, select: { price_kes: true, cost_price_kes: true } });
  if (!before) throw new Error("Product not found.");
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { price_kes, cost_price_kes } }),
    prisma.priceHistory.updateMany({ where: { product_id: id, effective_to: null }, data: { effective_to: new Date() } }),
    prisma.priceHistory.create({ data: { product_id: id, price_kes, changed_by: session.userId, note: "Admin pricing edit" } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: id, action: "pricing.update", before, after: { price_kes, cost_price_kes } } })
  ]);
  revalidateStorefront();
  revalidatePath("/admin/pricing");
}

export async function updateProductStockAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const stock_quantity = Number(formData.get("stock_quantity") ?? 0);
  const reorder_level = Number(formData.get("reorder_level") ?? 0);
  const reorder_quantity = Number(formData.get("reorder_quantity") ?? 0);
  if (!id) throw new Error("Product id is required.");
  if (stock_quantity < 0 || reorder_level < 0 || reorder_quantity < 0) throw new Error("Negative inventory values are not allowed.");
  const before = await prisma.product.findUnique({ where: { id }, select: { stock_quantity: true, reorder_level: true, reorder_quantity: true, stock_status: true } });
  if (!before) throw new Error("Product not found.");
  const stock_status = stockStatusForQuantity(stock_quantity, before.stock_status);
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { stock_quantity, reorder_level, reorder_quantity, stock_status } }),
    prisma.stockMovement.create({ data: { product_id: id, delta: stock_quantity - before.stock_quantity, reason: "CORRECTION", reference: "Admin inventory edit", user_id: session.userId } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: id, action: "stock.update", before, after: { stock_quantity, reorder_level, reorder_quantity, stock_status } } })
  ]);
  revalidateStorefront();
  revalidatePath("/admin/inventory");
}

export async function adjustInventoryStockAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const id = String(formData.get("product_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/inventory");
  const stock_quantity = Number(formData.get("stock_quantity") ?? 0);
  const reorder_level = Number(formData.get("reorder_level") ?? 0);
  const reorder_quantity = Number(formData.get("reorder_quantity") ?? 0);
  const requestedReason = String(formData.get("reason") ?? "CORRECTION") as StockMovementReason;
  const reason: StockMovementReason = ["SALE", "PURCHASE", "RETURN", "DAMAGE", "CORRECTION", "OPENING_BALANCE"].includes(requestedReason) ? requestedReason : "CORRECTION";
  const reference = nullableString(formData.get("reference")) ?? "Admin stock adjustment";
  if (!id) messageRedirect(returnTo, "error", "Choose an inventory item.");
  if (!Number.isFinite(stock_quantity) || !Number.isFinite(reorder_level) || !Number.isFinite(reorder_quantity)) messageRedirect(returnTo, "error", "Inventory values must be numeric.");
  if (stock_quantity < 0 || reorder_level < 0 || reorder_quantity < 0) messageRedirect(returnTo, "error", "Negative inventory values are not allowed.");

  const before = await prisma.product.findUnique({ where: { id }, select: { stock_quantity: true, reorder_level: true, reorder_quantity: true, stock_status: true, name: true } });
  if (!before) messageRedirect(returnTo, "error", "Product not found.");
  const stock_status = stockStatusForQuantity(stock_quantity, before.stock_status);
  const delta = stock_quantity - before.stock_quantity;
  try {
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: { stock_quantity, reorder_level, reorder_quantity, stock_status } }),
      prisma.stockMovement.create({ data: { product_id: id, delta, reason, reference, user_id: session.userId } }),
      prisma.auditLog.create({
        data: {
          user_id: session.userId,
          entity: "Product",
          entity_id: id,
          action: "inventory_control.adjust",
          before,
          after: { stock_quantity, reorder_level, reorder_quantity, stock_status, reason, reference }
        }
      })
    ]);
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Stock movement could not be saved."));
  }
  revalidateStorefront();
  revalidatePath("/admin/inventory");
  messageRedirect(returnTo, "success", `${before.name} stock ${delta === 0 ? "confirmed" : "updated"}.`);
}

export async function createStockTransferAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const returnTo = String(formData.get("return_to") ?? "/admin/inventory");
  const source = nullableString(formData.get("source_location"));
  const destination = nullableString(formData.get("destination_location"));
  const transferDate = nullableString(formData.get("transfer_date"));
  const status = String(formData.get("status") ?? "submitted");
  if (!source || !destination) messageRedirect(returnTo, "error", "Source and destination are required.");
  if (source === destination) messageRedirect(returnTo, "error", "Source and destination cannot be the same.");
  const rows = Array.from({ length: 6 }, (_, index) => ({
    productId: nullableString(formData.get(`transfer_product_id_${index}`)),
    quantity: Number(formData.get(`transfer_quantity_${index}`) ?? 0)
  })).filter((row): row is { productId: string; quantity: number } => Boolean(row.productId));
  if (!rows.length) messageRedirect(returnTo, "error", "Add at least one inventory item.");
  if (rows.some((row) => !Number.isFinite(row.quantity) || row.quantity <= 0)) messageRedirect(returnTo, "error", "Transfer quantities must be positive.");
  if (!["draft", "submitted", "in_transit"].includes(status)) messageRedirect(returnTo, "error", "Invalid initial transfer status.");
  try {
    const transferNumber = `TRF-${new Date().getFullYear()}-${Date.now()}`;
    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: rows.map((row) => row.productId) } }, select: { id: true, name: true, stock_quantity: true, stock_status: true } });
      const productMap = new Map(products.map((product) => [product.id, product]));
      for (const row of rows) {
        const product = productMap.get(row.productId);
        if (!product) throw new Error("Transfer includes a product that does not exist.");
        if (product.stock_status !== "backorder" && product.stock_quantity < row.quantity) throw new Error(`${product.name} has only ${product.stock_quantity} units available.`);
      }
      const transfer = await tx.stockTransfer.create({
        data: {
          transfer_number: transferNumber,
          source_location: source,
          destination_location: destination,
          status,
          transfer_date: transferDate ? new Date(`${transferDate}T00:00:00.000Z`) : new Date(),
          notes: nullableString(formData.get("notes")),
          responsible_user_id: nullableString(formData.get("responsible_user_id")) ?? session.userId,
          created_by_id: session.userId,
          submitted_at: status === "draft" ? null : new Date(),
          items: { create: rows.map((row) => ({ product_id: row.productId, quantity: row.quantity, available_at_submit: productMap.get(row.productId)?.stock_quantity })) }
        },
        include: { items: true }
      });
      if (status !== "draft") {
        for (const row of rows) {
          const product = productMap.get(row.productId)!;
          const nextQuantity = product.stock_quantity - row.quantity;
          const update = product.stock_status === "backorder"
            ? await tx.product.update({ where: { id: row.productId }, data: { stock_quantity: { decrement: row.quantity } } })
            : await tx.product.updateMany({ where: { id: row.productId, stock_quantity: { gte: row.quantity } }, data: { stock_quantity: { decrement: row.quantity }, stock_status: nextQuantity > 0 ? "in_stock" : "out_of_stock" } });
          if ("count" in update && update.count !== 1) throw new Error(`${product.name} stock changed while submitting the transfer.`);
          await tx.stockMovement.create({ data: { product_id: row.productId, delta: -row.quantity, reason: "CORRECTION", reference: `Stock transfer ${transfer.transfer_number}: ${source} to ${destination}`, user_id: session.userId } });
        }
      }
      await tx.auditLog.create({ data: { user_id: session.userId, entity: "StockTransfer", entity_id: transfer.id, action: "stock_transfer.create", after: { transfer_number: transfer.transfer_number, status, source, destination, items: rows } } });
    });
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Stock transfer could not be created."));
  }
  revalidateStorefront();
  revalidatePath("/admin/inventory");
  messageRedirect(returnTo, "success", "Stock transfer saved.");
}

export async function updateStockTransferStatusAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) messageRedirect("/admin/inventory", "error", "Transfer id is required.");
  if (!["submitted", "in_transit", "received", "completed", "cancelled"].includes(status)) messageRedirect("/admin/inventory", "error", "Invalid transfer status.");
  try {
    await prisma.stockTransfer.update({
      where: { id },
      data: {
        status,
        submitted_at: ["submitted", "in_transit", "received", "completed"].includes(status) ? new Date() : undefined,
        received_at: ["received", "completed"].includes(status) ? new Date() : undefined,
        cancelled_at: status === "cancelled" ? new Date() : undefined
      }
    });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "StockTransfer", entity_id: id, action: "stock_transfer.status", after: { status } } });
  } catch (error) {
    messageRedirect("/admin/inventory", "error", prismaMessage(error, "Transfer status could not be updated."));
  }
  revalidatePath("/admin/inventory");
  messageRedirect("/admin/inventory", "success", "Transfer status updated.");
}

export async function createStockTakeAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const name = nullableString(formData.get("name"));
  const location = nullableString(formData.get("location"));
  const date = nullableString(formData.get("stock_take_date"));
  if (!name || !location) messageRedirect("/admin/inventory?view=stock-takes", "error", "Stock take name and location are required.");
  try {
    const products = await prisma.product.findMany({ where: { archived_at: null }, select: { id: true, stock_quantity: true } });
    const number = `STK-${new Date().getFullYear()}-${Date.now()}`;
    const stockTake = await prisma.stockTake.create({
      data: {
        stock_take_number: number,
        name,
        location,
        status: "in_progress",
        stock_take_date: date ? new Date(`${date}T00:00:00.000Z`) : new Date(),
        assigned_user_id: nullableString(formData.get("assigned_user_id")) ?? session.userId,
        created_by_id: session.userId,
        started_at: new Date(),
        notes: nullableString(formData.get("notes")),
        items: { create: products.map((product) => ({ product_id: product.id, expected_quantity: product.stock_quantity })) }
      }
    });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "StockTake", entity_id: stockTake.id, action: "stock_take.create", after: { number, product_count: products.length } } });
  } catch (error) {
    messageRedirect("/admin/inventory?view=stock-takes", "error", prismaMessage(error, "Stock take could not be created."));
  }
  revalidatePath("/admin/inventory");
  messageRedirect("/admin/inventory?view=stock-takes", "success", "Stock take opened.");
}

export async function saveStockTakeCountsAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/inventory?view=stock-takes", "error", "Stock take id is required.");
  try {
    const stockTake = await prisma.stockTake.findUnique({ where: { id }, include: { items: true } });
    if (!stockTake) throw new Error("Stock take not found.");
    if (["completed", "cancelled"].includes(stockTake.status)) throw new Error("Completed or cancelled stock takes cannot be edited.");
    await prisma.$transaction(stockTake.items.map((item) => {
      const raw = formData.get(`counted_${item.id}`);
      const counted = raw === null || String(raw).trim() === "" ? null : Number(raw);
      if (counted !== null && (!Number.isFinite(counted) || counted < 0)) throw new Error("Counted quantities cannot be negative.");
      return prisma.stockTakeItem.update({
        where: { id: item.id },
        data: {
          counted_quantity: counted,
          variance_quantity: counted === null ? null : counted - item.expected_quantity,
          counted_at: counted === null ? null : new Date()
        }
      });
    }));
    await prisma.stockTake.update({ where: { id }, data: { status: "under_review", submitted_at: new Date() } });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "StockTake", entity_id: id, action: "stock_take.counts.save", after: { status: "under_review" } } });
  } catch (error) {
    messageRedirect("/admin/inventory?view=stock-takes", "error", prismaMessage(error, "Stock take counts could not be saved."));
  }
  revalidatePath("/admin/inventory");
  messageRedirect("/admin/inventory?view=stock-takes", "success", "Stock take counts saved for review.");
}

export async function reconcileStockTakeAction(formData: FormData) {
  const session = await requireCapability("stock", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/inventory?view=stock-takes", "error", "Stock take id is required.");
  try {
    await prisma.$transaction(async (tx) => {
      const stockTake = await tx.stockTake.findUnique({ where: { id }, include: { items: { include: { product: true } } } });
      if (!stockTake) throw new Error("Stock take not found.");
      if (stockTake.status === "completed") throw new Error("Stock take is already completed.");
      if (stockTake.status === "cancelled") throw new Error("Cancelled stock takes cannot be reconciled.");
      for (const item of stockTake.items) {
        if (item.counted_quantity === null) throw new Error("All stock take items need counted quantities before reconciliation.");
        const variance = item.counted_quantity - item.product.stock_quantity;
        await tx.product.update({ where: { id: item.product_id }, data: { stock_quantity: item.counted_quantity, stock_status: stockStatusForQuantity(item.counted_quantity, item.product.stock_status) } });
        await tx.stockTakeItem.update({ where: { id: item.id }, data: { approved_quantity: item.counted_quantity, variance_quantity: item.counted_quantity - item.expected_quantity, reconciled_at: new Date() } });
        if (variance !== 0) await tx.stockMovement.create({ data: { product_id: item.product_id, delta: variance, reason: "CORRECTION", reference: `Stock take ${stockTake.stock_take_number}`, user_id: session.userId } });
      }
      await tx.stockTake.update({ where: { id }, data: { status: "completed", approved_by_id: session.userId, completed_at: new Date() } });
      await tx.auditLog.create({ data: { user_id: session.userId, entity: "StockTake", entity_id: id, action: "stock_take.reconcile", after: { status: "completed" } } });
    });
  } catch (error) {
    messageRedirect("/admin/inventory?view=stock-takes", "error", prismaMessage(error, "Stock take could not be reconciled."));
  }
  revalidateStorefront();
  revalidatePath("/admin/inventory");
  messageRedirect("/admin/inventory?view=stock-takes", "success", "Stock take reconciled.");
}

export async function upsertBannerAction(formData: FormData) {
  const session = await requirePermission("storefront.banners.manage");
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/banners");
  const title = String(formData.get("title") ?? "").trim();
  const internalName = nullableString(formData.get("internal_name")) ?? title;
  const requestedKey = nullableString(formData.get("banner_key"));
  const slug = slugify((requestedKey ?? internalName ?? title ?? id) || "banner");
  const placement = normalizeBannerPlacement(formData.get("placement"));
  const isEnabled = formData.get("is_enabled") === "on";
  const categoryId = String(formData.get("category_id") ?? "") || null;
  const startsAt = parseDateTime(formData.get("starts_at"));
  const endsAt = parseDateTime(formData.get("ends_at"));
  if (startsAt && endsAt && startsAt >= endsAt) messageRedirect(returnTo, "error", "Start date/time must be before end date/time.");
  const destination = normalizeDestination(formData.get("destination_type") ?? formData.get("link_type"), formData.get("cta_href"));
  let image: string | null = null;
  let laptop_image: string | null = null;
  let mobile_image: string | null = null;
  let image_path: string | null = null;
  let laptop_image_path: string | null = null;
  let mobile_image_path: string | null = null;
  let image_variants: Array<{ slot: string; url: string; width: number; height: number; aspectRatio: string; shape?: string; focalMode?: string; focalX?: number; focalY?: number; crop?: string | null }> = [];
  try {
    const existingVariants = parseBannerVariants(formData.get("existing_image_variants"));
    const existingMaster = existingVariants.find((variant) => (variant as { slot?: unknown }).slot === "master") as { url?: string; width?: number; height?: number } | undefined;
    const uploadedMaster = await uploadedBannerMasterImageUrl(formData.get("master_image_file"), slug);
    const focalMode = String(formData.get("focal_mode") ?? "center");
    const focalX = Math.min(100, Math.max(0, Number(formData.get("focal_x") ?? (focalMode === "left" ? 25 : focalMode === "right" ? 75 : 50))));
    const focalY = Math.min(100, Math.max(0, Number(formData.get("focal_y") ?? 50)));
    const masterUrl = uploadedMaster?.url ?? existingMaster?.url ?? bannerImageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
    const masterWidth = uploadedMaster?.width ?? (Number(existingMaster?.width) || 1920);
    const masterHeight = uploadedMaster?.height ?? (Number(existingMaster?.height) || 720);
    const responsiveVariants = await bannerImageVariantsFromForm(formData, slug);

    image_variants = masterUrl ? [{
      slot: "master",
      url: masterUrl,
      width: masterWidth,
      height: masterHeight,
      aspectRatio: `${masterWidth}:${masterHeight}`,
      focalMode: focalMode === "left" || focalMode === "right" || focalMode === "custom" ? focalMode : "center",
      focalX: Number.isFinite(focalX) ? focalX : 50,
      focalY: Number.isFinite(focalY) ? focalY : 50,
      crop: nullableString(formData.get("crop_metadata"))
    }, ...responsiveVariants] : responsiveVariants;

    image = image_variants.find((variant) => variant.slot === "ultrawide")?.url
      ?? image_variants.find((variant) => variant.shape === "wide")?.url
      ?? masterUrl
      ?? bannerImageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
    laptop_image = image_variants.find((variant) => variant.slot === "landscape")?.url
      ?? image_variants.find((variant) => variant.shape === "mid")?.url
      ?? masterUrl
      ?? bannerImageValueFromForm(formData, "laptop_image", String(formData.get("existing_laptop_image") ?? "") || null);
    mobile_image = image_variants.find((variant) => variant.slot === "mobile")?.url
      ?? image_variants.find((variant) => variant.shape === "tall")?.url
      ?? masterUrl
      ?? bannerImageValueFromForm(formData, "mobile_image", String(formData.get("existing_mobile_image") ?? "") || null);
    image_path = String((image_variants.find((variant) => variant.slot === "ultrawide") as { path?: unknown } | undefined)?.path ?? "") || null;
    laptop_image_path = String((image_variants.find((variant) => variant.slot === "landscape") as { path?: unknown } | undefined)?.path ?? "") || null;
    mobile_image_path = String((image_variants.find((variant) => variant.slot === "mobile") as { path?: unknown } | undefined)?.path ?? "") || null;
  } catch (error) {
    await removeBannerStorageObjects([image, laptop_image, mobile_image, ...image_variants.map((variant) => variant.url)]).catch(() => undefined);
    messageRedirect(returnTo, "error", prismaMessage(error, "Banner image could not be uploaded."));
  }
  const payload = {
    banner_key: slug,
    internal_name: internalName,
    title,
    kicker: nullableString(formData.get("kicker")),
    body: String(formData.get("body") ?? "").trim(),
    cta_label: nullableString(formData.get("cta_label")),
    cta_href: destination.cta_href,
    destination_type: destination.destination_type,
    image,
    laptop_image,
    mobile_image,
    image_path,
    laptop_image_path,
    mobile_image_path,
    image_variants: image_variants as Prisma.InputJsonValue,
    alt_text: nullableString(formData.get("alt_text")) ?? title,
    mobile_focal_position: nullableString(formData.get("mobile_focal_position")) ?? "center center",
    landscape_focal_position: nullableString(formData.get("landscape_focal_position")) ?? "center center",
    ultrawide_focal_position: nullableString(formData.get("ultrawide_focal_position")) ?? "center center",
    text_position: bannerTextPosition(formData.get("text_position")),
    overlay_opacity: bannerOverlayOpacity(formData.get("overlay_opacity")),
    badge_enabled: formData.get("badge_enabled") === "on",
    badge_text: nullableString(formData.get("badge_text")),
    badge_color: bannerBadgeColor(formData.get("badge_color")),
    badge_position: bannerBadgePosition(formData.get("badge_position")),
    placement,
    category_id: categoryId,
    sort_order: Number(formData.get("sort_order") ?? 0),
    starts_at: startsAt,
    ends_at: endsAt,
    is_enabled: isEnabled,
    archived_at: null,
    updated_by_id: session.userId
  };
  if (!payload.title || !payload.body) messageRedirect(returnTo, "error", "Banner title and body are required.");
  if (payload.is_enabled && !payload.image) {
    messageRedirect(returnTo, "error", "A live banner requires a master banner image.");
  }
  try {
    if (id) {
      const before = await prisma.banner.findUnique({ where: { id }, select: { image: true, laptop_image: true, mobile_image: true, image_variants: true } });
      await prisma.$transaction([
        prisma.banner.update({ where: { id }, data: payload }),
        prisma.auditLog.create({ data: { user_id: session.userId, entity: "Banner", entity_id: id, action: "banner.update", before: before ?? {}, after: payload } })
      ]);
      const retained = new Set([payload.image, payload.laptop_image, payload.mobile_image, ...image_variants.map((variant) => variant.url)].filter(Boolean));
      const beforeVariants = parseBannerVariants(before?.image_variants ? JSON.stringify(before.image_variants) : null).map((variant) => typeof variant.url === "string" ? variant.url : null);
      await removeBannerStorageObjects([before?.image, before?.laptop_image, before?.mobile_image, ...beforeVariants].filter((url) => url && !retained.has(url)));
    } else {
      const created = await prisma.banner.create({ data: { ...payload, created_by_id: session.userId } });
      await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Banner", entity_id: created.id, action: "banner.create", after: payload } });
    }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Banner could not be saved."));
  }
  revalidateStorefront();
  revalidatePath("/admin/banners");
  revalidatePath("/admin/storefront/banners");
  messageRedirect(returnTo, "success", id ? "Banner updated." : "Banner created.");
}

export async function deleteBannerAction(formData: FormData) {
  return archiveBannerAction(formData);
}

export async function archiveBannerAction(formData: FormData) {
  const session = await requirePermission("storefront.banners.manage");
  const id = String(formData.get("id") ?? "");
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) messageRedirect("/admin/storefront/banners", "error", "Banner not found.");
  await prisma.$transaction([
    prisma.banner.update({ where: { id }, data: { is_enabled: false, archived_at: new Date(), updated_by_id: session.userId } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Banner", entity_id: id, action: "banner.archive", before: banner, after: { archived_at: "now", is_enabled: false } } })
  ]);
  revalidateStorefront();
  revalidatePath("/admin/storefront/banners");
  messageRedirect("/admin/storefront/banners", "success", "Banner archived.");
}

export async function restoreBannerAction(formData: FormData) {
  const session = await requirePermission("storefront.banners.manage");
  const id = String(formData.get("id") ?? "");
  const before = await prisma.banner.findUnique({ where: { id } });
  if (!before) messageRedirect("/admin/storefront/banners", "error", "Banner not found.");
  await prisma.$transaction([
    prisma.banner.update({ where: { id }, data: { archived_at: null, updated_by_id: session.userId } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Banner", entity_id: id, action: "banner.restore", before, after: { archived_at: null } } })
  ]);
  revalidateStorefront();
  revalidatePath("/admin/storefront/banners");
  messageRedirect("/admin/storefront/banners", "success", "Banner restored.");
}

export async function duplicateBannerAction(formData: FormData) {
  const session = await requirePermission("storefront.banners.manage");
  const id = String(formData.get("id") ?? "");
  const source = await prisma.banner.findUnique({ where: { id } });
  if (!source) messageRedirect("/admin/storefront/banners", "error", "Banner not found.");
  const copy = {
    banner_key: source.banner_key,
    internal_name: source.internal_name,
    title: source.title,
    kicker: source.kicker,
    body: source.body,
    cta_label: source.cta_label,
    cta_href: source.cta_href,
    destination_type: source.destination_type,
    image: source.image,
    laptop_image: source.laptop_image,
    mobile_image: source.mobile_image,
    image_path: source.image_path,
    laptop_image_path: source.laptop_image_path,
    mobile_image_path: source.mobile_image_path,
    image_variants: source.image_variants as Prisma.InputJsonValue,
    alt_text: source.alt_text,
    mobile_focal_position: source.mobile_focal_position,
    landscape_focal_position: source.landscape_focal_position,
    ultrawide_focal_position: source.ultrawide_focal_position,
    text_position: source.text_position,
    overlay_opacity: source.overlay_opacity,
    badge_enabled: source.badge_enabled,
    badge_text: source.badge_text,
    badge_color: source.badge_color,
    badge_position: source.badge_position,
    placement: source.placement,
    category_id: source.category_id,
    sort_order: source.sort_order,
    starts_at: source.starts_at,
    ends_at: source.ends_at
  };
  const created = await prisma.banner.create({
    data: {
      ...copy,
      banner_key: `${source.banner_key ?? slugify(source.title)}-copy-${crypto.randomUUID().slice(0, 8)}`,
      internal_name: `${source.internal_name ?? source.title} copy`,
      title: `${source.title} copy`,
      is_enabled: false,
      archived_at: null,
      created_by_id: session.userId,
      updated_by_id: session.userId
    }
  });
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Banner", entity_id: created.id, action: "banner.duplicate", before: { id }, after: { id: created.id, banner_key: created.banner_key } } });
  revalidateStorefront();
  revalidatePath("/admin/storefront/banners");
  messageRedirect(`/admin/storefront/banners?edit=${created.id}`, "success", "Banner duplicated as a draft.");
}

export async function updateDeliveryFeesAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  try {
    await prisma.$transaction(DELIVERY_REGIONS.map((region) => {
      const raw = String(formData.get(`delivery_fee_${region.value}`) ?? "0").replace(/[^\d]/g, "");
      const fee = Number.parseInt(raw || "0", 10);
      return prisma.deliveryFee.upsert({
        where: { region: region.value },
        update: { fee_kes: Number.isFinite(fee) ? Math.max(0, fee) : 0, is_enabled: formData.get(`delivery_enabled_${region.value}`) === "on" },
        create: { region: region.value, fee_kes: Number.isFinite(fee) ? Math.max(0, fee) : 0, is_enabled: formData.get(`delivery_enabled_${region.value}`) === "on" }
      });
    }));
  } catch (error) {
    messageRedirect("/admin/settings", "error", prismaMessage(error, "Delivery fees could not be updated."));
  }
  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
  messageRedirect("/admin/settings", "success", "Delivery fees updated.");
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}
