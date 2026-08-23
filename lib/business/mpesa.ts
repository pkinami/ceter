import { randomUUID } from "node:crypto";
import type { MpesaPaymentStatus, Prisma } from "@prisma/client";
import { normalizeKenyanPhone } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { settleInvoicePayment } from "@/lib/business/settlement";
import { queueNotification } from "@/lib/business/notifications";

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL or VERCEL_PROJECT_PRODUCTION_URL is required for production payment callbacks.");
  }
  return (configured ?? "http://localhost:3000").replace(/\/$/, "");
}

function mpesaBaseUrl() {
  return (process.env.MPESA_ENVIRONMENT ?? process.env.MPESA_ENV) === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function pendingTimeoutMs() {
  return Math.max(1, Number.parseInt(process.env.MPESA_PENDING_TIMEOUT_MINUTES ?? "15", 10)) * 60 * 1000;
}

function isTimedOut(createdAt: Date) {
  return Date.now() - createdAt.getTime() > pendingTimeoutMs();
}

async function darajaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials are not configured.");
  const response = await fetch(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`M-Pesa authentication failed: HTTP ${response.status}`);
  const data = await response.json() as { access_token?: string };
  if (!data.access_token) throw new Error("M-Pesa authentication did not return a token.");
  return data.access_token;
}

function callbackValue(items: Array<{ Name: string; Value?: string | number }>, name: string) {
  return items.find((item) => item.Name === name)?.Value;
}

