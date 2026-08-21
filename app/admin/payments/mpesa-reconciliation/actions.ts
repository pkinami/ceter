"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { completeInvoiceMpesaTransaction } from "@/lib/business/mpesa";
import { requireAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null) {
  const output = String(value ?? "").trim();
  return output || null;
}

function messageRedirect(key: "success" | "error", message: string): never {
  redirect(`/admin/payments/mpesa-reconciliation?${key}=${encodeURIComponent(message)}`);
}

export async function manualReconcileMpesaAction(formData: FormData) {
  await requireAdminSession();
  const id = text(formData.get("id"));
  const receiptReference = text(formData.get("receipt_reference"));
  if (!id || !receiptReference) messageRedirect("error", "Transaction and M-Pesa receipt code are required.");
  const transaction = await prisma.mpesaTransaction.findUnique({ where: { id } });
  if (!transaction?.checkout_request_id) messageRedirect("error", "Only transactions with a checkout request can be reconciled.");
  try {
    await completeInvoiceMpesaTransaction({
      checkoutRequestId: transaction.checkout_request_id,
      status: "completed",
      receiptReference,
      payload: { manualReconciliation: true, receiptReference, reconciledAt: new Date().toISOString() }
    });
  } catch (error) {
    messageRedirect("error", error instanceof Error ? error.message : "M-Pesa transaction could not be reconciled.");
  }
  revalidatePath("/admin/payments/mpesa-reconciliation");
  messageRedirect("success", "M-Pesa transaction reconciled and receipt generated.");
}
