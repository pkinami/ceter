"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { calculatePurchaseOrderTotals, recordAudit } from "@/lib/admin/inventory";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function intValue(value: FormDataEntryValue | null) {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  if (!Number.isFinite(parsed)) throw new Error("Amount must be numeric.");
  return parsed;
}

function qtyValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0"));
  if (!Number.isFinite(parsed)) throw new Error("Quantity must be numeric.");
  return parsed;
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "The request could not be completed.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function upsertSupplierAction(formData: FormData) {
  const session = await requirePermission("suppliers.manage");
  const path = text(formData.get("return_to")) ?? "/admin/suppliers";
  try {
    const id = text(formData.get("id"));
    const companyName = text(formData.get("company_name"));
    const email = text(formData.get("email"));
    const phone = text(formData.get("phone"));
    if (!companyName) throw new Error("Supplier name is required.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Supplier email is invalid.");
    if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) throw new Error("Supplier telephone is invalid.");
    const data = {
      supplier_code: text(formData.get("supplier_code")),
      company_name: companyName,
      trading_name: text(formData.get("trading_name")),
      contact_person: text(formData.get("contact_person")),
      phone,
      email,
      address: text(formData.get("address")),
      kra_pin: text(formData.get("kra_pin")),
      tax_status: text(formData.get("tax_status")),
      payment_terms: text(formData.get("payment_terms")),
      currency: text(formData.get("currency")) ?? "KES",
      is_preferred: formData.get("is_preferred") === "on",
      is_active: formData.get("is_active") !== "off",
      notes: text(formData.get("notes"))
    };
    const saved = id
      ? await prisma.supplier.update({ where: { id }, data })
      : await prisma.supplier.create({ data: { ...data, created_by_id: session.userId } });
    await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Supplier", entity_id: saved.id, action: id ? "supplier.update" : "supplier.create", after: { ...data, kra_pin: data.kra_pin ? "[redacted]" : null } } });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/suppliers");
  redirect(`${path}?success=${encodeURIComponent("Supplier saved.")}`);
}

