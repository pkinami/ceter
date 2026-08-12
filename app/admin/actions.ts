"use server";

import { revalidatePath } from "next/cache";
import type { HomepageSectionType, OrderStatus, Prisma, ProductCompatibilityType, ProductCondition, QuoteStatus, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/admin/auth";

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
  const session = await requireCapability("price", ["edit"]);
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
    mpn: nullableString(formData.get("mpn")),
    sku: nullableString(formData.get("sku")),
    cost_price_kes: nullableNumber(formData.get("cost_price_kes")),
    supplier_name: nullableString(formData.get("supplier_name")),
    supplier_lead_time_days: nullableNumber(formData.get("supplier_lead_time_days")),
    reorder_level: Number(formData.get("reorder_level") ?? 0),
    reorder_quantity: Number(formData.get("reorder_quantity") ?? 0),
    is_published: formData.get("is_published") === "on",
    condition: String(formData.get("condition") ?? "new") as ProductCondition,
    stock_status: String(formData.get("stock_status") ?? "in_stock") as StockStatus,
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    images: productImages,
    specs: parseSpecs(formData.get("specs")),
    is_featured: formData.get("is_featured") === "on"
  };

  if (payload.price_kes < 0 || payload.stock_quantity < 0 || (payload.cost_price_kes ?? 0) < 0) throw new Error("Negative stock and prices are not allowed.");
  if (id) {
    const before = await prisma.product.findUnique({ where: { id } });
    const updated = await prisma.product.update({ where: { id }, data: payload });
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
    const created = await prisma.product.create({ data: payload });
    const writes: Prisma.PrismaPromise<unknown>[] = [
      prisma.priceHistory.create({ data: { product_id: created.id, price_kes: created.price_kes, changed_by: session.userId, note: "Opening price" } })
    ];
    if (created.stock_quantity > 0) {
      writes.push(prisma.stockMovement.create({ data: { product_id: created.id, delta: created.stock_quantity, reason: "OPENING_BALANCE", reference: "Product created", user_id: session.userId } }));
    }
    await prisma.$transaction(writes);
  }
  revalidateStorefront();
}

export async function deleteProductAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  await prisma.product.delete({ where: { id } });
  revalidateStorefront();
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
}

export async function upsertCategoryAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  const image = await imageValueFromForm(formData, "image", String(formData.get("existing_image") ?? "") || null);
  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: nullableString(formData.get("description")),
    icon: nullableString(formData.get("icon")),
    image
  };

  if (id) {
    await prisma.category.update({ where: { id }, data: payload });
  } else {
    await prisma.category.create({ data: payload });
  }
  revalidateStorefront();
}

export async function deleteCategoryAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  await prisma.category.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertBrandAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
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
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  await prisma.brand.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertServiceAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
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
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  await prisma.serviceEntry.delete({ where: { id } });
  revalidateStorefront();
}

export async function upsertHomepageSectionAction(formData: FormData) {
  await requireCapability("price", ["edit"]);
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
  await requireCapability("price", ["edit"]);
  const id = String(formData.get("id") ?? "");
  await prisma.homepageSection.delete({ where: { id } });
  revalidateStorefront();
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

      const data: { stock_quantity?: number; price_kes?: number; cost_price_kes?: number | null; mpn?: string | null } = {};
      if (edit.stock_quantity !== undefined) data.stock_quantity = edit.stock_quantity;
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
        : { stock_quantity: Number(value) };
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

export async function upsertCompatibilityAction(input: { printerId: string; consumableId: string; relationType: ProductCompatibilityType }) {
  const session = await requireCapability("price", ["edit"]);
  if (input.printerId === input.consumableId) throw new Error("A product cannot be compatible with itself.");
  const mapping = await prisma.productCompatibility.upsert({
    where: { printer_id_consumable_id_relation_type: { printer_id: input.printerId, consumable_id: input.consumableId, relation_type: input.relationType } },
    create: { printer_id: input.printerId, consumable_id: input.consumableId, relation_type: input.relationType },
    update: {}
  });
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "ProductCompatibility", entity_id: mapping.id, action: "compatibility.attach", before: {}, after: input } });
  revalidateStorefront();
  return mapping;
}

export async function deleteCompatibilityAction(id: string) {
  const session = await requireCapability("price", ["edit"]);
  const before = await prisma.productCompatibility.findUnique({ where: { id } });
  if (!before) return;
  await prisma.productCompatibility.delete({ where: { id } });
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "ProductCompatibility", entity_id: id, action: "compatibility.remove", before, after: {} } });
  revalidateStorefront();
}

function nullableNumber(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? Number(text) : null;
}

function revalidateStorefront() {
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/category");
  revalidatePath("/category/[slug]", "page");
}
