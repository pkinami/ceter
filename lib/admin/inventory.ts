import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin/auth";
import { stockStatusForQuantity } from "@/lib/admin/data";

type Tx = Prisma.TransactionClient;

export const DEFAULT_LOCATION_CODE = "MAIN";

export type InventoryPostInput = {
  productId: string;
  locationId: string;
  quantity: number;
  movementType:
    | "opening_balance"
    | "purchase_receipt"
    | "sale_issue"
    | "customer_return"
    | "supplier_return"
    | "positive_adjustment"
    | "negative_adjustment"
    | "transfer_out"
    | "transfer_in"
    | "stock_take_variance"
    | "reservation"
    | "reservation_release"
    | "backorder_allocation"
    | "cancellation_reversal"
    | "service_reservation"
    | "service_reservation_release"
    | "service_issue"
    | "service_return"
    | "warranty_issue"
    | "loan_unit_issue"
    | "loan_unit_return";
  sourceDocumentType: string;
  sourceDocumentId: string;
  sourceLineId?: string | null;
  reference: string;
  reason: string;
  userId?: string | null;
  branch?: string | null;
  correlationId: string;
  unitCostKes?: number | null;
  allowNegative?: boolean;
};

export async function ensureDefaultInventoryLocation(tx: Tx = prisma) {
  return tx.inventoryLocation.upsert({
    where: { code: DEFAULT_LOCATION_CODE },
    update: { is_active: true, is_default_receiving: true, is_default_dispatch: true },
    create: {
      code: DEFAULT_LOCATION_CODE,
      name: "Main Warehouse",
      branch: "Main",
      location_type: "main_warehouse",
      description: "Default audited inventory location",
      is_default_receiving: true,
      is_default_dispatch: true
    }
  });
}

export async function getOrCreateBalance(tx: Tx, productId: string, locationId: string) {
  return tx.inventoryBalance.upsert({
    where: { product_id_location_id: { product_id: productId, location_id: locationId } },
    update: {},
    create: { product_id: productId, location_id: locationId }
  });
}

export async function postInventoryMovement(tx: Tx, input: InventoryPostInput) {
  if (!Number.isFinite(input.quantity) || input.quantity === 0) throw new Error("Inventory movement quantity cannot be zero.");

  const existing = await tx.inventoryMovement.findFirst({
    where: {
      source_document_type: input.sourceDocumentType,
      source_document_id: input.sourceDocumentId,
      source_line_id: input.sourceLineId ?? null,
      movement_type: input.movementType,
      location_id: input.locationId,
      product_id: input.productId
    }
  });
  if (existing) return existing;

  const balance = await getOrCreateBalance(tx, input.productId, input.locationId);
  const currentOnHand = Number(balance.on_hand_quantity);
  const currentReserved = Number(balance.reserved_quantity);
  const isReservation = input.movementType === "reservation" || input.movementType === "service_reservation";
  const isReservationRelease = input.movementType === "reservation_release" || input.movementType === "service_reservation_release" || input.movementType === "cancellation_reversal";
  const isReservedSaleIssue = (input.movementType === "sale_issue" && input.sourceDocumentType === "OrderFulfilment") || input.movementType === "service_issue" || input.movementType === "warranty_issue" || input.movementType === "loan_unit_issue";
  const reservedDelta = isReservation ? input.quantity : isReservationRelease || isReservedSaleIssue ? -Math.abs(input.quantity) : 0;
  const onHandDelta = isReservation || isReservationRelease ? 0 : input.quantity;
  const nextOnHand = currentOnHand + onHandDelta;
  const nextReserved = currentReserved + reservedDelta;
  const nextAvailable = nextOnHand - nextReserved;
  if (!input.allowNegative && nextOnHand < 0) throw new Error("Negative stock is not allowed for this location.");
  if (nextReserved < 0) throw new Error("Reserved stock cannot become negative.");
  if (!input.allowNegative && nextAvailable < 0) throw new Error("Available stock is not sufficient for this reservation.");

  await tx.inventoryBalance.update({
    where: { product_id_location_id: { product_id: input.productId, location_id: input.locationId } },
    data: {
      on_hand_quantity: nextOnHand,
      reserved_quantity: nextReserved,
      available_quantity: nextAvailable
    }
  });
  const productTotals = await tx.inventoryBalance.aggregate({
    where: { product_id: input.productId },
    _sum: { on_hand_quantity: true }
  });
  const mirroredQuantity = Math.trunc(Number(productTotals._sum.on_hand_quantity ?? 0));
  await tx.product.update({
    where: { id: input.productId },
    data: {
      stock_quantity: mirroredQuantity,
      stock_status: stockStatusForQuantity(mirroredQuantity)
    }
  });

  return tx.inventoryMovement.create({
    data: {
      product_id: input.productId,
      location_id: input.locationId,
      quantity: input.quantity,
      movement_type: input.movementType,
      source_document_type: input.sourceDocumentType,
      source_document_id: input.sourceDocumentId,
      source_line_id: input.sourceLineId ?? null,
      reference: input.reference,
      reason: input.reason,
      user_id: input.userId ?? null,
      branch: input.branch ?? null,
      correlation_id: input.correlationId,
      unit_cost_kes: input.unitCostKes ?? null,
      running_balance: isReservation || isReservationRelease ? nextAvailable : nextOnHand
    }
  });
}

