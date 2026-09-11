"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import {
  createStockTake,
  createStockTransfer,
  dispatchStockTransfer,
  ensureDefaultInventoryLocation,
  postGoodsReceipt,
  postStockTake,
  postStockAdjustment,
  receiveStockTransfer
} from "@/lib/admin/inventory";

function text(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function numberValue(value: FormDataEntryValue | null) {
  const number = Number(value ?? 0);
  if (!Number.isFinite(number)) throw new Error("Quantity must be numeric.");
  return number;
}

function returnTo(formData: FormData, fallback: string) {
  return text(formData.get("return_to")) ?? fallback;
}

function idempotencyKey(formData: FormData) {
  return text(formData.get("idempotency_key")) ?? crypto.randomUUID();
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function createInventoryLocationAction(formData: FormData) {
  const session = await requirePermission("inventory.locations.manage");
  const path = returnTo(formData, "/admin/inventory/locations");
  try {
    const id = text(formData.get("id"));
    const name = text(formData.get("name"));
    const code = text(formData.get("code"))?.toUpperCase();
    if (!name || !code) throw new Error("Location name and code are required.");
    const data = {
      name,
      code,
      branch: text(formData.get("branch")),
      location_type: String(formData.get("location_type") ?? "main_warehouse") as never,
      description: text(formData.get("description")),
      address: text(formData.get("address")),
      is_active: formData.get("is_active") === "on",
      is_default_receiving: formData.get("is_default_receiving") === "on",
      is_default_dispatch: formData.get("is_default_dispatch") === "on"
    };
    const saved = id
      ? await prisma.inventoryLocation.update({ where: { id }, data })
      : await prisma.inventoryLocation.create({ data: { ...data, created_by_id: session.userId } });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "InventoryLocation", entity_id: saved.id, action: id ? "inventory_location.update" : "inventory_location.create", after: data } });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/inventory/locations");
  redirect(`${path}?success=${encodeURIComponent("Location saved.")}`);
}

export async function archiveInventoryLocationAction(formData: FormData) {
  const session = await requirePermission("inventory.locations.manage");
  const path = returnTo(formData, "/admin/inventory/locations");
  try {
    const id = String(formData.get("id") ?? "");
    const openTransfer = await prisma.stockTransfer.count({ where: { OR: [{ source_location_id: id }, { destination_location_id: id }], status: { in: ["draft", "submitted", "approved", "ready_for_dispatch", "in_transit", "partially_received"] } } });
    const openStockTake = await prisma.stockTake.count({ where: { location_id: id, status: { in: ["draft", "counting", "submitted", "under_review", "approved"] } } });
    if (openTransfer || openStockTake) throw new Error("Location has open transfers or stock takes.");
    await prisma.$transaction([
      prisma.inventoryLocation.update({ where: { id }, data: { is_active: false, archived_at: new Date() } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "InventoryLocation", entity_id: id, action: "inventory_location.archive", after: { archived: true } } })
    ]);
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/inventory/locations");
  redirect(`${path}?success=${encodeURIComponent("Location archived.")}`);
}

