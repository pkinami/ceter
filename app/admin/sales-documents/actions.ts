"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { confirmDeliveryReceipt, confirmQuoteAndCreateInvoice, createDeliveryFromInvoice, dispatchDelivery } from "@/lib/admin/sales-documents";
import { settleInvoicePayment } from "@/lib/business/settlement";
import type { BusinessPaymentMethod } from "@prisma/client";

const value = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const safeReturn = (form: FormData, fallback: string) => {
  const target = value(form, "return_to");
  return target.startsWith("/admin/") ? target : fallback;
};
const fail = (path: string, error: unknown): never => redirect(`${path}${path.includes("?") ? "&" : "?"}error=${encodeURIComponent(error instanceof Error ? error.message : "The operation could not be completed.")}`);

export async function confirmQuotationAction(form: FormData) {
  const session = await requirePermission("quotations.convert");
  const quoteId = value(form, "quote_id");
  const returnTo = safeReturn(form, "/admin/quotes");
  if (!quoteId) fail(returnTo, new Error("Quotation is required."));
  let invoiceId = "";
  let created = false;
  try {
    const result = await confirmQuoteAndCreateInvoice({ quoteId, lpoNumber: value(form, "lpo_number"), session });
    invoiceId = result.invoice.id;
    created = result.created;
    revalidatePath("/admin/quotes"); revalidatePath("/admin/invoices"); revalidatePath("/admin/sales-documents");
  } catch (error) { fail(returnTo, error); }
  redirect(`/admin/invoices/${invoiceId}?success=${encodeURIComponent(created ? "Quotation confirmed and invoice issued." : "This quotation was already converted; showing its invoice.")}`);
}

export async function prepareDeliveryNoteAction(form: FormData) {
  const session = await requirePermission("deliveries.create");
  const invoiceId = value(form, "invoice_id");
  const returnTo = safeReturn(form, "/admin/invoices");
  if (!invoiceId) fail(returnTo, new Error("Invoice is required."));
  let deliveryId = "";
  let deliveryNumber = "";
  try {
    const delivery = await createDeliveryFromInvoice({ invoiceId, session, correlationId: value(form, "correlation_id") || `delivery:${invoiceId}:${Date.now()}` });
    deliveryId = delivery.id;
    deliveryNumber = delivery.delivery_number;
    revalidatePath("/admin/deliveries"); revalidatePath("/admin/sales-documents");
  } catch (error) { fail(returnTo, error); }
  redirect(`/admin/deliveries/${deliveryId}?success=${encodeURIComponent(`Delivery note ${deliveryNumber} created successfully. Dispatch is a separate action.`)}`);
}

export async function dispatchDeliveryAction(form: FormData) {
  const session = await requirePermission("deliveries.dispatch");
  const deliveryId = value(form, "delivery_id");
  const returnTo = safeReturn(form, "/admin/deliveries");
  if (!deliveryId) fail(returnTo, new Error("Delivery note is required."));
  try {
    await dispatchDelivery({ deliveryId, session });
    revalidatePath("/admin/deliveries"); revalidatePath("/admin/invoices"); revalidatePath("/admin/sales-documents");
  } catch (error) { fail(returnTo, error); }
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}success=${encodeURIComponent("Goods dispatched through the inventory ledger.")}`);
}

export async function recordInvoicePaymentAction(form: FormData) {
  const session = await requirePermission("payments.record");
  const invoiceId = value(form, "invoice_id");
  const returnTo = safeReturn(form, "/admin/invoices");
  const amountKes = Number(value(form, "amount_kes"));
  const operationKey = value(form, "operation_key");
  const method = value(form, "method") as BusinessPaymentMethod;
  if (!invoiceId || !operationKey || !Number.isSafeInteger(amountKes) || amountKes <= 0) {
    fail(returnTo, new Error("Enter a valid payment amount."));
  }
  if (!["mpesa", "bank_transfer", "cash", "card", "pay_on_delivery", "credit"].includes(method)) {
    fail(returnTo, new Error("Select a supported payment method."));
  }
  let result: Awaited<ReturnType<typeof settleInvoicePayment>> | null = null;
  try {
    result = await settleInvoicePayment({
      invoiceId,
      amountKes,
      method,
      reference: value(form, "reference") || null,
      notes: value(form, "notes") || null,
      createdById: session.userId,
      operationKey
    });
    revalidatePath(`/admin/invoices/${invoiceId}`);
    revalidatePath("/admin/receipts");
    revalidatePath("/admin/sales-documents");
  } catch (error) {
    fail(returnTo, error);
  }
  if (!result) fail(returnTo, new Error("Payment status could not be confirmed."));
  const confirmed = result!;
  const message = confirmed.updatedInvoice.balance_kes === 0
    ? `Invoice settled. Payment ${confirmed.payment.payment_number} recorded and receipt ${confirmed.receipt.receipt_number} issued.`
    : `Partial payment recorded. ${confirmed.updatedInvoice.balance_kes.toLocaleString("en-KE")} KES remains due. Payment ${confirmed.payment.payment_number}; receipt ${confirmed.receipt.receipt_number}.`;
  redirect(`${returnTo}?success=${encodeURIComponent(message)}`);
}

export async function confirmDeliveryReceiptAction(form: FormData) {
  const session = await requirePermission("deliveries.complete");
  const deliveryId = value(form, "delivery_id");
  const returnTo = safeReturn(form, "/admin/deliveries");
  if (!deliveryId) fail(returnTo, new Error("Delivery note is required."));
  try {
    await confirmDeliveryReceipt({ deliveryId, receivedBy: value(form, "received_by"), acknowledgement: value(form, "acknowledgement"), session });
    revalidatePath(`/admin/deliveries/${deliveryId}`);
    revalidatePath("/admin/invoices");
    revalidatePath("/admin/sales-documents");
  } catch (error) {
    fail(returnTo, error);
  }
  redirect(`${returnTo}?success=${encodeURIComponent("Customer receipt recorded.")}`);
}
