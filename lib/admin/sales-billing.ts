import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin/auth";
import { ensureDefaultInventoryLocation, postInventoryMovement, recordAudit } from "@/lib/admin/inventory";
import { brandedPdfBytes, documentCreateData, uploadBusinessDocument } from "@/lib/business/documents";
import { createBusinessNumber } from "@/lib/business/numbering";

export function cents(input: number) {
  if (!Number.isFinite(input)) throw new Error("Amount must be numeric.");
  return Math.max(0, Math.round(input));
}

export function calculateLineTotalKes(input: { quantity: number; unitPriceKes: number; discountKes?: number; vatRate?: number }) {
  const quantity = Math.max(0, Math.trunc(input.quantity));
  const grossBeforeTax = cents(quantity * cents(input.unitPriceKes) - cents(input.discountKes ?? 0));
  const vatKes = cents(grossBeforeTax * (input.vatRate ?? 0));
  return {
    netKes: grossBeforeTax,
    vatKes,
    totalKes: grossBeforeTax + vatKes
  };
}

export async function confirmOrderReservation(input: { session: AdminSession; orderId: string; locationId?: string | null; correlationId: string }) {
  return prisma.$transaction(async (tx) => {
    const location = input.locationId ? await tx.inventoryLocation.findUnique({ where: { id: input.locationId } }) : await ensureDefaultInventoryLocation(tx);
    if (!location) throw new Error("Inventory location was not found.");
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { order_items: true } });
    if (!order) throw new Error("Order was not found.");
    if (order.cancelled_at) throw new Error("Cancelled orders cannot be confirmed.");
    if (order.confirmed_at && order.reservation_key === input.correlationId) return order;

    for (const line of order.order_items) {
      if (!line.product_id) continue;
      const requested = Number(line.quantity);
      const alreadyReserved = Number(line.reserved_quantity);
      const needed = Math.max(0, requested - alreadyReserved);
      if (needed === 0) continue;
      const balance = await tx.inventoryBalance.findUnique({
        where: { product_id_location_id: { product_id: line.product_id, location_id: location.id } }
      });
      const available = Math.max(0, Number(balance?.available_quantity ?? 0));
      const reservable = Math.min(available, needed);
      const backordered = needed - reservable;
      if (reservable > 0) {
        await postInventoryMovement(tx, {
          productId: line.product_id,
          locationId: location.id,
          quantity: reservable,
          movementType: "reservation",
          sourceDocumentType: "OrderReservation",
          sourceDocumentId: order.id,
          sourceLineId: line.id,
          reference: order.order_number ?? order.id,
          reason: "Customer order reservation",
          userId: input.session.userId,
          branch: input.session.role,
          correlationId: input.correlationId
        });
      }
      if (backordered > 0) {
        await tx.salesBackorder.upsert({
          where: { correlation_id: `${input.correlationId}:${line.id}:backorder` },
          update: {},
          create: {
            order_id: order.id,
            order_item_id: line.id,
            customer_id: order.customer_id,
            product_id: line.product_id,
            location_id: location.id,
            requested_quantity: backordered,
            correlation_id: `${input.correlationId}:${line.id}:backorder`
          }
        });
      }
      await tx.orderItem.update({
        where: { id: line.id },
        data: {
          reserved_quantity: { increment: reservable },
          backordered_quantity: { increment: backordered },
          reservation_key: input.correlationId
        }
      });
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: "processing",
        fulfilment_status: "reserved",
        confirmed_at: order.confirmed_at ?? new Date(),
        inventory_location_id: location.id,
        reservation_key: input.correlationId
      }
    });
    await recordAudit(tx, { userId: input.session.userId, entity: "Order", entityId: order.id, action: "order.confirm_reserve", after: { correlation_id: input.correlationId, location_id: location.id } });
    return updated;
  });
}