export async function recordAudit(tx: Tx, input: {
  userId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
}) {
  return tx.auditLog.create({
    data: {
      user_id: input.userId ?? null,
      entity: input.entity,
      entity_id: input.entityId,
      action: input.action,
      before: input.before ?? undefined,
      after: input.after ?? undefined
    }
  });
}

export async function postStockAdjustment(input: {
  session: AdminSession;
  productId: string;
  locationId: string;
  quantity: number;
  reason: Prisma.StockAdjustmentCreateInput["reason"];
  notes?: string | null;
  idempotencyKey: string;
}) {
  if (!Number.isFinite(input.quantity) || input.quantity === 0) throw new Error("Adjustment quantity cannot be zero.");
  if (Math.abs(input.quantity) >= 100 && !input.notes) throw new Error("Notes are required for exceptional adjustments.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stockAdjustment.findUnique({ where: { correlation_id: input.idempotencyKey } });
    if (existing) return existing;
    const adjustment = await tx.stockAdjustment.create({
      data: {
        adjustment_number: `ADJ-${new Date().getFullYear()}-${Date.now()}`,
        product_id: input.productId,
        location_id: input.locationId,
        quantity: input.quantity,
        reason: input.reason,
        notes: input.notes,
        correlation_id: input.idempotencyKey,
        posted_by_id: input.session.userId,
        posted_at: new Date()
      }
    });
    await postInventoryMovement(tx, {
      productId: input.productId,
      locationId: input.locationId,
      quantity: input.quantity,
      movementType: input.quantity > 0 ? "positive_adjustment" : "negative_adjustment",
      sourceDocumentType: "StockAdjustment",
      sourceDocumentId: adjustment.id,
      sourceLineId: adjustment.id,
      reference: adjustment.adjustment_number,
      reason: input.reason,
      userId: input.session.userId,
      branch: input.session.role,
      correlationId: input.idempotencyKey
    });
    await recordAudit(tx, {
      userId: input.session.userId,
      entity: "StockAdjustment",
      entityId: adjustment.id,
      action: "stock_adjustment.post",
      after: { quantity: input.quantity, reason: input.reason, correlation_id: input.idempotencyKey }
    });
    return adjustment;
  });
}

export async function createStockTransfer(input: {
  session: AdminSession;
  sourceLocationId: string;
  destinationLocationId: string;
  lines: Array<{ productId: string; quantity: number; serialNumbers?: string[] }>;
  notes?: string | null;
  idempotencyKey: string;
}) {
  if (input.sourceLocationId === input.destinationLocationId) throw new Error("Source and destination must differ.");
  if (!input.lines.length) throw new Error("Add at least one transfer line.");
  if (input.lines.some((line) => !Number.isFinite(line.quantity) || line.quantity <= 0)) throw new Error("Transfer quantities must be positive.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.stockTransfer.findUnique({ where: { correlation_id: input.idempotencyKey }, include: { lines: true } });
    if (existing) return existing;
    const [source, destination] = await Promise.all([
      tx.inventoryLocation.findUnique({ where: { id: input.sourceLocationId } }),
      tx.inventoryLocation.findUnique({ where: { id: input.destinationLocationId } })
    ]);
    if (!source || !destination) throw new Error("Transfer location was not found.");
    for (const line of input.lines) {
      const balance = await getOrCreateBalance(tx, line.productId, input.sourceLocationId);
      if (Number(balance.available_quantity) < line.quantity) throw new Error("Source location does not have enough available stock.");
    }
    const transfer = await tx.stockTransfer.create({
      data: {
        transfer_number: `TRF-${new Date().getFullYear()}-${Date.now()}`,
        source_location: source.name,
        destination_location: destination.name,
        source_location_id: source.id,
        destination_location_id: destination.id,
        status: "submitted",
        transfer_date: new Date(),
        responsible_user_id: input.session.userId,
        created_by_id: input.session.userId,
        submitted_at: new Date(),
        notes: input.notes,
        correlation_id: input.idempotencyKey,
        lines: { create: input.lines.map((line) => ({ product_id: line.productId, quantity: line.quantity, serial_numbers: line.serialNumbers ?? [] })) },
        status_history: { create: [{ to_status: "submitted", user_id: input.session.userId, correlation_id: input.idempotencyKey }] }
      },
      include: { lines: true }
    });
    await recordAudit(tx, { userId: input.session.userId, entity: "StockTransfer", entityId: transfer.id, action: "stock_transfer.create", after: { line_count: input.lines.length } });
    return transfer;
  });
}

