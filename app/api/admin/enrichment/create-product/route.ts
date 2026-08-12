import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireCapability } from "@/lib/admin/auth";
import { toStoredImage } from "@/lib/admin-import";
import type { EnrichmentLookup, EnrichmentResult } from "@/lib/enrichment/provider";
import { icecatProvider } from "@/lib/enrichment/icecat";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type Payload = {
  lookup: EnrichmentLookup;
  priceKes: number;
  costPriceKes: number;
  stockQuantity: number;
  supplierName: string;
  categoryId: string;
};

export async function POST(request: Request) {
  const session = await requireCapability("price", ["edit"]);
  const payload = await request.json() as Payload;
  const commercialErrors = [
    requiredMoney(payload.priceKes, "priceKes"),
    requiredMoney(payload.costPriceKes, "costPriceKes"),
    requiredWholeNumber(payload.stockQuantity, "stockQuantity"),
    payload.supplierName?.trim() ? null : "supplierName is required.",
    payload.categoryId?.trim() ? null : "categoryId is required."
  ].filter(Boolean);
  if (commercialErrors.length) return NextResponse.json({ error: commercialErrors.join(" ") }, { status: 422 });

  const lookupKey = icecatProvider.lookupKey(payload.lookup);
  const cached = await prisma.icecatLookupCache.findUnique({ where: { provider_lookup_key: { provider: "icecat", lookup_key: lookupKey } } });
  const result = cached?.result as unknown as EnrichmentResult | undefined;
  if (!result) return NextResponse.json({ error: "Run Find product before creating a listing." }, { status: 409 });
  if (!result.title || !result.brand || !result.mpn) return NextResponse.json({ error: "Icecat result is missing title, brand or MPN." }, { status: 422 });

  const duplicate = await prisma.product.findFirst({
    where: { brand: { name: { equals: result.brand, mode: "insensitive" } }, mpn: { equals: result.mpn, mode: "insensitive" } },
    select: { id: true, name: true, slug: true }
  });
  if (duplicate) return NextResponse.json({ conflict: true, duplicate, message: "A product already exists for this brand and MPN. Enrich the existing record instead." }, { status: 409 });

  const brand = await prisma.brand.upsert({
    where: { slug: slugify(result.brand) },
    create: { name: result.brand, slug: slugify(result.brand) },
    update: {}
  });
  const images = await Promise.all(result.images.slice(0, 6).map(toStoredImage));
  const slug = await uniqueProductSlug(result.title!);

  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: result.title!,
        slug,
        description: result.description ?? result.title!,
        mpn: result.mpn,
        sku: result.mpn,
        brand_id: brand.id,
        category_id: payload.categoryId,
        price_kes: payload.priceKes,
        cost_price_kes: payload.costPriceKes,
        supplier_name: payload.supplierName.trim(),
        stock_quantity: payload.stockQuantity,
        stock_status: payload.stockQuantity > 0 ? "in_stock" : "out_of_stock",
        images: images.length ? images : ["/product-placeholder.svg"],
        specs: result.specs as Prisma.InputJsonValue,
        enriched_fields: {
          provider: result.provider,
          title: true,
          description: Boolean(result.description),
          images: images.length,
          specs: Object.keys(result.specs).length,
          category: result.category ?? null
        },
        enriched_at: new Date()
      }
    });
    await tx.priceHistory.create({ data: { product_id: product.id, price_kes: product.price_kes, changed_by: session.userId, note: "Opening price from Icecat-assisted listing" } });
    if (product.stock_quantity > 0) {
      await tx.stockMovement.create({ data: { product_id: product.id, delta: product.stock_quantity, reason: "OPENING_BALANCE", reference: "Icecat-assisted listing", user_id: session.userId } });
    }
    await tx.auditLog.create({ data: { user_id: session.userId, entity: "Product", entity_id: product.id, action: "icecat.create", before: {}, after: { lookupKey } } });
    return product;
  });

  return NextResponse.json({ product: { id: created.id, name: created.name, slug: created.slug } });
}

function requiredMoney(value: number, label: string) {
  return Number.isInteger(value) && value >= 0 ? null : `${label} must be a whole number greater than or equal to 0.`;
}

function requiredWholeNumber(value: number, label: string) {
  return Number.isInteger(value) && value >= 0 ? null : `${label} must be a whole number greater than or equal to 0.`;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "product";
}

async function uniqueProductSlug(title: string) {
  const base = slugify(title);
  let slug = base;
  let index = 2;
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}
