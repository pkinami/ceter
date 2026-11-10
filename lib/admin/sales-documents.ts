import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AdminSession } from "@/lib/admin/auth";
import { ensureDefaultInventoryLocation, postInventoryMovement, recordAudit } from "@/lib/admin/inventory";
import { createBusinessNumber } from "@/lib/business/numbering";
import { brandedPdfBytes, documentCreateData, uploadBusinessDocument } from "@/lib/business/documents";
import { formatKes } from "@/lib/utils";

/** Confirming a quote is the only path that creates its invoice. The quote row
 * is locked and the database's one-invoice-per-quote index is a second guard
 * against browser retries and concurrent requests. */
export async function confirmQuoteAndCreateInvoice(input: { quoteId: string; lpoNumber: string; session: AdminSession }) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.quotes WHERE id = ${input.quoteId}::uuid FOR UPDATE`;
    const quote = await tx.quote.findUnique({ where: { id: input.quoteId }, include: { customer: true, items: true, invoices: true } });
    if (!quote) throw new Error("Quotation not found.");
    if (quote.invoices[0]) return { invoice: quote.invoices[0], created: false };
    if (!["draft", "sent", "accepted"].includes(quote.status)) throw new Error("Only an active quotation can be confirmed.");
    if (!quote.items.length) throw new Error("A quotation must contain at least one line item.");
    const lpo = input.lpoNumber.trim() || quote.customer_lpo_number || null;

    const order = quote.converted_order_id
      ? await tx.order.findUnique({ where: { id: quote.converted_order_id } })
      : await tx.order.create({ data: {
        order_number: await createBusinessNumber(tx, "CPO"), source: "confirmed_quotation", customer_id: quote.customer_id,
      customer_lpo_number: lpo, total_kes: quote.total_kes, delivery_name: quote.customer.name,
        delivery_email: quote.customer.email, delivery_phone: quote.customer.phone,
        order_items: { create: quote.items.map((line) => ({ product_id: line.product_id, service_label: line.description, quantity: line.quantity, price_at_purchase_kes: line.unit_price_kes })) }
      } });
    if (!order) throw new Error("The quotation's converted sales order could not be found.");
    const invoice = await tx.invoice.create({ data: {
      invoice_number: await createBusinessNumber(tx, "INV"), quote_id: quote.id, source_order_id: order.id,
      customer_id: quote.customer_id, customer_lpo_number: lpo, status: "sent", payment_status: "unpaid",
      subtotal_kes: quote.subtotal_kes, discount_kes: quote.discount_kes, vat_kes: quote.vat_kes,
      total_kes: quote.total_kes, balance_kes: quote.total_kes, vat_enabled: quote.vat_enabled,
      notes: quote.notes, terms: quote.terms, created_by_id: input.session.userId,
      items: { create: quote.items.map((line) => ({ product_id: line.product_id, item_type: line.item_type, description: line.description, quantity: line.quantity, unit_price_kes: line.unit_price_kes, discount_kes: line.discount_kes, vat_kes: line.vat_kes, line_total_kes: line.line_total_kes, sort_order: line.sort_order })) }
    }, include: { customer: { include: { addresses: { where: { is_default: true }, take: 1 } } }, items: true } });
    await tx.quote.update({ where: { id: quote.id }, data: { status: "accepted", accepted_at: quote.accepted_at ?? new Date(), approved_at: new Date(), approved_by_id: input.session.userId, customer_lpo_number: lpo, converted_order_id: order.id } });
    await tx.transaction.createMany({ data: [
      { transaction_type: "invoice_created", direction: "debit", amount_kes: invoice.total_kes, customer_id: invoice.customer_id, invoice_id: invoice.id, memo: `Invoice ${invoice.invoice_number} from ${quote.quote_number}`, created_by_id: input.session.userId },
      { transaction_type: "sales_recorded", direction: "credit", amount_kes: invoice.total_kes, customer_id: invoice.customer_id, invoice_id: invoice.id, memo: "Sales recorded", created_by_id: input.session.userId }
    ] });
    await recordAudit(tx, { userId: input.session.userId, entity: "Quote", entityId: quote.id, action: "quote.confirm_and_convert", after: { invoice_id: invoice.id, order_id: order.id, lpo } });
    return { invoice, created: true };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (result.created) await ensureInvoicePdf(result.invoice.id, input.session.userId);
  return result;
}

async function ensureInvoicePdf(invoiceId: string, userId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, include: { customer: { include: { addresses: { where: { is_default: true }, take: 1 } } }, items: true, documents: true, quote: true } });
  if (!invoice || invoice.documents.some((d) => d.document_type === "invoice")) return;
  const pdf = await brandedPdfBytes({ type: "invoice", title: "Invoice", number: invoice.invoice_number, issueDate: invoice.created_at.toLocaleDateString("en-KE"), dueDate: invoice.due_date?.toLocaleDateString("en-KE"), meta: [["Quotation", invoice.quote?.quote_number], ["LPO No.", invoice.customer_lpo_number], ["Status", invoice.status]], customerName: invoice.customer.name, customerCompany: invoice.customer.company_name, customerEmail: invoice.customer.email, customerPhone: invoice.customer.phone, customerAddress: invoice.customer.addresses[0]?.address_line_1, customerPin: invoice.customer.tax_pin, lines: invoice.items.map((x) => ({ description: x.description, quantity: x.quantity, unitPrice: formatKes(x.unit_price_kes), discount: formatKes(x.discount_kes), vat: formatKes(x.vat_kes), total: formatKes(x.line_total_kes) })), totals: [["Subtotal", formatKes(invoice.subtotal_kes)], ["Discount", formatKes(invoice.discount_kes)], ["VAT", formatKes(invoice.vat_kes)], ["Total", formatKes(invoice.total_kes)], ["Outstanding", formatKes(invoice.balance_kes)]], footer: [invoice.terms, invoice.notes].filter(Boolean) as string[] });
  const storagePath = `invoices/${invoice.invoice_number}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({ data: documentCreateData({ document_type: "invoice", document_number: invoice.invoice_number, title: `Invoice ${invoice.invoice_number}`, storage_path: storagePath, public_url: publicUrl, customer_id: invoice.customer_id, invoice_id: invoice.id, quote_id: invoice.quote_id ?? undefined, created_by_id: userId }) }).catch(async () => undefined);
}

