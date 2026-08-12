import { NextResponse } from "next/server";
import { createOrderFromCart, initiateCard, initiateMpesa } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sign in before checkout." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const method = body.method === "card" ? "card" : body.method === "mpesa" ? "mpesa" : null;
  if (!method) return NextResponse.json({ error: "Choose M-Pesa or card payment." }, { status: 400 });

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { full_name: true, phone: true }
  });
  const customer = {
    userId: data.user.id,
    email: data.user.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null
  };

  try {
    const order = await createOrderFromCart(customer);
    const payment = method === "mpesa"
      ? await initiateMpesa(order.id, String(body.phone ?? customer.phone ?? ""))
      : await initiateCard(order.id, customer);

    return NextResponse.json({
      orderId: order.id,
      paymentId: payment.id,
      status: payment.status,
      redirectUrl: payment.redirect_url
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout could not start." }, { status: 400 });
  }
}
