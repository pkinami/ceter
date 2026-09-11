"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { allocatePaymentToInvoice, cancelOrderReservation, confirmOrderReservation, createDeliveryFromOrder, fulfillOrder, reversePayment } from "@/lib/admin/sales-billing";

function text(value: FormDataEntryValue | null) {
  const output = String(value ?? "").trim();
  return output || null;
}

function intValue(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "0").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function messageRedirect(path: string, key: "success" | "error", message: string): never {
  redirect(`${path}?${key}=${encodeURIComponent(message)}`);
}

function returnPath(formData: FormData, fallback: string) {
  const requested = text(formData.get("return_to"));
  return requested?.startsWith("/admin/") ? requested : fallback;
}

function correlation(formData: FormData, prefix: string) {
  return text(formData.get("correlation_id")) ?? `${prefix}-${Date.now()}`;
}

export async function confirmOrderReservationAction(formData: FormData) {
  const session = await requirePermission("sales.confirm");
  const orderId = text(formData.get("order_id"));
  const returnTo = returnPath(formData, "/admin/sales");
  if (!orderId) messageRedirect(returnTo, "error", "Order id is required.");
  try {
    await confirmOrderReservation({ session, orderId, locationId: text(formData.get("location_id")), correlationId: correlation(formData, "order-confirm") });
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Order could not be confirmed.");
  }
  revalidatePath("/admin/sales");
  messageRedirect(returnTo, "success", "Order confirmed and stock reservation posted.");
}

export async function cancelOrderReservationAction(formData: FormData) {
  const session = await requirePermission("sales.cancel");
  const orderId = text(formData.get("order_id"));
  const reason = text(formData.get("reason"));
  const returnTo = returnPath(formData, "/admin/sales");
  if (!orderId || !reason) messageRedirect(returnTo, "error", "Order id and reason are required.");
  try {
    await cancelOrderReservation({ session, orderId, reason, correlationId: correlation(formData, "order-cancel") });
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Order could not be cancelled.");
  }
  revalidatePath("/admin/sales");
  messageRedirect(returnTo, "success", "Order cancelled and remaining reservations released.");
}

export async function fulfillOrderAction(formData: FormData) {
  const session = await requirePermission("sales.fulfil");
  const orderId = text(formData.get("order_id"));
  const returnTo = returnPath(formData, "/admin/sales");
  if (!orderId) messageRedirect(returnTo, "error", "Order id is required.");
  try {
    await fulfillOrder({ session, orderId, correlationId: correlation(formData, "order-fulfil") });
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Order could not be fulfilled.");
  }
  revalidatePath("/admin/sales");
  messageRedirect(returnTo, "success", "Fulfilment posted through the inventory ledger.");
}

export async function createDeliveryAction(formData: FormData) {
  const session = await requirePermission("deliveries.create");
  const orderId = text(formData.get("order_id"));
  const returnTo = returnPath(formData, "/admin/deliveries");
  if (!orderId) messageRedirect(returnTo, "error", "Order id is required.");
  const scheduled = text(formData.get("scheduled_date"));
  try {
    await createDeliveryFromOrder({ session, orderId, scheduledDate: scheduled ? new Date(`${scheduled}T00:00:00.000Z`) : null, correlationId: correlation(formData, "delivery") });
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Delivery could not be created.");
  }
  revalidatePath("/admin/deliveries");
  messageRedirect(returnTo, "success", "Delivery scheduled from the order.");
}

export async function allocatePaymentAction(formData: FormData) {
  const session = await requirePermission("payments.allocate");
  const paymentId = text(formData.get("payment_id"));
  const invoiceId = text(formData.get("invoice_id"));
  const returnTo = returnPath(formData, "/admin/payments");
  if (!paymentId || !invoiceId) messageRedirect(returnTo, "error", "Payment and invoice are required.");
  try {
    await allocatePaymentToInvoice({ session, paymentId, invoiceId, amountKes: intValue(formData.get("amount_kes")), correlationId: correlation(formData, "payment-allocation") });
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Payment could not be allocated.");
  }
  revalidatePath("/admin/payments");
  messageRedirect(returnTo, "success", "Payment allocation posted.");
}

export async function reversePaymentAction(formData: FormData) {
  const session = await requirePermission("payments.reverse");
  const paymentId = text(formData.get("payment_id"));
  const reason = text(formData.get("reason"));
  const returnTo = returnPath(formData, "/admin/payments");
  if (!paymentId || !reason) messageRedirect(returnTo, "error", "Payment and reversal reason are required.");
  try {
    await reversePayment({ session, paymentId, reason, correlationId: correlation(formData, "payment-reversal") });
  } catch (error) {
    messageRedirect(returnTo, "error", error instanceof Error ? error.message : "Payment could not be reversed.");
  }
  revalidatePath("/admin/payments");
  messageRedirect(returnTo, "success", "Payment reversed without deleting the original payment.");
}
