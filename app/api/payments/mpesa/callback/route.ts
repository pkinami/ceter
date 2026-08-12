import { NextResponse } from "next/server";
import { markPaymentStatus } from "@/lib/payments";
import { prisma } from "@/lib/prisma";

function callbackValue(items: Array<{ Name: string; Value?: string | number }>, name: string) {
  return items.find((item) => item.Name === name)?.Value;
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const callback = payload?.Body?.stkCallback;
  if (!callback?.CheckoutRequestID) return NextResponse.json({ ResultCode: 1, ResultDesc: "Invalid callback" }, { status: 400 });

  const payment = await prisma.paymentTransaction.findUnique({
    where: { checkout_request_id: String(callback.CheckoutRequestID) }
  });
  if (!payment) return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  const metadata = Array.isArray(callback.CallbackMetadata?.Item) ? callback.CallbackMetadata.Item : [];
  const mpesaReceipt = callbackValue(metadata, "MpesaReceiptNumber");
  const resultCode = Number(callback.ResultCode);

  if (resultCode === 0) {
    await markPaymentStatus(payment.id, "paid", {
      providerReference: mpesaReceipt ? String(mpesaReceipt) : payment.provider_reference,
      rawResponse: payload
    });
  } else {
    await markPaymentStatus(payment.id, resultCode === 1032 ? "cancelled" : "failed", {
      failureReason: callback.ResultDesc ?? "M-Pesa payment failed.",
      rawResponse: payload
    });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