export async function cancelOrderReservation(input: { session: AdminSession; orderId: string; reason: string; correlationId: string }) {
  if (!input.reason.trim()) throw new Error("Cancellation reason is required.");
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { order_items: true } });
    if (!order) throw new Error("Order was not found.");
    if (order.cancelled_at) return order;
    const locationId = order.inventory_location_id ?? (await ensureDefaultInventoryLocation(tx)).id;
    for (const line of order.order_items) {
      if (!line.product_id) continue;
      const reserved = Number(line.reserved_quantity);
      if (reserved > 0) {
        await postInventoryMovement(tx, {
          productId: line.product_id,
          locationId,
          quantity: reserved,
          movementType: "reservation_release",
          sourceDocumentType: "OrderCancellation",
          sourceDocumentId: order.id,
          sourceLineId: line.id,
          reference: order.order_number ?? order.id,
          reason: input.reason,
          userId: input.session.userId,
          branch: input.session.role,
          correlationId: input.correlationId
        });
      }
      await tx.orderItem.update({ where: { id: line.id }, data: { reserved_quantity: 0 } });
      await tx.salesBackorder.updateMany({
        where: { order_item_id: line.id, status: "open" },
        data: { status: "cancelled", cancelled_quantity: line.backordered_quantity }
      });
    }
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: "cancelled", fulfilment_status: "cancelled", delivery_status: "cancelled", cancelled_at: new Date() }
    });
    await recordAudit(tx, { userId: input.session.userId, entity: "Order", entityId: order.id, action: "order.cancel_release", after: { reason: input.reason, correlation_id: input.correlationId } });
    return updated;
  });
}

export async function fulfillOrder(input: { session: AdminSession; orderId: string; correlationId: string }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { order_items: true } });
    if (!order) throw new Error("Order was not found.");
    if (order.cancelled_at) throw new Error("Cancelled orders cannot be fulfilled.");
    const locationId = order.inventory_location_id ?? (await ensureDefaultInventoryLocation(tx)).id;
    for (const line of order.order_items) {
      if (!line.product_id) continue;
      const remaining = Number(line.quantity) - Number(line.fulfilled_quantity);
      const issuable = Math.min(remaining, Number(line.reserved_quantity));
      if (issuable <= 0) continue;
      await postInventoryMovement(tx, {
        productId: line.product_id,
        locationId,
        quantity: -issuable,
        movementType: "sale_issue",
        sourceDocumentType: "OrderFulfilment",
        sourceDocumentId: order.id,
        sourceLineId: line.id,
        reference: order.order_number ?? order.id,
        reason: "Customer order fulfilment",
        userId: input.session.userId,
        branch: input.session.role,
        correlationId: input.correlationId
      });
      await tx.orderItem.update({
        where: { id: line.id },
        data: { fulfilled_quantity: { increment: issuable }, reserved_quantity: { decrement: issuable } }
      });
    }
    const fresh = await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { order_items: true } });
    const fulfilled = fresh.order_items.every((line) => Number(line.fulfilled_quantity) >= Number(line.quantity));
    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: fulfilled ? "fulfilled" : "processing", fulfilment_status: fulfilled ? "fulfilled" : "partially_fulfilled" }
    });
    await recordAudit(tx, { userId: input.session.userId, entity: "Order", entityId: order.id, action: "order.fulfil", after: { correlation_id: input.correlationId, fulfilled } });
    return updated;
  });
}