export async function postStockAdjustmentAction(formData: FormData) {
  const session = await requirePermission("inventory.adjust");
  const path = returnTo(formData, "/admin/inventory/adjustments");
  try {
    const locationId = text(formData.get("location_id")) ?? (await ensureDefaultInventoryLocation()).id;
    const productId = text(formData.get("product_id"));
    if (!productId) throw new Error("Product is required.");
    await postStockAdjustment({
      session,
      productId,
      locationId,
      quantity: numberValue(formData.get("quantity")),
      reason: String(formData.get("reason") ?? "data_correction") as never,
      notes: text(formData.get("notes")),
      idempotencyKey: idempotencyKey(formData)
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/ledger");
  redirect(`${path}?success=${encodeURIComponent("Stock adjustment posted.")}`);
}

export async function createStockTransferAction(formData: FormData) {
  const session = await requirePermission("inventory.transfer");
  const path = returnTo(formData, "/admin/inventory/transfers");
  try {
    const sourceLocationId = text(formData.get("source_location_id"));
    const destinationLocationId = text(formData.get("destination_location_id"));
    if (!sourceLocationId || !destinationLocationId) throw new Error("Source and destination are required.");
    const lines = Array.from({ length: 8 }, (_, index) => ({
      productId: text(formData.get(`product_id_${index}`)),
      quantity: numberValue(formData.get(`quantity_${index}`))
    })).filter((line): line is { productId: string; quantity: number } => Boolean(line.productId && line.quantity > 0));
    await createStockTransfer({ session, sourceLocationId, destinationLocationId, lines, notes: text(formData.get("notes")), idempotencyKey: idempotencyKey(formData) });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/inventory/transfers");
  redirect(`${path}?success=${encodeURIComponent("Transfer submitted.")}`);
}

export async function dispatchStockTransferAction(formData: FormData) {
  const session = await requirePermission("inventory.transfer");
  const path = returnTo(formData, "/admin/inventory/transfers");
  try {
    await dispatchStockTransfer(session, String(formData.get("id") ?? ""), idempotencyKey(formData));
  } catch (error) {
    fail(path, error);
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Transfer dispatched.")}`);
}

export async function receiveStockTransferAction(formData: FormData) {
  const session = await requirePermission("inventory.transfer");
  const path = returnTo(formData, "/admin/inventory/transfers");
  try {
    const receipts = Array.from(formData.entries())
      .filter(([key]) => key.startsWith("receive_"))
      .map(([key, value]) => ({ lineId: key.replace("receive_", ""), quantity: numberValue(value) }))
      .filter((line) => line.quantity > 0);
    await receiveStockTransfer(session, String(formData.get("id") ?? ""), receipts, idempotencyKey(formData));
  } catch (error) {
    fail(path, error);
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Transfer receipt recorded.")}`);
}

export async function createStockTakeAction(formData: FormData) {
  const session = await requirePermission("inventory.stock_take");
  const path = returnTo(formData, "/admin/inventory/stock-takes");
  try {
    const locationId = text(formData.get("location_id"));
    const name = text(formData.get("name"));
    if (!locationId || !name) throw new Error("Location and name are required.");
    await createStockTake({ session, locationId, name, blindCount: formData.get("blind_count") === "on", idempotencyKey: idempotencyKey(formData) });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/inventory/stock-takes");
  redirect(`${path}?success=${encodeURIComponent("Stock take opened.")}`);
}

export async function postStockTakeAction(formData: FormData) {
  const session = await requirePermission("inventory.reconcile");
  const path = returnTo(formData, "/admin/inventory/stock-takes");
  try {
    await postStockTake(session, String(formData.get("id") ?? ""), idempotencyKey(formData));
  } catch (error) {
    fail(path, error);
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Stock-take variance posted.")}`);
}

export async function saveStockTakeCountsAction(formData: FormData) {
  const session = await requirePermission("inventory.stock_take");
  const path = returnTo(formData, "/admin/inventory/stock-takes");
  try {
    const id = String(formData.get("id") ?? "");
    const stockTake = await prisma.stockTake.findUnique({ where: { id }, include: { lines: true } });
    if (!stockTake) throw new Error("Stock take was not found.");
    if (["posted", "cancelled"].includes(stockTake.status)) throw new Error("Posted or cancelled stock takes cannot be changed.");
    await prisma.$transaction(async (tx) => {
      for (const line of stockTake.lines) {
        const raw = formData.get(`counted_${line.id}`);
        if (raw === null || String(raw).trim() === "") continue;
        const counted = numberValue(raw);
        if (counted < 0) throw new Error("Counted quantity cannot be negative.");
        await tx.stockTakeLine.update({
          where: { id: line.id },
          data: {
            counted_quantity: counted,
            variance_quantity: counted - Number(line.snapshot_quantity),
            reason: text(formData.get(`reason_${line.id}`)),
            notes: text(formData.get(`notes_${line.id}`)),
            counted_by_id: session.userId,
            counted_at: new Date()
          }
        });
      }
      await tx.stockTake.update({ where: { id }, data: { status: "under_review", submitted_at: new Date() } });
      await tx.stockTakeStatusHistory.create({ data: { stock_take_id: id, from_status: stockTake.status, to_status: "under_review", user_id: session.userId, correlation_id: idempotencyKey(formData) } });
      await tx.auditLog.create({ data: { user_id: session.userId, entity: "StockTake", entity_id: id, action: "stock_take.counts.save", after: { status: "under_review" } } });
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath(path);
  redirect(`${path}?success=${encodeURIComponent("Stock-take counts saved.")}`);
}

export async function postGoodsReceiptAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  const path = returnTo(formData, "/admin/purchases/goods-received");
  try {
    await postGoodsReceipt(session, String(formData.get("id") ?? ""), idempotencyKey(formData));
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/purchases/goods-received");
  revalidatePath("/admin/inventory/ledger");
  redirect(`${path}?success=${encodeURIComponent("Goods receipt posted to inventory.")}`);
}
