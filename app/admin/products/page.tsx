import { hasPermission, requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { ProductInventoryClient, type InventoryItemRow, type InventorySummaryCard } from "@/components/admin/ProductInventoryClient";

export default async function ProductsPage() {
  const session = await requirePermission("products.view");
  const canViewCost = hasPermission(session, "products.cost_price.view");
  const canManage = hasPermission(session, "products.update");
  const canImport = hasPermission(session, "products.import");
  const [products, services, categories] = await Promise.all([
    prisma.product.findMany({
      where: { archived_at: null },
      orderBy: [{ updated_at: "desc" }, { name: "asc" }],
      include: { category: true, brand: true }
    }),
    prisma.serviceEntry.findMany({
      orderBy: [{ sort_order: "asc" }, { title: "asc" }]
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { name: true }
    })
  ]);

  const rows: InventoryItemRow[] = [
    ...products.map((product): InventoryItemRow => {
      const image = productImages(product.images)[0] ?? "";
      const stockStatus = product.stock_quantity <= 0
        ? "Out of Stock"
        : product.reorder_level > 0 && product.stock_quantity <= product.reorder_level
          ? "Low Stock"
          : product.stock_status === "backorder"
            ? "Backorder"
            : "In Stock";
      const type = product.item_type === "raw_material" ? "Raw Material" : product.item_type === "product" ? "Product" : "Unclassified";
      return {
        id: product.id,
        kind: "product",
        type,
        product: type,
        image,
        name: product.name,
        slug: product.slug,
        description: product.description,
        stock: product.stock_quantity,
        unit: product.unit ?? "—",
        category: product.category?.name ?? "Uncategorised",
        brand: product.brand?.name ?? "Unbranded",
        sku: product.sku ?? product.mpn ?? "-",
        mpn: product.mpn ?? "",
        supplier: product.supplier_name ?? "",
        condition: product.condition,
        publication: product.is_published ? "Published" : "Draft",
        featured: product.is_featured,
        buyingPrice: canViewCost ? product.cost_price_kes ?? 0 : null,
        sellingPrice: product.price_kes,
        status: stockStatus,
        editHref: `/admin/products/${product.id}/edit`,
        viewHref: `/product/${product.slug}`
      };
    }),
    ...services.map((service): InventoryItemRow => ({
      id: service.id,
      kind: "service",
      type: "Service",
      product: "Service",
      image: service.image ?? "",
      name: service.title,
      description: service.description,
      stock: null,
      unit: "service",
      category: "Services",
      sku: "-",
      buyingPrice: null,
      sellingPrice: service.price_kes ?? null,
      status: service.is_enabled ? "Active" : "Inactive",
      editHref: "/admin/services",
      viewHref: `/services#${service.slug}`
    }))
  ];

  const productCount = products.filter((product) => product.item_type === "product").length;
  const rawMaterialCount = products.filter((product) => product.item_type === "raw_material").length;
  const lowStock = products.filter((product) => product.stock_quantity > 0 && product.reorder_level > 0 && product.stock_quantity <= product.reorder_level).length;
  const outOfStock = products.filter((product) => product.stock_quantity <= 0 || product.stock_status === "out_of_stock").length;

  const summary: InventorySummaryCard[] = [
    { label: "All Items", value: rows.length, description: "Total inventory items", icon: "bag", pill: "All Items", breakdown: [{ label: "Products & Raw Mat.", value: products.length }, { label: "Services", value: services.length }] },
    { label: "Products", value: productCount, description: "Physical goods", icon: "box", pill: "Products" },
    { label: "Raw Materials", value: rawMaterialCount, description: "Raw materials", icon: "grid", pill: "Raw Mat." },
    { label: "Services", value: services.length, description: "Service items", icon: "image", pill: "Services" },
    { label: "Out of Stock", value: outOfStock, description: "Out of stock", icon: "stock", supportingValue: lowStock }
  ];

  return (
    <ProductInventoryClient
      rows={rows}
      summary={summary}
      categories={["All Categories", ...categories.map((category) => category.name)]}
      canManage={canManage}
      canImport={canImport}
      canViewCost={canViewCost}
    />
  );
}

function productImages(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}