export async function allocatePaymentToInvoice(input: { session: AdminSession; paymentId: string; invoiceId: string; amountKes: number; correlationId: string }) {
  const amountKes = cents(input.amountKes);
  if (amountKes <= 0) throw new Error("Allocation amount must be positive.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentAllocation.findFirst({ where: { payment_id: input.paymentId, invoice_id: input.invoiceId, correlation_id: input.correlationId } });
    if (existing) return existing;
    const [payment, invoice] = await Promise.all([
      tx.payment.findUnique({ where: { id: input.paymentId } }),
      tx.invoice.findUnique({ where: { id: input.invoiceId } })
    ]);
    if (!payment || payment.status !== "posted") throw new Error("Only posted payments can be allocated.");
    if (!invoice || invoice.customer_id !== payment.customer_id) throw new Error("Invoice and payment must belong to the same customer.");
    const available = payment.unallocated_kes || payment.amount_kes;
    if (amountKes > available) throw new Error("Allocation exceeds the unallocated payment balance.");
    if (amountKes > invoice.balance_kes) throw new Error("Allocation exceeds the invoice balance.");
    const allocation = await tx.paymentAllocation.create({
      data: { payment_id: payment.id, invoice_id: invoice.id, customer_id: invoice.customer_id, amount_kes: amountKes, created_by_id: input.session.userId, correlation_id: input.correlationId }
    });
    const paid = invoice.paid_kes + amountKes;
    const balance = Math.max(0, invoice.total_kes - paid);
    await tx.invoice.update({ where: { id: invoice.id }, data: { paid_kes: paid, balance_kes: balance, status: balance === 0 ? "paid" : "partially_paid", payment_status: balance === 0 ? "paid" : "partially_paid" } });
    await tx.payment.update({ where: { id: payment.id }, data: { unallocated_kes: Math.max(0, available - amountKes) } });
    await recordAudit(tx, { userId: input.session.userId, entity: "PaymentAllocation", entityId: allocation.id, action: "payment.allocate", after: { amount_kes: amountKes, correlation_id: input.correlationId } });
    return allocation;
  });
}

export async function reversePayment(input: { session: AdminSession; paymentId: string; reason: string; correlationId: string }) {
  if (!input.reason.trim()) throw new Error("Reversal reason is required.");
  return prisma.$transaction(async (tx) => {
    const existing = await tx.paymentReversal.findUnique({ where: { correlation_id: input.correlationId } });
    if (existing) return existing;
    const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { allocations: true } });
    if (!payment || payment.status === "reversed") throw new Error("Payment cannot be reversed.");
    for (const allocation of payment.allocations.filter((item) => !item.reversed_at)) {
      const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: allocation.invoice_id } });
      const paid = Math.max(0, invoice.paid_kes - allocation.amount_kes);
      const balance = invoice.total_kes - paid;
      await tx.invoice.update({ where: { id: invoice.id }, data: { paid_kes: paid, balance_kes: balance, status: paid === 0 ? "sent" : "partially_paid", payment_status: paid === 0 ? "unpaid" : "partially_paid" } });
      await tx.paymentAllocation.update({ where: { id: allocation.id }, data: { reversed_at: new Date(), reversal_reason: input.reason } });
    }
    const reversal = await tx.paymentReversal.create({ data: { payment_id: payment.id, reason: input.reason, amount_kes: payment.amount_kes, reversed_by_id: input.session.userId, correlation_id: input.correlationId } });
    await tx.payment.update({ where: { id: payment.id }, data: { status: "reversed", reversed_at: new Date(), reversal_reason: input.reason, reversed_by_id: input.session.userId, unallocated_kes: 0 } });
    await recordAudit(tx, { userId: input.session.userId, entity: "Payment", entityId: payment.id, action: "payment.reverse", after: { reason: input.reason, correlation_id: input.correlationId } });
    return reversal;
  });
}

