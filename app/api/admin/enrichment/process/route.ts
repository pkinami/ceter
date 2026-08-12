import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { requireCapability } from "@/lib/admin/auth";
import { toStoredImage } from "@/lib/admin-import";
import { icecatProvider } from "@/lib/enrichment/icecat";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export async function POST() {
  const session = await requireCapability("price", ["edit"]);
  if (!icecatProvider.enabled()) return NextResponse.json({ error: "Icecat enrichment is disabled until credentials and licensing are verified." }, { status: 409 });

  const job = await prisma.enrichmentJob.findFirst({
    where: { provider: "icecat", status: "PENDING" },
    include: { product: { include: { brand: true } } },
    orderBy: { created_at: "asc" }
  });
  if (!job) return NextResponse.json({ processed: false });

  await prisma.enrichmentJob.update({ where: { id: job.id }, data: { status: "RUNNING", started_at: new Date() } });

  try {
    const payload = await icecatProvider.lookup({ brand: job.product.brand?.name, mpn: job.product.mpn ?? job.product.sku });
    const images = await storedImages(payload.images);
    const currentImages = Array.isArray(job.product.images) ? job.product.images.filter((image): image is string => typeof image === "string" && image !== "/product-placeholder.svg") : [];
    const appliedImages = images.length ? images : currentImages;

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: job.product_id },
        data: {
          name: payload.title || job.product.name,
          description: payload.description || job.product.description,
          mpn: payload.mpn || job.product.mpn,
          images: (appliedImages.length ? appliedImages : ["/product-placeholder.svg"]) as Prisma.InputJsonValue,
          specs: { ...(isRecord(job.product.specs) ? job.product.specs : {}), ...payload.specs } as Prisma.InputJsonValue,
          enriched_fields: {
            provider: "icecat",
            title: Boolean(payload.title),
            description: Boolean(payload.description),
            images: appliedImages.length,
            specs: Object.keys(payload.specs).length,
            category: payload.category ?? null
          } as Prisma.InputJsonValue,
          enriched_at: new Date()
        }
      });
      await tx.enrichmentJob.update({ where: { id: job.id }, data: { status: "DONE", finished_at: new Date(), payload: payload.raw as never } });
      await tx.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: job.product_id, action: "enrichment.done", before: {}, after: { provider: "icecat", images: appliedImages.length, specs: Object.keys(payload.specs).length } } });
    });
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/category");
    return NextResponse.json({ processed: true, applied: true, jobId: job.id, imageCount: appliedImages.length, specCount: Object.keys(payload.specs).length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrichment failed.";
    await prisma.enrichmentJob.update({ where: { id: job.id }, data: { status: "FAILED", finished_at: new Date(), error: message } });
    return NextResponse.json({ processed: true, jobId: job.id, error: message }, { status: 502 });
  }
}

async function storedImages(urls: string[]) {
  const settled = await Promise.allSettled(urls.slice(0, 6).map(toStoredImage));
  return settled.flatMap((item) => item.status === "fulfilled" ? [item.value] : []);
}

function isRecord(value: unknown): value is Record<string, string> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
