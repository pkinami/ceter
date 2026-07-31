"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus, ProductCondition, QuoteStatus, StockStatus } from "@prisma/client";
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

export async function upsertProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
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
    images: parseImages(formData.get("images")),
    specs: parseSpecs(formData.get("specs")),
    is_featured: formData.get("is_featured") === "on"
  };

  if (id) {
    await prisma.product.update({ where: { id }, data: payload });
  } else {
    await prisma.product.create({ data: payload });
  }
  revalidatePath("/admin");
}

export async function deleteProductAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await prisma.product.delete({ where: { id } });
  revalidatePath("/admin");
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
