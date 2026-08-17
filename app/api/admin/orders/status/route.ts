import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin/auth";
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
  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { status } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "Order", entity_id: id, action: "status.change", before, after: { status } } })
  ]);

  return NextResponse.json({ ok: true });
}