export async function createDeliveryFromInvoice(input: { invoiceId: string; quantities?: Record<string, number>; session: AdminSession; correlationId: string }) {
  const delivery = await prisma.$transaction(async (tx) => {
    const prior = await tx.delivery.findUnique({ where: { correlation_id: input.correlationId } });
    if (prior) return prior;
    const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId }, include: { items: true, customer: { include: { addresses: { where: { is_default: true }, take: 1 } } } } });
    if (!invoice?.source_order_id) throw new Error("This invoice has no fulfilment order; create deliveries from a confirmed quotation invoice.");
    if (invoice.status === "cancelled") throw new Error("Cancelled invoices cannot be delivered.");
    await tx.$queryRaw`SELECT id FROM public.invoices WHERE id = ${invoice.id}::uuid FOR UPDATE`;
    const priorLines = await tx.deliveryLine.groupBy({ by: ["product_id", "description"], where: { delivery: { invoice_id: invoice.id, status: { not: "cancelled" } } }, _sum: { delivery_quantity: true } });
    const quantityKey = (productId: string | null, description: string) => `${productId ?? ""}\u001f${description}`;
    const dispatched = new Map(priorLines.map((x) => [quantityKey(x.product_id, x.description), Number(x._sum.delivery_quantity ?? 0)]));
    const lines = invoice.items.map((item) => {
      const previous = dispatched.get(quantityKey(item.product_id, item.description)) ?? 0;
      const remaining = Math.max(0, item.quantity - previous);
      const quantity = input.quantities?.[item.id] ?? remaining;
      if (!Number.isFinite(quantity) || quantity < 0 || quantity > remaining) throw new Error(`Delivery quantity for ${item.description} exceeds the invoiced remainder.`);
      return { item, quantity, previous };
    }).filter((line) => line.quantity > 0);
    if (!lines.length) throw new Error("There is no remaining quantity to prepare for delivery.");
    const delivery = await tx.delivery.create({ data: { delivery_number: await createBusinessNumber(tx, "DN"), order_id: invoice.source_order_id, invoice_id: invoice.id, customer_id: invoice.customer_id, status: "prepared", delivery_method: "delivery", scheduled_date: new Date(), delivery_address_snapshot: invoice.customer.addresses[0] ? { address: invoice.customer.addresses[0].address_line_1, city: invoice.customer.addresses[0].city } : Prisma.JsonNull, contact_snapshot: { name: invoice.customer.name, phone: invoice.customer.phone, email: invoice.customer.email }, correlation_id: input.correlationId, created_by_id: input.session.userId, lines: { create: lines.map(({ item, quantity, previous }) => ({ product_id: item.product_id, description: item.description, ordered_quantity: item.quantity, previous_delivered_quantity: previous, delivery_quantity: quantity })) } } });
    await recordAudit(tx, { userId: input.session.userId, entity: "Delivery", entityId: delivery.id, action: "delivery.prepare_from_invoice", after: { invoice_id: invoice.id, correlation_id: input.correlationId } });
    return delivery;
  });
  await ensureDeliveryPdf(delivery.id, input.session.userId);
  return delivery;
}