export async function initiateInvoiceMpesa(input: { invoiceId: string; phoneNumber: string; amountKes?: number }) {
  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId }, include: { customer: true } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "cancelled") throw new Error("Cancelled invoices cannot be paid.");
  if (invoice.balance_kes <= 0) throw new Error("Invoice is already fully paid.");
  const amount = input.amountKes ?? invoice.balance_kes;
  if (amount <= 0 || amount > invoice.balance_kes) throw new Error("M-Pesa amount must be above zero and within the outstanding balance.");
  const normalizedPhone = normalizeKenyanPhone(input.phoneNumber);
  const existing = await prisma.mpesaTransaction.findFirst({
    where: { invoice_id: invoice.id, payment_status: "pending" },
    orderBy: { created_at: "desc" }
  });
  if (existing && isTimedOut(existing.created_at)) {
    await prisma.mpesaTransaction.update({
      where: { id: existing.id },
      data: {
        payment_status: "failed",
        failure_reason: `Pending payment timed out after ${Math.round(pendingTimeoutMs() / 60000)} minutes without a successful callback.`,
        verified_at: new Date()
      }
    });
  }

  const shortCode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortCode || !passkey) throw new Error("M-Pesa shortcode and passkey are not configured.");

  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const reusable = existing && !isTimedOut(existing.created_at) ? existing : null;
  const merchantReference = reusable?.transaction_reference ?? `CTINV-${invoice.invoice_number}-${randomUUID().slice(0, 8)}`.replace(/[^A-Za-z0-9-]/g, "");
  const payload = {
    BusinessShortCode: shortCode,
    Password: Buffer.from(`${shortCode}${passkey}${timestamp}`).toString("base64"),
    Timestamp: timestamp,
    TransactionType: process.env.MPESA_TRANSACTION_TYPE ?? "CustomerPayBillOnline",
    Amount: amount,
    PartyA: normalizedPhone,
    PartyB: shortCode,
    PhoneNumber: normalizedPhone,
    CallBackURL: `${siteUrl()}/api/payments/mpesa/callback`,
    AccountReference: merchantReference,
    TransactionDesc: `Ceter invoice ${invoice.invoice_number}`
  };

  const transaction = reusable ?? await prisma.mpesaTransaction.create({
    data: {
      invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      phone_number: normalizedPhone,
      amount,
      transaction_reference: merchantReference,
      payment_status: "pending"
    }
  });

  const token = await darajaToken();
  const response = await fetch(`${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || data.ResponseCode !== "0") {
    await prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: { payment_status: "failed", failure_reason: data.errorMessage ?? data.ResponseDescription ?? "M-Pesa request failed.", callback_payload: json(data) }
    });
    throw new Error(data.errorMessage ?? data.ResponseDescription ?? "M-Pesa request failed.");
  }
  return prisma.mpesaTransaction.update({
    where: { id: transaction.id },
    data: {
      checkout_request_id: data.CheckoutRequestID,
      callback_payload: json({ request: { ...payload, Password: "[redacted]" }, response: data })
    }
  });
}

export async function completeInvoiceMpesaTransaction(input: {
  checkoutRequestId: string;
  status: MpesaPaymentStatus;
  payload: unknown;
  receiptReference?: string | null;
  failureReason?: string | null;
}) {
  const transaction = await prisma.mpesaTransaction.findUnique({ where: { checkout_request_id: input.checkoutRequestId } });
  if (!transaction) return null;
  if (transaction.payment_status === "completed" && transaction.payment_id) return transaction;
  if (input.status !== "completed") {
    const updated = await prisma.mpesaTransaction.updateMany({
      where: { id: transaction.id, payment_status: "pending", verified_at: null },
      data: {
        payment_status: input.status,
        failure_reason: input.failureReason,
        callback_payload: json(input.payload),
        verified_at: new Date()
      }
    });
    if (updated.count !== 1) return prisma.mpesaTransaction.findUnique({ where: { id: transaction.id } });
    return prisma.mpesaTransaction.findUnique({ where: { id: transaction.id } });
  }
  if (!input.receiptReference) {
    return prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: { payment_status: "failed", failure_reason: "Completed callback did not include an M-Pesa receipt reference.", callback_payload: json(input.payload), verified_at: new Date() }
    });
  }
  const claimed = await prisma.mpesaTransaction.updateMany({
    where: { id: transaction.id, payment_status: "pending", verified_at: null },
    data: { callback_payload: json(input.payload), verified_at: new Date() }
  });
  if (claimed.count !== 1) {
    const current = await prisma.mpesaTransaction.findUnique({ where: { id: transaction.id } });
    if (current?.payment_status === "completed") return current;
    return current ?? transaction;
  }
  const existingReference = await prisma.payment.findFirst({ where: { reference: input.receiptReference, method: "mpesa" } });
  if (existingReference) {
    return prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: { payment_status: "completed", payment_id: existingReference.id, callback_payload: json(input.payload), verified_at: new Date() }
    });
  }
  const settlement = await settleInvoicePayment({
    invoiceId: transaction.invoice_id,
    amountKes: transaction.amount,
    method: "mpesa",
    reference: input.receiptReference,
    notes: "Verified M-Pesa callback settlement."
  }).catch(async (error) => {
    await prisma.mpesaTransaction.update({
      where: { id: transaction.id },
      data: {
        payment_status: "failed",
        failure_reason: error instanceof Error ? error.message : "M-Pesa settlement failed.",
        callback_payload: json(input.payload),
        verified_at: new Date()
      }
    });
    throw error;
  });
  await queueNotification(settlement.invoice.customer.profile_id, "payment_received", {
    recipientEmail: settlement.invoice.customer.email,
    recipientName: settlement.invoice.customer.name,
    documentNumber: settlement.payment.payment_number,
    amountKes: settlement.payment.amount_kes,
    statusLabel: settlement.updatedInvoice.status
  });
  return prisma.mpesaTransaction.update({
    where: { id: transaction.id },
    data: {
      payment_status: "completed",
      payment_id: settlement.payment.id,
      callback_payload: json(input.payload),
      verified_at: new Date()
    }
  });
}

export function mpesaOperationsMessage(status: MpesaPaymentStatus, failureReason?: string | null) {
  if (status === "completed") return "Successful payment: receipt generated from verified M-Pesa reference.";
  if (status === "failed") return `Failed payment: ${failureReason ?? "callback failed, timed out, or settlement could not be completed."}`;
  if (status === "cancelled") return `Failed payment: customer cancelled the STK request${failureReason ? ` (${failureReason})` : ""}.`;
  return "Pending payment: STK request sent; wait for customer approval and verified callback before receipting.";
}

export const mpesaAdminMessage = mpesaOperationsMessage;

export async function handleMpesaCallbackPayload(payload: unknown) {
  const callback = (payload as { Body?: { stkCallback?: Record<string, unknown> } } | null)?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) throw new Error("Invalid M-Pesa callback payload.");
  const metadata = Array.isArray((callback.CallbackMetadata as { Item?: Array<{ Name: string; Value?: string | number }> } | undefined)?.Item)
    ? (callback.CallbackMetadata as { Item: Array<{ Name: string; Value?: string | number }> }).Item
    : [];
  const resultCode = Number(callback.ResultCode);
  const receiptReference = callbackValue(metadata, "MpesaReceiptNumber");
  return completeInvoiceMpesaTransaction({
    checkoutRequestId: String(callback.CheckoutRequestID),
    status: resultCode === 0 ? "completed" : resultCode === 1032 ? "cancelled" : "failed",
    receiptReference: receiptReference ? String(receiptReference) : null,
    failureReason: resultCode === 0 ? null : String(callback.ResultDesc ?? "M-Pesa payment failed."),
    payload
  });
}
