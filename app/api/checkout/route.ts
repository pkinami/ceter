import { NextResponse } from "next/server";
import { parseDeliveryRegion } from "@/lib/delivery";
import { assertCheckoutProviderConfigured, createOrderFromCart, createPayOnDeliveryPayment, initiateCard, initiateMpesa } from "@/lib/payments";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const body = await request.json().catch(() => ({}));
  const method = body.method === "card" ? "card" : body.method === "mpesa" ? "mpesa" : body.method === "pay_on_delivery" ? "pay_on_delivery" : null;
  if (!method) return NextResponse.json({ error: "Choose M-Pesa, card, or Pay on Delivery." }, { status: 400 });
  if (method !== "pay_on_delivery") {
    try {
      assertCheckoutProviderConfigured(method);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Checkout is not configured." }, { status: 503 });
    }
  }

  const profile = data.user ? await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { full_name: true, phone: true, email: true }
  }) : null;
  const customer = {
    userId: data.user?.id ?? null,
    email: profile?.email ?? data.user?.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null
  };
  const fulfillmentMethod = body.fulfillmentMethod === "pickup" ? "pickup" : "delivery";
  const delivery = body.delivery && typeof body.delivery === "object" ? body.delivery as Record<string, unknown> : {};
  const deliveryRegion = parseDeliveryRegion(delivery.region);
  const guestItems = Array.isArray(body.items) ? body.items.map((item: { productId?: unknown; quantity?: unknown }) => ({ productId: String(item.productId ?? ""), quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)) })).filter((item: { productId: string }) => item.productId) : [];

  try {
    const order = await createOrderFromCart(customer, {
      checkoutKey: typeof body.checkoutKey === "string" ? body.checkoutKey : undefined,
      guestItems,
      fulfillmentMethod,
      delivery: {
        name: String(delivery.name ?? "").trim(),
        phone: String(delivery.phone ?? "").trim(),
        email: String(delivery.email ?? "").trim(),
        region: deliveryRegion,
        location: String(delivery.location ?? "").trim(),
        instructions: String(delivery.instructions ?? "").trim()
      }
    });
    if (method === "pay_on_delivery") {
      const payment = await createPayOnDeliveryPayment(order.id);
      return NextResponse.json({ orderId: order.id, paymentId: payment.id, status: payment.status });
    }
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