export async function dispatchDelivery(input: { deliveryId: string; session: AdminSession }) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.deliveries WHERE id = ${input.deliveryId}::uuid FOR UPDATE`;
    const delivery = await tx.delivery.findUnique({ where: { id: input.deliveryId }, include: { invoice: true, lines: true } });
    if (!delivery || !delivery.invoice) throw new Error("Delivery note not found.");
    if (delivery.status === "dispatched" || delivery.status === "delivered") return delivery;
    const location = await ensureDefaultInventoryLocation(tx);
    for (const line of delivery.lines) if (line.product_id) await postInventoryMovement(tx, { productId: line.product_id, locationId: location.id, quantity: -Number(line.delivery_quantity), movementType: "sale_issue", sourceDocumentType: "DeliveryDispatch", sourceDocumentId: delivery.id, sourceLineId: line.id, reference: delivery.delivery_number, reason: "Invoice delivery dispatch", userId: input.session.userId, branch: input.session.role, correlationId: `${delivery.id}:${line.id}` });
    await tx.orderItem.updateMany({ where: { order_id: delivery.order_id }, data: { fulfilled_quantity: { increment: 0 } } });
    const updated = await tx.delivery.update({ where: { id: delivery.id }, data: { status: "dispatched", dispatch_time: new Date(), delivered_by: input.session.name } });
    await recordAudit(tx, { userId: input.session.userId, entity: "Delivery", entityId: delivery.id, action: "delivery.dispatch", after: { invoice_id: delivery.invoice_id } });
    return updated;
  });
}

export async function confirmDeliveryReceipt(input: { deliveryId: string; receivedBy: string; acknowledgement?: string; session: AdminSession }) {
  const receivedBy = input.receivedBy.trim();
  if (!receivedBy) throw new Error("Enter the name of the person who received the goods.");
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM public.deliveries WHERE id = ${input.deliveryId}::uuid FOR UPDATE`;
    const delivery = await tx.delivery.findUnique({ where: { id: input.deliveryId } });
    if (!delivery) throw new Error("Delivery note not found.");
    if (delivery.status === "delivered") return delivery;
    if (delivery.status !== "dispatched") throw new Error("Dispatch the goods before recording customer receipt.");
    const updated = await tx.delivery.update({ where: { id: delivery.id }, data: {
      status: "delivered", delivered_time: new Date(), received_by: receivedBy,
      acknowledgement: input.acknowledgement?.trim() || null
    } });
    await recordAudit(tx, { userId: input.session.userId, entity: "Delivery", entityId: delivery.id, action: "delivery.customer_receipt", before: { status: delivery.status }, after: { status: "delivered", received_by: receivedBy, acknowledgement: input.acknowledgement?.trim() || null } });
    return updated;
  });
}

async function ensureDeliveryPdf(deliveryId: string, userId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId }, include: { customer: true, invoice: { include: { quote: true } }, lines: true, documents: true } });
  if (!delivery || delivery.documents.some((d) => d.document_type === "delivery_note")) return;
  const pdf = await brandedPdfBytes({ type: "delivery_note", title: "Delivery Note", number: delivery.delivery_number, issueDate: delivery.created_at.toLocaleDateString("en-KE"), dueDate: delivery.scheduled_date?.toLocaleDateString("en-KE"), meta: [["Invoice", delivery.invoice?.invoice_number], ["Quotation", delivery.invoice?.quote?.quote_number], ["Status", delivery.status]], customerName: delivery.customer?.name, customerEmail: delivery.customer?.email, customerPhone: delivery.customer?.phone, lines: delivery.lines.map((x) => ({ description: x.description, quantity: Number(x.delivery_quantity), unitPrice: String(Number(x.ordered_quantity)), total: "" })), footer: ["Prepared delivery note. Dispatch and customer receipt are recorded separately."] });
  const storagePath = `delivery-notes/${delivery.delivery_number}.pdf`;
  const publicUrl = await uploadBusinessDocument(storagePath, pdf);
  await prisma.document.create({ data: documentCreateData({ document_type: "delivery_note", document_number: delivery.delivery_number, title: `Delivery Note ${delivery.delivery_number}`, storage_path: storagePath, public_url: publicUrl, customer_id: delivery.customer_id ?? undefined, invoice_id: delivery.invoice_id ?? undefined, delivery_id: delivery.id, created_by_id: userId }) }).catch(() => undefined);
}