export async function createDeliveryFromOrder(input: { session: AdminSession; orderId: string; correlationId: string; scheduledDate?: Date | null }) {
  const delivery = await prisma.$transaction(async (tx) => {
    const existing = await tx.delivery.findUnique({ where: { correlation_id: input.correlationId } });
    if (existing) return existing;
    const order = await tx.order.findUnique({ where: { id: input.orderId }, include: { order_items: { include: { product: true } }, customer: true } });
    if (!order) throw new Error("Order was not found.");
    const delivery = await tx.delivery.create({
      data: {
        delivery_number: createBusinessNumber("DN"),
        order_id: order.id,
        customer_id: order.customer_id,
        status: "scheduled",
        delivery_method: order.fulfillment_method,
        scheduled_date: input.scheduledDate,
        delivery_address_snapshot: order.delivery_location ? { location: order.delivery_location, instructions: order.delivery_instructions } : Prisma.JsonNull,
        contact_snapshot: { name: order.delivery_name, phone: order.delivery_phone, email: order.delivery_email },
        correlation_id: input.correlationId,
        created_by_id: input.session.userId,
        lines: {
          create: order.order_items.map((line) => ({
            order_item_id: line.id,
            product_id: line.product_id,
            description: line.product?.name ?? line.service_label ?? "Order line",
            ordered_quantity: line.quantity,
            previous_delivered_quantity: line.fulfilled_quantity,
            delivery_quantity: Math.max(0, Number(line.quantity) - Number(line.fulfilled_quantity))
          }))
        }
      }
    });
    await tx.order.update({ where: { id: order.id }, data: { delivery_status: "scheduled" } });
    await recordAudit(tx, { userId: input.session.userId, entity: "Delivery", entityId: delivery.id, action: "delivery.create", after: { order_id: order.id, correlation_id: input.correlationId } });
    return delivery;
  });
  await ensureDeliveryNoteDocument(delivery.id, input.session.userId);
  return delivery;
}

async function ensureDeliveryNoteDocument(deliveryId: string, userId: string) {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: { order: true, customer: true, lines: true, documents: true }
  });
  if (!delivery || delivery.documents.some((document) => document.document_type === "delivery_note")) return;
  const pdf = await brandedPdfBytes({
    type: "delivery_note",
    title: "Delivery Note",
    number: delivery.delivery_number,
    meta: [
      ["Order", delivery.order.order_number],
      ["Status", delivery.status],
      ["Method", delivery.delivery_method],
      ["Scheduled", delivery.scheduled_date?.toLocaleDateString("en-KE")]
    ],
    customerName: delivery.customer?.name ?? delivery.order.delivery_name ?? "Storefront customer",
    customerEmail: delivery.customer?.email ?? delivery.order.delivery_email,
    customerPhone: delivery.customer?.phone ?? delivery.order.delivery_phone,
    customerAddress: delivery.order.delivery_location,
    lines: delivery.lines.map((line) => ({
      description: line.description,
      quantity: Number(line.delivery_quantity),
      unitPrice: String(Number(line.ordered_quantity)),
      vat: "",
      total: ""
    })),
    footer: [delivery.notes, delivery.acknowledgement].filter(Boolean) as string[]
  });
  const storagePath = `delivery-notes/${delivery.delivery_number}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({
    data: documentCreateData({
      document_type: "delivery_note",
      document_number: delivery.delivery_number,
      title: `Delivery Note ${delivery.delivery_number}`,
      storage_path: storagePath,
      public_url: publicUrl,
      customer_id: delivery.customer_id,
      delivery_id: delivery.id,
      category: "customer",
      created_by_id: userId
    })
  });
}

export function verificationToken() {
  return randomBytes(32).toString("base64url");
}

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function markDocumentIssued(input: { session: AdminSession; documentId: string; documentNumber: string; contentSha256: string; token?: string }) {
  const token = input.token ?? verificationToken();
  const hash = tokenHash(token);
  const document = await prisma.document.update({
    where: { id: input.documentId },
    data: {
      document_number: input.documentNumber,
      operational_barcode: input.documentNumber,
      content_sha256: input.contentSha256,
      lifecycle_status: "issued",
      verification_status: "valid",
      verification_token_hash: hash,
      issued_at: new Date()
    }
  });
  await prisma.auditLog.create({ data: { user_id: input.session.userId, entity: "Document", entity_id: document.id, action: "document.issue", after: { document_number: input.documentNumber, token_hash: hash } } });
  return { document, token };
}
