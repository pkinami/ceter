"use server";

import { revalidatePath } from "next/cache";
import type { BannerPlacement, HomepageSectionType, OrderStatus, ProductCondition, QuoteStatus, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function parseImages(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return ["/product-placeholder.svg"];
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

async function imageValueFromForm(formData: FormData, field: string, fallback?: string | null) {
  const file = formData.get(`${field}_file`);
  if (file instanceof File && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    return `data:${file.type || "application/octet-stream"};base64,${bytes.toString("base64")}`;
  }
  return nullableString(formData.get(field)) ?? fallback ?? null;
}

export async function upsertProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const images = parseImages(formData.get("images"));
  const uploadedImage = await imageValueFromForm(formData, "primary_image");
  const productImages = uploadedImage ? [uploadedImage, ...images.filter((image) => image !== uploadedImage)] : images;
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    category_id: String(formData.get("category_id") ?? "") || null,
    brand_id: String(formData.get("brand_id") ?? "") || null,
    price_kes: Number(formData.get("price_kes") ?? 0),
    condition: String(formData.get("condition") ?? "new") as ProductCondition,
    stock_status: String(formData.get("stock_status") ?? "in_stock") as StockStatus,
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    images: productImages,
    specs: parseSpecs(formData.get("specs")),
    is_featured: formData.get("is_featured") === "on"
  };

  if (id) {
    await prisma.product.update({ where: { id }, data: payload });
  } else {
    await prisma.product.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.product.delete({ where: { id } });
  revalidateStorefront();
}

export async function updateOrderStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending") as OrderStatus;
  await prisma.order.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
}

export async function updateQuoteStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new") as QuoteStatus;
  await prisma.quoteRequest.update({ where: { id }, data: { status } });
  revalidatePath("/admin");
}

export async function upsertCategoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: nullableString(formData.get("description")),
    icon: nullableString(formData.get("icon"))
  };

  if (id) {
    await prisma.category.update({ where: { id }, data: payload });
  } else {
    await prisma.category.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteCategoryAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.category.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertBrandAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const icon = await imageValueFromForm(formData, "icon", String(formData.get("existing_icon") ?? "") || null);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    icon
  };

  if (id) {
    await prisma.brand.update({ where: { id }, data: payload });
  } else {
    await prisma.brand.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteBrandAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.brand.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertBannerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const image = await imageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    kicker: nullableString(formData.get("kicker")),
    body: String(formData.get("body") ?? "").trim(),
    cta_label: nullableString(formData.get("cta_label")),
    cta_href: nullableString(formData.get("cta_href")),
    image,
    placement: String(formData.get("placement") ?? "top") as BannerPlacement,
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_enabled: formData.get("is_enabled") === "on"
  };

  if (id) {
    await prisma.banner.update({ where: { id }, data: payload });
  } else {
    await prisma.banner.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteBannerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.banner.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertServiceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const image = await imageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
  const price = nullableString(formData.get("price_kes"));
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    image,
    price_kes: price ? Number(price) : null,
    show_request_quote: formData.get("show_request_quote") === "on",
    sort_order: Number(formData.get("sort_order") ?? 0),
    is_enabled: formData.get("is_enabled") === "on"
  };

  if (id) {
    await prisma.serviceEntry.update({ where: { id }, data: payload });
  } else {
    await prisma.serviceEntry.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteServiceAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.serviceEntry.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertHomepageSectionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    section_type: String(formData.get("section_type") ?? "category_products") as HomepageSectionType,
    category_id: String(formData.get("category_id") ?? "") || null,
    sort_order: Number(formData.get("sort_order") ?? 0),
    product_limit: Number(formData.get("product_limit") ?? 8),
    is_enabled: formData.get("is_enabled") === "on"
  };

  if (id) {
    await prisma.homepageSection.update({ where: { id }, data: payload });
  } else {
    await prisma.homepageSection.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteHomepageSectionAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.homepageSection.delete({ where: { id } });
  revalidateStorefront();
}

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/category");
}
