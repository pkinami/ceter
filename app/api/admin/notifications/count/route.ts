import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const count = await prisma.internalNotification.count({
    where: { status: "unread", OR: [{ recipient_id: null }, { recipient_id: session.userId }] }
  });
  return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
}