export async function dispatchStockTransfer(session: AdminSession, transferId: string, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({ where: { id: transferId }, include: { lines: true } });
    if (!transfer || !transfer.source_location_id || !transfer.destination_location_id) throw new Error("Transfer was not found.");
    if (["dispatched", "in_transit", "partially_received", "received"].includes(transfer.status)) return transfer;
    if (!["submitted", "approved", "ready_for_dispatch"].includes(transfer.status)) throw new Error("Transfer is not ready for dispatch.");
    for (const line of transfer.lines) {
      await postInventoryMovement(tx, {
        productId: line.product_id,
        locationId: transfer.source_location_id,
        quantity: -Number(line.quantity),
        movementType: "transfer_out",
        sourceDocumentType: "StockTransfer",
        sourceDocumentId: transfer.id,
        sourceLineId: line.id,
        reference: transfer.transfer_number,
        reason: "Transfer dispatched",
        userId: session.userId,
        branch: session.role,
        correlationId: idempotencyKey
      });
      await tx.stockTransferLine.update({ where: { id: line.id }, data: { dispatched_quantity: line.quantity } });
    }
    const updated = await tx.stockTransfer.update({ where: { id: transfer.id }, data: { status: "in_transit", dispatched_by_id: session.userId, dispatched_at: new Date() } });
    await tx.stockTransferStatusHistory.create({ data: { stock_transfer_id: transfer.id, from_status: transfer.status, to_status: "in_transit", user_id: session.userId, correlation_id: idempotencyKey } });
    await recordAudit(tx, { userId: session.userId, entity: "StockTransfer", entityId: transfer.id, action: "stock_transfer.dispatch", after: { status: "in_transit" } });
    return updated;
  });
}

export async function receiveStockTransfer(session: AdminSession, transferId: string, receipts: Array<{ lineId: string; quantity: number }>, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const transfer = await tx.stockTransfer.findUnique({ where: { id: transferId }, include: { lines: true } });
    if (!transfer || !transfer.destination_location_id) throw new Error("Transfer was not found.");
    if (!["in_transit", "partially_received"].includes(transfer.status)) throw new Error("Transfer is not in transit.");
    const receiptMap = new Map(receipts.map((receipt) => [receipt.lineId, receipt.quantity]));
    for (const line of transfer.lines) {
      const quantity = receiptMap.get(line.id) ?? 0;
      if (quantity < 0 || quantity > Number(line.dispatched_quantity) - Number(line.received_quantity)) throw new Error("Transfer receipt exceeds dispatched remaining quantity.");
      if (quantity === 0) continue;
      await postInventoryMovement(tx, {
        productId: line.product_id,
        locationId: transfer.destination_location_id,
        quantity,
        movementType: "transfer_in",
        sourceDocumentType: "StockTransferReceipt",
        sourceDocumentId: transfer.id,
        sourceLineId: line.id,
        reference: transfer.transfer_number,
        reason: "Transfer received",
        userId: session.userId,
        branch: session.role,
        correlationId: idempotencyKey
      });
      await tx.stockTransferLine.update({ where: { id: line.id }, data: { received_quantity: { increment: quantity } } });
    }
    const fresh = await tx.stockTransfer.findUniqueOrThrow({ where: { id: transfer.id }, include: { lines: true } });
    const complete = fresh.lines.every((line) => Number(line.received_quantity) >= Number(line.dispatched_quantity));
    const status = complete ? "received" : "partially_received";
    const updated = await tx.stockTransfer.update({ where: { id: transfer.id }, data: { status, received_by_id: session.userId, received_at: complete ? new Date() : undefined } });
    await tx.stockTransferStatusHistory.create({ data: { stock_transfer_id: transfer.id, from_status: transfer.status, to_status: status, user_id: session.userId, correlation_id: idempotencyKey } });
    await recordAudit(tx, { userId: session.userId, entity: "StockTransfer", entityId: transfer.id, action: "stock_transfer.receive", after: { status } });
    return updated;
  });
}

