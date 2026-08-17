"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BannerPlacement, OrderStatus, Prisma, ProductCondition, QuoteStatus, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/admin/auth";
import type { HomepageSectionType } from "@/lib/types";
import { revalidateStorefront } from "@/lib/storefront-revalidation";
import { stockStatusForQuantity } from "@/lib/admin/data";
import { DELIVERY_REGIONS } from "@/lib/delivery";
import { normalizePublicAssetUrl } from "@/lib/banner-schema";
import { createAdminClient } from "@/lib/supabase/admin";
import { BANNER_ALLOWED_TYPES, BANNER_IMAGE_SLOTS, BANNER_MAX_FILE_SIZE, HOMEPAGE_BANNER_LIMIT, HOMEPAGE_BANNER_REQUIREMENTS, type BannerImageSlot } from "@/lib/banner-requirements";

function parseImages(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return [];
  return text.split("\n").map((item) => item.trim()).filter(Boolean);
}

function parseSpecs(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return {};
  return Object.fromEntries(
    text.split("\n").map((line) => line.split(":")).filter((pair) => pair.length >= 2).map(([key, ...rest]) => [key.trim(), rest.join(":").trim()])
  );
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
  if (!file.type.startsWith("image/")) throw new Error("Product image upload must be an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Product image uploads must be 5 MB or smaller.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || extensionForImageType(file.type);
  const path = `products/${slug}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createAdminClient();
  const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
  const { error } = await supabase.storage.from(bucket).upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000"
  });
  if (error) throw new Error(`Product image upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
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
  if (!value.startsWith("/banners/") && !/^https?:\/\//i.test(value)) throw new Error("Banner images must be uploaded files, public URLs, or files from /public/banners.");
  return value;
}

async function uploadedBannerImageUrl(file: FormDataEntryValue | null, slug: string, slot: BannerImageSlot) {
  if (!(file instanceof File) || file.size === 0) return null;
  const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
  if (!BANNER_ALLOWED_TYPES.includes(file.type as never)) throw new Error(`${requirement.label} must be JPG, PNG, or WebP.`);
  if (file.size > BANNER_MAX_FILE_SIZE) throw new Error(`${requirement.label} must be 3 MB or smaller.`);

  const bytes = Buffer.from(await file.arrayBuffer());
  const dimensions = imageDimensions(bytes, file.type);
  if (!dimensions) throw new Error(`${requirement.label} dimensions could not be read.`);
  if (dimensions.width !== requirement.width || dimensions.height !== requirement.height) {
    throw new Error(`${requirement.label} must be exactly ${requirement.width}x${requirement.height}px (${requirement.aspectRatio}). Selected image is ${dimensions.width}x${dimensions.height}px.`);
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || extensionForImageType(file.type);
  const path = `banners/${slug}/${slot}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createAdminClient();
  const bucket = process.env.SUPABASE_BANNER_IMAGES_BUCKET || "banner-images";
  const { error } = await retrySupabaseStorageWrite(() => supabase.storage.from(bucket).upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
    cacheControl: "31536000"
  }));
  if (error) throw new Error(`Banner image upload failed: ${error.message}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
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

async function bannerImageVariantsFromForm(formData: FormData, slug: string) {
  const existing = new Map(parseBannerVariants(formData.get("existing_image_variants")).map((variant) => [String(variant.slot), variant]));
  const variants = [];
  for (const slot of BANNER_IMAGE_SLOTS) {
    const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
    const uploaded = await uploadedBannerImageUrl(formData.get(requirement.field), slug, slot);
    const url = uploaded ?? String((existing.get(slot) as { url?: unknown } | undefined)?.url ?? "").trim();
    if (!url) continue;
    variants.push({
      slot,
      url,
      width: requirement.width,
      height: requirement.height,
      aspectRatio: requirement.aspectRatio,
      shape: requirement.shape
    });
  }
  return variants;
}

function bannerImagesBucket() {
  return process.env.SUPABASE_BANNER_IMAGES_BUCKET || "banner-images";
}

function productImagesBucket() {
  return process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";
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
  const session = await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
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
  const selectedPrimaryImage = uploadedImage ?? primaryImageUrl;
  const replacedPrimaryImage = uploadedImage ? primaryImageUrl : null;
  const productImages = selectedPrimaryImage
    ? [selectedPrimaryImage, ...images.filter((image) => image !== selectedPrimaryImage && image !== replacedPrimaryImage)]
    : images;
  const payload = {
    name,
    slug,
    description: String(formData.get("description") ?? "").trim(),
    category_id: String(formData.get("category_id") ?? "") || null,
    brand_id: String(formData.get("brand_id") ?? "") || null,
    price_kes: Number(formData.get("price_kes") ?? 0),
    mpn: nullableString(formData.get("mpn")),
    sku: nullableString(formData.get("sku")),
    cost_price_kes: nullableNumber(formData.get("cost_price_kes")),
    supplier_name: nullableString(formData.get("supplier_name")),
    supplier_lead_time_days: nullableNumber(formData.get("supplier_lead_time_days")),
    reorder_level: Number(formData.get("reorder_level") ?? 0),
    reorder_quantity: Number(formData.get("reorder_quantity") ?? 0),
    is_published: formData.get("is_published") === "on",
    condition: String(formData.get("condition") ?? "new") as ProductCondition,
    stock_status: stockStatusForQuantity(Number(formData.get("stock_quantity") ?? 0), String(formData.get("stock_status") ?? "in_stock") as StockStatus),
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    images: productImages,
    specs: parseSpecs(formData.get("specs")),
    is_featured: formData.get("is_featured") === "on",
    show_offer_badge: formData.get("show_offer_badge") === "on",
    show_flash_sale_badge: formData.get("show_flash_sale_badge") === "on"
  };

  if (!payload.description) messageRedirect(returnTo, "error", "Product description is required.");
  if (payload.price_kes < 0 || payload.stock_quantity < 0 || (payload.cost_price_kes ?? 0) < 0) messageRedirect(returnTo, "error", "Negative stock and prices are not allowed.");
  let savedId = id;
  let savedCategorySlug: string | null = null;
  try {
  if (id) {
    const before = await prisma.product.findUnique({ where: { id } });
    const updated = await prisma.product.update({
      where: { id },
      data: payload,
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
    if (before && before.stock_quantity !== updated.stock_quantity) {
      writes.push(prisma.stockMovement.create({ data: { product_id: id, delta: updated.stock_quantity - before.stock_quantity, reason: "CORRECTION", reference: "Product form", user_id: session.userId } }));
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
  messageRedirect(savedId ? `/admin/products/${savedId}/edit` : "/admin/products", "success", id ? "Product updated." : "Product created.");
}

export async function deleteProductAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/products", "error", "Product id is required.");
  const product = await prisma.product.findUnique({
    where: { id },
    select: { slug: true, images: true, category: { select: { slug: true } } }
  });
  try {
    await prisma.product.delete({ where: { id } });
    await removeProductStorageObjects(productImageUrls(product?.images));
  } catch (error) {
    messageRedirect("/admin/products", "error", prismaMessage(error, "Product could not be deleted."));
  }
  revalidateStorefront([product?.slug ? `/product/${product.slug}` : null, product?.category?.slug ? `/category/${product.category.slug}` : null]);
  messageRedirect("/admin/products", "success", "Product deleted.");
}

export async function updateProductPublicationAction(formData: FormData) {
  const session = await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "") as "publish" | "unpublish" | "archive";
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
  await requireCapability("price", ["edit"]);
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
  }

  try {
  if (id) {
    await prisma.category.update({ where: { id }, data: payload });
  } else {
    await prisma.category.create({ data: payload });
  }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Category could not be saved."));
  }
  revalidateStorefront();
  messageRedirect("/admin/categories", "success", id ? "Category updated." : "Category created.");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/categories", "error", "Category id is required.");
  const [children, products] = await Promise.all([
    prisma.category.count({ where: { parent_id: id } }),
    prisma.product.count({ where: { category_id: id, archived_at: null } })
  ]);
  if (children) messageRedirect("/admin/categories", "error", "Move or delete child categories before deleting this category.");
  if (products) messageRedirect("/admin/categories", "error", "Move products out of this category before deleting it.");
  try {
    await prisma.category.delete({ where: { id } });
  } catch (error) {
    messageRedirect("/admin/categories", "error", prismaMessage(error, "Category could not be deleted."));
  }
  revalidateStorefront();
  messageRedirect("/admin/categories", "success", "Category deleted.");
}

export async function upsertBrandAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
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
    await prisma.brand.update({ where: { id }, data: payload });
  } else {
    await prisma.brand.create({ data: payload });
  }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Brand could not be saved."));
  }
  revalidateStorefront();
  messageRedirect("/admin/brands", "success", id ? "Brand updated." : "Brand created.");
}

export async function deleteBrandAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/brands", "error", "Brand id is required.");
  const products = await prisma.product.count({ where: { brand_id: id, archived_at: null } });
  if (products) messageRedirect("/admin/brands", "error", "Move products out of this brand before deleting it.");
  try {
    await prisma.brand.delete({ where: { id } });
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
  await requireCapability("price", ["edit"]);
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
      await prisma.homepageSection.update({ where: { id }, data: payload });
    } else {
      await prisma.homepageSection.create({ data: payload });
    }
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Homepage section could not be saved."));
  }
  revalidateStorefront();
  messageRedirect("/admin/homepage", "success", id ? "Homepage section updated." : "Homepage section created.");
}

export async function deleteHomepageSectionAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  if (!id) messageRedirect("/admin/homepage", "error", "Homepage section id is required.");
  try {
    await prisma.homepageSection.delete({ where: { id } });
  } catch (error) {
    messageRedirect("/admin/homepage", "error", prismaMessage(error, "Homepage section could not be deleted."));
  }
  revalidateStorefront();
  messageRedirect("/admin/homepage", "success", "Homepage section deleted.");
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

export async function upsertBannerAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "/admin/banners");
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(title || id || "banner");
  const placement = String(formData.get("placement") ?? "main") as BannerPlacement;
  const isEnabled = formData.get("is_enabled") === "on";
  const categoryId = String(formData.get("category_id") ?? "") || null;
  if (isEnabled && placement === "main") {
    const liveCount = await prisma.banner.count({ where: { placement: "main", is_enabled: true, id: id ? { not: id } : undefined } });
    if (liveCount >= HOMEPAGE_BANNER_LIMIT) messageRedirect(returnTo, "error", `Only ${HOMEPAGE_BANNER_LIMIT} live homepage banners are allowed. Disable or delete one before enabling another.`);
  }
  let image: string | null = null;
  let laptop_image: string | null = null;
  let mobile_image: string | null = null;
  let image_variants: Array<{ slot: string; url: string; width: number; height: number; aspectRatio: string; shape: string }> = [];
  try {
    image_variants = await bannerImageVariantsFromForm(formData, slug);
    image = image_variants.find((variant) => variant.slot === "wide_1600")?.url
      ?? image_variants.find((variant) => variant.shape === "wide")?.url
      ?? bannerImageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
    laptop_image = image_variants.find((variant) => variant.slot === "mid_1280")?.url
      ?? image_variants.find((variant) => variant.shape === "mid")?.url
      ?? bannerImageValueFromForm(formData, "laptop_image", String(formData.get("existing_laptop_image") ?? "") || null);
    mobile_image = image_variants.find((variant) => variant.slot === "tall_720")?.url
      ?? image_variants.find((variant) => variant.shape === "tall")?.url
      ?? bannerImageValueFromForm(formData, "mobile_image", String(formData.get("existing_mobile_image") ?? "") || null);
  } catch (error) {
    await removeBannerStorageObjects([image, laptop_image, mobile_image, ...image_variants.map((variant) => variant.url)]).catch(() => undefined);
    messageRedirect(returnTo, "error", prismaMessage(error, "Banner image could not be uploaded."));
  }
  const payload = {
    title,
    kicker: nullableString(formData.get("kicker")),
    body: String(formData.get("body") ?? "").trim(),
    cta_label: nullableString(formData.get("cta_label")),
    cta_href: nullableString(formData.get("cta_href")),
    image,
    laptop_image,
    mobile_image,
    image_variants: image_variants as Prisma.InputJsonValue,
    placement,
    category_id: categoryId,
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_enabled: isEnabled
  };
  if (!payload.title || !payload.body) messageRedirect(returnTo, "error", "Banner title and body are required.");
  if (payload.is_enabled && image_variants.length < BANNER_IMAGE_SLOTS.length && (!payload.image || !payload.laptop_image || !payload.mobile_image)) {
    messageRedirect(returnTo, "error", "A live banner requires responsive variants. Upload all seven production sizes or keep the legacy wide, mid, and tall fallbacks.");
  }
  try {
    if (id) {
      const before = await prisma.banner.findUnique({ where: { id }, select: { image: true, laptop_image: true, mobile_image: true, image_variants: true } });
      await prisma.banner.update({ where: { id }, data: payload });
      const retained = new Set([payload.image, payload.laptop_image, payload.mobile_image, ...image_variants.map((variant) => variant.url)].filter(Boolean));
      const beforeVariants = parseBannerVariants(before?.image_variants ? JSON.stringify(before.image_variants) : null).map((variant) => typeof variant.url === "string" ? variant.url : null);
      await removeBannerStorageObjects([before?.image, before?.laptop_image, before?.mobile_image, ...beforeVariants].filter((url) => url && !retained.has(url)));
    } else await prisma.banner.create({ data: payload });
  } catch (error) {
    messageRedirect(returnTo, "error", prismaMessage(error, "Banner could not be saved."));
  }
  revalidateStorefront();
  revalidatePath("/admin/banners");
  messageRedirect("/admin/banners", "success", id ? "Banner updated." : "Banner created.");
}

export async function deleteBannerAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const banner = await prisma.banner.findUnique({ where: { id }, select: { image: true, laptop_image: true, mobile_image: true, image_variants: true } });
  await prisma.banner.delete({ where: { id } });
  const variants = parseBannerVariants(banner?.image_variants ? JSON.stringify(banner.image_variants) : null).map((variant) => typeof variant.url === "string" ? variant.url : null);
  await removeBannerStorageObjects([banner?.image, banner?.laptop_image, banner?.mobile_image, ...variants]);
  revalidateStorefront();
  revalidatePath("/admin/banners");
  messageRedirect("/admin/banners", "success", "Banner deleted.");
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
