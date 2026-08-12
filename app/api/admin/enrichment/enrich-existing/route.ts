import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await requireCapability("price", ["edit"]);
  const { productIds } = await request.json() as { productIds?: string[] };
  const ids = [...new Set(productIds ?? [])].filter(Boolean);
  if (!ids.length) return NextResponse.json({ error: "Select at least one product to enrich." }, { status: 422 });

  const products = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const jobs = [];
  for (const product of products) {
    jobs.push(await prisma.enrichmentJob.create({ data: { product_id: product.id, provider: "icecat", requested_by: session.userId } }));
  }

  return NextResponse.json({ queued: jobs.length, jobIds: jobs.map((job) => job.id) });
}