export async function createStockTake(input: {
  session: AdminSession;
  locationId: string;
  name: string;
  productIds?: string[];
  blindCount?: boolean;
  idempotencyKey: string;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.stockTake.findUnique({ where: { correlation_id: input.idempotencyKey }, include: { lines: true } });
    if (existing) return existing;
    const location = await tx.inventoryLocation.findUnique({ where: { id: input.locationId } });
    if (!location) throw new Error("Stock-take location was not found.");
    const balances = await tx.inventoryBalance.findMany({
      where: { location_id: input.locationId, product_id: input.productIds?.length ? { in: input.productIds } : undefined },
      include: { product: { select: { id: true } } }
    });
    const stockTake = await tx.stockTake.create({
      data: {
        stock_take_number: `STK-${new Date().getFullYear()}-${Date.now()}`,
        name: input.name,
        location: location.name,
        location_id: location.id,
        status: "counting",
        stock_take_date: new Date(),
        assigned_user_id: input.session.userId,
        created_by_id: input.session.userId,
        started_at: new Date(),
        blind_count: Boolean(input.blindCount),
        correlation_id: input.idempotencyKey,
        lines: { create: balances.map((balance) => ({ product_id: balance.product_id, snapshot_quantity: balance.on_hand_quantity })) },
        status_history: { create: [{ to_status: "counting", user_id: input.session.userId, correlation_id: input.idempotencyKey }] }
      },
      include: { lines: true }
    });
    await recordAudit(tx, { userId: input.session.userId, entity: "StockTake", entityId: stockTake.id, action: "stock_take.create", after: { line_count: balances.length } });
    return stockTake;
  });
}

export async function postStockTake(session: AdminSession, stockTakeId: string, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const stockTake = await tx.stockTake.findUnique({ where: { id: stockTakeId }, include: { lines: true } });
    if (!stockTake || !stockTake.location_id) throw new Error("Stock take was not found.");
    if (stockTake.status === "posted") return stockTake;
    if (!["submitted", "under_review", "approved"].includes(stockTake.status)) throw new Error("Stock take is not approved for posting.");
    for (const line of stockTake.lines) {
      if (line.counted_quantity === null) throw new Error("Every stock-take line needs a counted quantity.");
      const variance = Number(line.counted_quantity) - Number(line.snapshot_quantity);
      if (variance === 0) continue;
      await postInventoryMovement(tx, {
        productId: line.product_id,
        locationId: stockTake.location_id,
        quantity: variance,
        movementType: "stock_take_variance",
        sourceDocumentType: "StockTake",
        sourceDocumentId: stockTake.id,
        sourceLineId: line.id,
        reference: stockTake.stock_take_number,
        reason: line.reason ?? "Stock-take variance",
        userId: session.userId,
        branch: session.role,
        correlationId: idempotencyKey
      });
      await tx.stockTakeLine.update({ where: { id: line.id }, data: { variance_quantity: variance, posted_at: new Date(), reviewed_by_id: session.userId } });
    }
    const updated = await tx.stockTake.update({ where: { id: stockTake.id }, data: { status: "posted", approved_by_id: session.userId, completed_at: new Date(), posted_at: new Date() } });
    await recordAudit(tx, { userId: session.userId, entity: "StockTake", entityId: stockTake.id, action: "stock_take.post", after: { status: "posted" } });
    return updated;
  });
}

export function calculatePurchaseOrderTotals(lines: Array<{ quantity: number; unitCostKes: number; discountKes?: number; taxKes?: number }>) {
  return lines.reduce((totals, line) => {
    const net = Math.max(0, Math.round(line.quantity * line.unitCostKes) - (line.discountKes ?? 0));
    const tax = Math.max(0, line.taxKes ?? Math.round(net * 0.16));
    return { net: totals.net + net, tax: totals.tax + tax, gross: totals.gross + net + tax };
  }, { net: 0, tax: 0, gross: 0 });
}

