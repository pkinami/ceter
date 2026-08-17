import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/product-mappers";
import { createClient } from "@/lib/supabase/server";
import type { ProductRow } from "@/lib/types";

type CartRequestItem = { productId?: unknown; quantity?: unknown };

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function productToRow(product: Awaited<ReturnType<typeof prisma.product.findMany>>[number] & { category?: { id: string; name: string; slug: string } | null; brand?: { id: string; name: string; slug: string } | null }): ProductRow {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category_id: product.category_id,
    brand_id: product.brand_id,
    price_kes: product.price_kes,
    condition: product.condition,
    stock_status: product.stock_status,
    stock_quantity: product.stock_quantity,
    images: product.images,
    specs: product.specs,
    is_featured: product.is_featured,
    show_offer_badge: product.show_offer_badge,
    show_flash_sale_badge: product.show_flash_sale_badge,
    categories: product.category ?? null,
    brands: product.brand ?? null
  };
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to load saved cart." }, { status: 401 });
  const items = await prisma.cartItem.findMany({
    where: { user_id: userId },
    include: { product: { include: { category: { select: { id: true, name: true, slug: true } }, brand: { select: { id: true, name: true, slug: true } } } } },
    orderBy: { updated_at: "desc" }
  });
  return NextResponse.json({
    items: items.map((item) => ({ product: mapProduct(productToRow(item.product)), quantity: item.quantity }))
  });
}

export async function PUT(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to save cart." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const items: CartRequestItem[] = Array.isArray(body.items) ? body.items : [];
  const normalized = items
    .map((item) => ({ productId: String(item.productId ?? ""), quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)) }))
    .filter((item) => item.productId);
  const ids = normalized.map((item) => item.productId);
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { user_id: userId, product_id: { notIn: ids.length ? ids : ["00000000-0000-0000-0000-000000000000"] } } }),
    ...normalized.map((item) => prisma.cartItem.upsert({
      where: { user_id_product_id: { user_id: userId, product_id: item.productId } },
      create: { user_id: userId, product_id: item.productId, quantity: item.quantity },
      update: { quantity: item.quantity }
    }))
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to update cart." }, { status: 401 });
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  if (url.searchParams.has("productId") && !productId) {
    return NextResponse.json({ error: "Product id is required." }, { status: 422 });
  }
  const result = await prisma.cartItem.deleteMany({ where: { user_id: userId, product_id: productId ?? undefined } });
  if (productId && result.count === 0) {
    return NextResponse.json({ error: "Cart item was not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, deleted: result.count });
}