export async function archiveSupplierAction(formData: FormData) {
  const session = await requirePermission("suppliers.manage");
  const path = text(formData.get("return_to")) ?? "/admin/suppliers";
  try {
    const id = String(formData.get("id") ?? "");
    const history = await prisma.purchaseOrder.count({ where: { supplier_id: id } });
    await prisma.$transaction([
      prisma.supplier.update({ where: { id }, data: { is_active: false, archived_at: new Date() } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Supplier", entity_id: id, action: "supplier.archive", after: { archived: true, history_preserved: history > 0 } } })
    ]);
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/suppliers");
  redirect(`${path}?success=${encodeURIComponent("Supplier archived.")}`);
}

export async function createPurchaseOrderAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  const path = text(formData.get("return_to")) ?? "/admin/purchases/orders";
  try {
    const supplierId = text(formData.get("supplier_id"));
    if (!supplierId) throw new Error("Supplier is required.");
    const lines = Array.from({ length: 8 }, (_, index) => ({
      productId: text(formData.get(`product_id_${index}`)),
      quantity: qtyValue(formData.get(`quantity_${index}`)),
      unitCostKes: intValue(formData.get(`unit_cost_kes_${index}`)),
      discountKes: intValue(formData.get(`discount_kes_${index}`)),
      taxKes: intValue(formData.get(`tax_kes_${index}`))
    })).filter((line): line is { productId: string; quantity: number; unitCostKes: number; discountKes: number; taxKes: number } => Boolean(line.productId && line.quantity > 0));
    if (!lines.length) throw new Error("Add at least one purchase-order line.");
    if (lines.some((line) => line.unitCostKes < 0 || line.discountKes < 0 || line.taxKes < 0)) throw new Error("Costs, discounts and taxes cannot be negative.");
    const totals = calculatePurchaseOrderTotals(lines);
    await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { id: { in: lines.map((line) => line.productId) } }, select: { id: true, name: true } });
      const productMap = new Map(products.map((product) => [product.id, product]));
      if (productMap.size !== lines.length) throw new Error("Purchase order includes an invalid product.");
      const po = await tx.purchaseOrder.create({
        data: {
          po_number: `PO-${new Date().getFullYear()}-${Date.now()}`,
          supplier_id: supplierId,
          status: "submitted",
          branch: text(formData.get("branch")),
          delivery_location_id: text(formData.get("delivery_location_id")),
          currency: text(formData.get("currency")) ?? "KES",
          expected_delivery_date: text(formData.get("expected_delivery_date")) ? new Date(`${text(formData.get("expected_delivery_date"))}T00:00:00.000Z`) : null,
          subtotal_kes: totals.net,
          discount_kes: lines.reduce((sum, line) => sum + line.discountKes, 0),
          vat_kes: totals.tax,
          total_kes: totals.gross,
          payment_terms: text(formData.get("payment_terms")),
          supplier_notes: text(formData.get("supplier_notes")),
          notes: text(formData.get("notes")),
          created_by_id: session.userId,
          correlation_id: text(formData.get("idempotency_key")) ?? crypto.randomUUID(),
          lines: {
            create: lines.map((line, index) => {
              const net = Math.max(0, Math.round(line.quantity * line.unitCostKes) - line.discountKes);
              return {
                product_id: line.productId,
                supplier_id: supplierId,
                description: productMap.get(line.productId)?.name ?? "Inventory item",
                quantity: line.quantity,
                unit_cost_kes: line.unitCostKes,
                discount_kes: line.discountKes,
                tax_kes: line.taxKes || Math.round(net * 0.16),
                net_kes: net,
                gross_kes: net + (line.taxKes || Math.round(net * 0.16)),
                sort_order: index
              };
            })
          },
          status_history: { create: [{ to_status: "submitted", user_id: session.userId, correlation_id: text(formData.get("idempotency_key")) ?? crypto.randomUUID() }] }
        }
      });
      await recordAudit(tx, { userId: session.userId, entity: "PurchaseOrder", entityId: po.id, action: "purchase_order.create", after: { totals, line_count: lines.length } });
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/purchases/orders");
  redirect(`${path}?success=${encodeURIComponent("Purchase order submitted.")}`);
}

export async function recordSupplierPaymentAction(formData: FormData) {
  const session = await requirePermission("supplier_payments.manage");
  const path = text(formData.get("return_to")) ?? "/admin/purchases/payments";
  try {
    const supplierId = text(formData.get("supplier_id"));
    const invoiceId = text(formData.get("supplier_invoice_id"));
    const amount = intValue(formData.get("amount_kes"));
    if (!supplierId || !invoiceId || amount <= 0) throw new Error("Supplier, invoice and positive amount are required.");
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.findUnique({ where: { id: invoiceId } });
      if (!invoice || invoice.supplier_id !== supplierId) throw new Error("Supplier invoice was not found.");
      if (amount > invoice.balance_kes) throw new Error("Payment cannot exceed outstanding invoice balance.");
      const reference = text(formData.get("transaction_reference")) ?? text(formData.get("reference"));
      if (reference) {
        const duplicate = await tx.supplierPayment.findFirst({ where: { OR: [{ transaction_reference: reference }, { reference }] } });
        if (duplicate) throw new Error("A supplier payment with this transaction reference already exists.");
      }
      const payment = await tx.supplierPayment.create({
        data: {
          supplier_payment_number: `SP-${new Date().getFullYear()}-${Date.now()}`,
          payment_number: `SP-${new Date().getFullYear()}-${Date.now()}`,
          supplier_id: supplierId,
          supplier_invoice_id: invoiceId,
          amount_kes: amount,
          method: String(formData.get("method") ?? "bank_transfer") as never,
          reference,
          transaction_reference: reference,
          currency: text(formData.get("currency")) ?? "KES",
          notes: text(formData.get("notes")),
          payment_date: new Date(),
          created_by_id: session.userId,
          correlation_id: text(formData.get("idempotency_key")) ?? crypto.randomUUID(),
          allocations: { create: [{ supplier_id: supplierId, supplier_invoice_id: invoiceId, amount_kes: amount }] }
        }
      });
      const paid = invoice.paid_kes + amount;
      const balance = invoice.total_kes - paid;
      await tx.supplierInvoice.update({ where: { id: invoiceId }, data: { paid_kes: paid, balance_kes: balance, status: balance <= 0 ? "paid" : "partially_paid" } });
      await recordAudit(tx, { userId: session.userId, entity: "SupplierPayment", entityId: payment.id, action: "supplier_payment.record", after: { amount_kes: amount, reference: reference ? "[redacted]" : null } });
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/purchases/payments");
  redirect(`${path}?success=${encodeURIComponent("Supplier payment recorded.")}`);
}

export async function createGoodsReceiptAction(formData: FormData) {
  const session = await requirePermission("purchases.manage");
  const path = text(formData.get("return_to")) ?? "/admin/purchases/goods-received";
  try {
    const purchaseOrderId = text(formData.get("purchase_order_id"));
    const receivingLocationId = text(formData.get("receiving_location_id"));
    if (!purchaseOrderId || !receivingLocationId) throw new Error("Purchase order and receiving location are required.");
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id: purchaseOrderId }, include: { lines: true } });
      if (!po) throw new Error("Purchase order was not found.");
      const requestedLines = Array.from({ length: 20 }, (_, index) => ({
        purchaseOrderLineId: text(formData.get(`purchase_order_line_id_${index}`)),
        quantityReceived: qtyValue(formData.get(`quantity_received_${index}`)),
        quantityRejected: qtyValue(formData.get(`quantity_rejected_${index}`)),
        unitCostKes: intValue(formData.get(`unit_cost_kes_${index}`)),
        serialNumbers: text(formData.get(`serial_numbers_${index}`))?.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean) ?? []
      })).filter((line) => line.purchaseOrderLineId && (line.quantityReceived > 0 || line.quantityRejected > 0));
      if (!requestedLines.length) throw new Error("Add at least one received line.");
      const poLineMap = new Map(po.lines.map((line) => [line.id, line]));
      const receipt = await tx.goodsReceipt.create({
        data: {
          grn_number: `GRN-${new Date().getFullYear()}-${Date.now()}`,
          supplier_id: po.supplier_id,
          purchase_order_id: po.id,
          receiving_location_id: receivingLocationId,
          supplier_delivery_reference: text(formData.get("supplier_delivery_reference")),
          receipt_date: new Date(),
          status: "inspected",
          inspection_notes: text(formData.get("inspection_notes")),
          notes: text(formData.get("notes")),
          received_by_id: session.userId,
          correlation_id: text(formData.get("idempotency_key")) ?? crypto.randomUUID(),
          lines: {
            create: requestedLines.map((line) => {
              const poLine = poLineMap.get(line.purchaseOrderLineId!);
              if (!poLine) throw new Error("GRN includes a line outside the selected purchase order.");
              const remaining = Number(poLine.quantity) - Number(poLine.received_quantity);
              if (line.quantityReceived > remaining) throw new Error("Received quantity cannot exceed remaining purchase order quantity.");
              return {
                purchase_order_line_id: poLine.id,
                product_id: poLine.product_id,
                quantity_received: line.quantityReceived,
                quantity_rejected: line.quantityRejected,
                unit_cost_kes: line.unitCostKes || poLine.unit_cost_kes,
                serial_numbers: line.serialNumbers,
                condition: text(formData.get("condition")),
                inspection_notes: text(formData.get("inspection_notes"))
              };
            })
          }
        }
      });
      await recordAudit(tx, { userId: session.userId, entity: "GoodsReceipt", entityId: receipt.id, action: "goods_receipt.create", after: { line_count: requestedLines.length } });
    });
  } catch (error) {
    fail(path, error);
  }
  revalidatePath("/admin/purchases/goods-received");
  redirect(`${path}?success=${encodeURIComponent("Goods receipt created for posting.")}`);
}
