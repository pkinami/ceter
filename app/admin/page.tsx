import type { Prisma } from "@prisma/client";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { requireAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin | Ceter Operations" };

function asStringArray(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default async function AdminPage() {
  const session = await requireAdminSession();

  const [products, quotes, orders, movements, categories, brands] = await Promise.all([
    prisma.product.findMany({
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        printer_compatibilities: { include: { consumable: { include: { brand: { select: { name: true } }, category: { select: { name: true } } } } } },
        consumable_compatibilities: { include: { printer: { include: { brand: { select: { name: true } }, category: { select: { name: true } } } } } },
        enrichment_jobs: { orderBy: { created_at: "desc" }, take: 1 }
      },
      orderBy: [{ updated_at: "desc" }],
      take: 300
    }),
    prisma.quoteRequest.findMany({ orderBy: { created_at: "desc" }, take: 100 }),
    prisma.order.findMany({ include: { profile: { select: { full_name: true } }, order_items: true, serials: true }, orderBy: { created_at: "desc" }, take: 100 }),
    prisma.stockMovement.findMany({
      include: { product: { select: { name: true, mpn: true, sku: true } }, user: { select: { full_name: true } } },
      orderBy: { created_at: "desc" },
      take: 8
    }).catch(() => []),
    prisma.category.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } })
  ]);

  return (
    <AdminConsole
      session={{ role: session.role, name: session.name, email: session.email }}
      vatRate={Number(process.env.NEXT_PUBLIC_VAT_RATE ?? process.env.VAT_RATE ?? 0.16)}
      icecatEnabled={process.env.CATALOG_ENRICHMENT_PROVIDER === "icecat" && Boolean(process.env.ICECAT_USERNAME || process.env.ICECAT_API_TOKEN)}
      categories={categories}
      brands={brands}
      products={products.map((product) => ({
        id: product.id,
        name: product.name,
        slug: product.slug,
        mpn: product.mpn,
        sku: product.sku,
        brand: product.brand?.name ?? "Unbranded",
        category: product.category?.name ?? "Uncategorized",
        price_kes: product.price_kes,
        cost_price_kes: product.cost_price_kes,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        reorder_level: product.reorder_level,
        reorder_quantity: product.reorder_quantity,
        supplier_name: product.supplier_name,
        images: asStringArray(product.images).filter((image) => image !== "/product-placeholder.svg"),
        is_published: product.is_published,
        archived_at: product.archived_at?.toISOString() ?? null,
        updated_at: product.updated_at.toISOString(),
        enriched_at: product.enriched_at?.toISOString() ?? null,
        latestEnrichmentJob: product.enrichment_jobs[0] ? {
          status: product.enrichment_jobs[0].status,
          error: product.enrichment_jobs[0].error
        } : null,
        compatibleCount: product.printer_compatibilities.length + product.consumable_compatibilities.length,
        consumableCount: product.printer_compatibilities.length,
        compatibilities: [
          ...product.printer_compatibilities.map((item) => ({
            id: item.id,
            relationType: item.relation_type,
            direction: "printer" as const,
            product: {
              id: item.consumable.id,
              name: item.consumable.name,
              slug: item.consumable.slug,
              mpn: item.consumable.mpn,
              sku: item.consumable.sku,
              brand: item.consumable.brand?.name ?? "Unbranded",
              category: item.consumable.category?.name ?? "Uncategorized",
              stock_quantity: item.consumable.stock_quantity
            }
          })),
          ...product.consumable_compatibilities.map((item) => ({
            id: item.id,
            relationType: item.relation_type,
            direction: "consumable" as const,
            product: {
              id: item.printer.id,
              name: item.printer.name,
              slug: item.printer.slug,
              mpn: item.printer.mpn,
              sku: item.printer.sku,
              brand: item.printer.brand?.name ?? "Unbranded",
              category: item.printer.category?.name ?? "Uncategorized",
              stock_quantity: item.printer.stock_quantity
            }
          }))
        ]
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