export async function postGoodsReceipt(session: AdminSession, goodsReceiptId: string, idempotencyKey: string) {
  return prisma.$transaction(async (tx) => {
    const receipt = await tx.goodsReceipt.findUnique({ where: { id: goodsReceiptId }, include: { lines: true, purchase_order: { include: { lines: true } } } });
    if (!receipt) throw new Error("Goods receipt was not found.");
    if (receipt.status === "posted") return receipt;
    if (!["draft", "inspected", "partially_accepted"].includes(receipt.status)) throw new Error("Goods receipt cannot be posted from this status.");
    const orderLineMap = new Map(receipt.purchase_order.lines.map((line) => [line.id, line]));
    for (const line of receipt.lines) {
      const orderLine = orderLineMap.get(line.purchase_order_line_id);
      if (!orderLine) throw new Error("Goods receipt line does not match the purchase order.");
      const remaining = Number(orderLine.quantity) - Number(orderLine.received_quantity);
      if (Number(line.quantity_received) > remaining) throw new Error("Goods receipt cannot exceed the remaining order quantity.");
      await postInventoryMovement(tx, {
        productId: line.product_id,
        locationId: receipt.receiving_location_id,
        quantity: Number(line.quantity_received),
        movementType: "purchase_receipt",
        sourceDocumentType: "GoodsReceipt",
        sourceDocumentId: receipt.id,
        sourceLineId: line.id,
        reference: receipt.grn_number,
        reason: "Purchase receipt",
        userId: session.userId,
        branch: session.role,
        correlationId: idempotencyKey,
        unitCostKes: line.unit_cost_kes
      });
      await tx.purchaseOrderLine.update({ where: { id: line.purchase_order_line_id }, data: { received_quantity: { increment: line.quantity_received } } });
    }
    const freshLines = await tx.purchaseOrderLine.findMany({ where: { purchase_order_id: receipt.purchase_order_id } });
    const poStatus = freshLines.every((line) => Number(line.received_quantity) >= Number(line.quantity)) ? "fully_received" : "partially_received";
    await tx.purchaseOrder.update({ where: { id: receipt.purchase_order_id }, data: { status: poStatus } });
    const updated = await tx.goodsReceipt.update({ where: { id: receipt.id }, data: { status: "posted", posted_by_id: session.userId, posted_at: new Date(), correlation_id: receipt.correlation_id ?? idempotencyKey } });
    await recordAudit(tx, { userId: session.userId, entity: "GoodsReceipt", entityId: receipt.id, action: "goods_receipt.post", after: { status: "posted", purchase_order_status: poStatus } });
    return updated;
  });
}

export async function reconcileInventory() {
  const rows = await prisma.product.findMany({
    where: { archived_at: null },
    select: {
      id: true,
      name: true,
      sku: true,
      stock_quantity: true,
      reorder_level: true,
      reorder_quantity: true,
      inventory_balances: true,
      inventory_movements: true,
      serial_numbers: true
    },
    orderBy: { name: "asc" },
    take: 300
  });
  const nonOnHandMovementTypes = new Set([
    "reservation",
    "reservation_release",
    "service_reservation",
    "service_reservation_release",
    "cancellation_reversal"
  ]);
  return rows.map((product) => {
    const balanceTotal = product.inventory_balances.reduce((sum, balance) => sum + Number(balance.on_hand_quantity), 0);
    const movementTotal = product.inventory_movements
      .filter((movement) => !nonOnHandMovementTypes.has(movement.movement_type))
      .reduce((sum, movement) => sum + Number(movement.quantity), 0);
    const serialAvailable = product.serial_numbers.filter((serial) => serial.status === "available").length;
    const issues = [
      product.inventory_movements.length === 0 && product.stock_quantity !== 0 ? "missing_opening_balance" : null,
      balanceTotal !== movementTotal ? "balance_mismatch" : null,
      balanceTotal < 0 ? "negative_balance" : null,
      serialAvailable > 0 && serialAvailable !== balanceTotal ? "serial_mismatch" : null
    ].filter(Boolean) as string[];
    return {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      productQuantity: product.stock_quantity,
      balanceTotal,
      movementTotal,
      serialAvailable,
      status: issues.length ? "review_required" : "reconciled",
      issues
    };
  });
}
