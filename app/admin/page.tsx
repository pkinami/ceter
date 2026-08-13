import type { Prisma } from "@prisma/client";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { requireAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin | Ceter Operations" };

function asStringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asSpecsText(value: Prisma.JsonValue | null | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") return "";
  return Object.entries(value).map(([key, item]) => `${key}: ${String(item)}`).join("\n");
}

export default async function AdminPage() {
  const session = await requireAdminSession();

  const products = await prisma.product.findMany({
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } }
    },
    orderBy: [{ updated_at: "desc" }],
    take: 300
  });
  const quotes = await prisma.quoteRequest.findMany({ orderBy: { created_at: "desc" }, take: 100 });
  const orders = await prisma.order.findMany({ include: { profile: { select: { full_name: true } }, order_items: true, serials: true }, orderBy: { created_at: "desc" }, take: 100 });
  const movements = await prisma.stockMovement.findMany({
    include: { product: { select: { name: true, mpn: true, sku: true } }, user: { select: { full_name: true } } },
    orderBy: { created_at: "desc" },
    take: 8
  }).catch(() => []);
  const categories = await prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
  const brands = await prisma.brand.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });

  return (
    <AdminConsole
      session={{ role: session.role, name: session.name, email: session.email }}
      vatRate={Number(process.env.NEXT_PUBLIC_VAT_RATE ?? process.env.VAT_RATE ?? 0.16)}
      categories={categories}
      brands={brands}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        mpn: product.mpn,
        sku: product.sku,
        brand_id: product.brand_id,
        brand: product.brand?.name ?? "Unbranded",
        category_id: product.category_id,
        category: product.category?.name ?? "Uncategorized",
        price_kes: product.price_kes,
        cost_price_kes: product.cost_price_kes,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        condition: product.condition,
        reorder_level: product.reorder_level,
        reorder_quantity: product.reorder_quantity,
        supplier_name: product.supplier_name,
        images: asStringArray(product.images).filter((image) => image !== "/product-placeholder.svg"),
        specs: asSpecsText(product.specs),
        is_featured: product.is_featured,
        is_published: product.is_published,
        archived_at: product.archived_at?.toISOString() ?? null,
        updated_at: product.updated_at.toISOString()
      }))}
      quotes={quotes.map((quote, index) => ({
        id: quote.id,
        ref: `QT-${String(quotes.length - index).padStart(4, "0")}`,
        client: quote.name,
        need: quote.service_needed,
        status: quote.status,
        owner: quote.owner_id ? "Assigned" : "Unassigned",
        value: quote.quoted_value_kes ?? 0,
        createdAt: quote.created_at.toISOString(),
        followUpAt: quote.follow_up_at?.toISOString() ?? null
      }))}
      orders={orders.map((order, index) => ({
        id: order.id,
        ref: `SO-${String(orders.length - index).padStart(4, "0")}`,
        client: order.profile?.full_name ?? order.user_id ?? "Guest",
        status: order.status,
        total: order.total_kes,
        lines: order.order_items.length,
        needsSerials: order.serials.length > 0,
        createdAt: order.created_at.toISOString()
      }))}
      movements={movements.map((movement) => ({
        id: movement.id,
        product: movement.product.mpn ?? movement.product.sku ?? movement.product.name,
        delta: movement.delta,
        reason: movement.reason,
        reference: movement.reference,
        user: movement.user?.full_name ?? "System",
        createdAt: movement.created_at.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
      }))}
    />
  );
}
