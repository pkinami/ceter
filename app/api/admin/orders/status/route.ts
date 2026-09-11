import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin/auth";
import { stockStatusForQuantity } from "@/lib/admin/data";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  let session: Awaited<ReturnType<typeof requireCapability>>;
  try {
    session = await requireCapability("orders", ["full", "fulfil"]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Admin access is required." }, { status: 403 });
  }
  const { id, status } = await request.json() as { id?: string; status?: "pending" | "processing" | "paid" | "fulfilled" | "cancelled" };
  if (!id || !status) return NextResponse.json({ error: "Order id and status are required." }, { status: 422 });

  const before = await prisma.order.findUnique({ where: { id }, select: { status: true } });
  if (!before) throw new Error("Order not found.");
  if (status === "cancelled" && before.status !== "cancelled") {
    await cancelStorefrontOrder(id, session.userId, before);
  } else {
    await prisma.$transaction([
      prisma.order.update({ where: { id }, data: { status } }),
      prisma.auditLog.create({ data: { user_id: session.userId, entity: "Order", entity_id: id, action: "status.change", before, after: { status } } })
    ]);
  }

  return NextResponse.json({ ok: true });
}

async function cancelStorefrontOrder(id: string, userId: string, before: { status: string }) {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id }, include: { order_items: true } });
    if (!order) throw new Error("Order not found.");

    const reversalReference = `Cancellation ${order.id}`;
    const existingReversals = await tx.stockMovement.findMany({
      where: { reference: reversalReference },
      select: { product_id: true }
    });
    const reversedProductIds = new Set(existingReversals.map((movement) => movement.product_id));

    for (const item of order.order_items) {
      if (!item.product_id || reversedProductIds.has(item.product_id)) continue;
      const saleMovement = await tx.stockMovement.findFirst({
        where: { product_id: item.product_id, reason: "SALE", reference: `Order ${order.id}` }
      });
      if (!saleMovement) continue;

      const quantity = Math.max(1, item.quantity);
      const product = await tx.product.update({
        where: { id: item.product_id },
        data: { stock_quantity: { increment: quantity } },
        select: { stock_quantity: true }
      });
      await tx.product.update({
        where: { id: item.product_id },
        data: { stock_status: stockStatusForQuantity(product.stock_quantity) }
      });
      await tx.stockMovement.create({
        data: {
          product_id: item.product_id,
          delta: quantity,
          reason: "RETURN",
          reference: reversalReference,
          user_id: userId
        }
      });
    }

    await tx.paymentTransaction.updateMany({
      where: { order_id: order.id, status: { in: ["pending", "initiated", "processing"] } },
      data: { status: "cancelled", verified_at: new Date() }
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "cancelled",
        payment_status: "cancelled",
        fulfilment_status: "cancelled",
        delivery_status: "cancelled",
        cancelled_at: new Date()
      }
    });
    await tx.auditLog.create({
      data: {
        user_id: userId,
        entity: "Order",
        entity_id: order.id,
        action: "status.cancel",
        before,
        after: { status: "cancelled", stock_reversed: true }
      }
    });
  });
}
