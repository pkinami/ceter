import { NextResponse } from "next/server";
import { queryMpesa, verifyPesapalByTrackingId } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const paymentId = String(body.paymentId ?? "");
  if (!paymentId) return NextResponse.json({ error: "Missing paymentId." }, { status: 400 });

  const payment = await prisma.paymentTransaction.findUnique({
    where: { id: paymentId },
    include: { order: { select: { user_id: true } } }
  });
  if (!payment || payment.order.user_id !== data.user.id) return NextResponse.json({ error: "Payment not found." }, { status: 404 });

  try {
    const verified = payment.provider === "safaricom_daraja"
      ? await queryMpesa(payment.id)
      : payment.provider_reference
        ? await verifyPesapalByTrackingId(payment.provider_reference, payment.merchant_reference)
        : payment;
    return NextResponse.json({ status: verified?.status ?? payment.status, orderId: payment.order_id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not verify payment." }, { status: 400 });
  }
}
