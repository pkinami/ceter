import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validEmail(value: string) {
  return /^\S+@\S+\.\S+$/.test(value);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Submit a valid quote request." }, { status: 400 });
  }

  const name = text("name" in body ? body.name : "");
  const email = text("email" in body ? body.email : "");
  const phone = text("phone" in body ? body.phone : "");
  const service = text("service" in body ? body.service : "");
  const message = text("message" in body ? body.message : "");
  const productId = text("productId" in body ? body.productId : "");
  const quantity = Math.max(1, Math.floor(Number("quantity" in body ? body.quantity : 1) || 1));

  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!validEmail(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (phone.length < 9) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  if (!service) return NextResponse.json({ error: "Select a service." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Message must be at least 10 characters." }, { status: 400 });

  const product = productId
    ? await prisma.product.findFirst({
        where: { id: productId, is_published: true, archived_at: null },
        select: { id: true, name: true, price_kes: true, cost_price_kes: true }
      })
    : null;

  if (productId && !product) {
    return NextResponse.json({ error: "The selected product is no longer available." }, { status: 404 });
  }

  const quote = await prisma.quoteRequest.create({
    data: {
      name,
      email,
      phone,
      service_needed: service,
      message,
      status: "new",
      lines: product
        ? {
            create: [{
              product_id: product.id,
              description: product.name,
              quantity,
              unit_price_kes: product.price_kes,
              unit_cost_kes: product.cost_price_kes
            }]
          }
        : undefined
    },
    include: { lines: true }
  });

  return NextResponse.json({ quoteId: quote.id, lineIds: quote.lines.map((line) => line.id) }, { status: 201 });
}
