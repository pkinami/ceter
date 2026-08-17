import { Prisma, type OrderStatus, type PaymentStatus, type Product, type QuoteStatus, type StockStatus } from "@prisma/client";
import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export const PRODUCT_PAGE_SIZE = 25;

async function adminRead<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientAdminReadError(error) || attempt === 2) break;
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function isTransientAdminReadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "P2039" || /EAUTHTIMEOUT|timeout while waiting|timeout exceeded|Connection terminated|Can't reach database|ECONNRESET|ETIMEDOUT/i.test(message);
}

export type ProductListSearch = {
  q?: string;
  brand?: string;
  category?: string;
  publication?: "published" | "draft" | "all";
  stock?: StockStatus | "low" | "all";
  sort?: "name" | "newest" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc";
  page?: number;
};

export function pageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function searchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export async function getAdminDashboard() {
  noStore();
  const [
    totalProducts,
    publishedProducts,
    draftProducts,
    inStockProducts,
    backorderProducts,
    lowStockProducts,
    stockValue,
    orderCount,
    quoteCount,
    customerCount,
    paidPayment,
    recentProducts,
    recentOrders,
    recentQuotes,
    recentPayments
  ] = await Promise.all([
    prisma.product.count({ where: { archived_at: null } }),
    prisma.product.count({ where: { archived_at: null, is_published: true } }),
    prisma.product.count({ where: { archived_at: null, is_published: false } }),
    prisma.product.count({ where: { archived_at: null, stock_status: "in_stock" } }),
    prisma.product.count({ where: { archived_at: null, stock_status: "backorder" } }),
    prisma.product.count({ where: { archived_at: null, reorder_level: { gt: 0 }, stock_quantity: { lte: prisma.product.fields.reorder_level } } }),
    prisma.product.aggregate({
      where: { archived_at: null },
      _sum: { stock_quantity: true }
    }),
    prisma.order.count(),
    prisma.quoteRequest.count(),
    prisma.profile.count({ where: { role: "customer" } }),
    prisma.paymentTransaction.aggregate({ where: { status: "paid" }, _sum: { amount_kes: true }, _count: true }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { updated_at: "desc" }, take: 6, select: { id: true, name: true, updated_at: true, is_published: true, stock_quantity: true } }),
    prisma.order.findMany({ orderBy: { created_at: "desc" }, take: 6, include: { profile: true, _count: { select: { order_items: true } } } }),
    prisma.quoteRequest.findMany({ orderBy: { created_at: "desc" }, take: 6 }),
    prisma.paymentTransaction.findMany({ orderBy: { created_at: "desc" }, take: 6, include: { order: { include: { profile: true } } } })
  ]);

  const values = await prisma.$queryRaw<Array<{ stock_units: bigint | number | null; cost_value: bigint | number | null; selling_value: bigint | number | null }>>`
    select
      coalesce(sum(stock_quantity), 0) as stock_units,
      coalesce(sum(stock_quantity * coalesce(cost_price_kes, 0)), 0) as cost_value,
      coalesce(sum(stock_quantity * price_kes), 0) as selling_value
    from public.products
    where archived_at is null
  `;
  const inventory = values[0] ?? { stock_units: 0, cost_value: 0, selling_value: 0 };

  return {
    totalProducts,
    publishedProducts,
    draftProducts,
    inStockProducts,
    backorderProducts,
    lowStockProducts,
    stockUnits: toNumber(inventory.stock_units ?? stockValue._sum.stock_quantity ?? 0),
    inventoryCostValue: toNumber(inventory.cost_value),
    inventorySellingValue: toNumber(inventory.selling_value),
    orders: orderCount,
    quotes: quoteCount,
    customers: customerCount,
    paidPayments: paidPayment._count,
    paidRevenue: paidPayment._sum.amount_kes ?? 0,
    recentProducts,
    recentOrders,
    recentQuotes,
    recentPayments
  };
}

export async function getProductFilters() {
  noStore();
  const [brands, categories] = await adminRead(() => Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    prisma.category.findMany({ orderBy: [{ parent_id: "asc" }, { sort_order: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, parent_id: true } })
  ]));
  return { brands, categories };
}

export async function getProductsPage(input: ProductListSearch = {}) {
  noStore();
  const page = input.page && input.page > 0 ? input.page : 1;
  const where = productWhere(input);
  const orderBy = productOrderBy(input.sort);
  const [items, total, filters] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PRODUCT_PAGE_SIZE,
      take: PRODUCT_PAGE_SIZE,
      include: { brand: true, category: true, _count: { select: { order_items: true, quote_lines: true, stock_movements: true, serials: true } } }
    }),
    prisma.product.count({ where }),
    getProductFilters()
  ]);
  return { items, total, page, pageSize: PRODUCT_PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / PRODUCT_PAGE_SIZE)), ...filters };
}

export async function getProductFormLookups() {
  return getProductFilters();
}

export async function getCategoryMetrics() {
  noStore();
  const categories = await prisma.category.findMany({ orderBy: [{ parent_id: "asc" }, { sort_order: "asc" }, { name: "asc" }], include: { parent: true } });
  const metrics = await prisma.$queryRaw<Array<{ category_id: string | null; products: bigint; published: bigint; stock_units: bigint; cost_value: bigint; selling_value: bigint }>>`
    select category_id,
      count(*)::bigint as products,
      count(*) filter (where is_published = true and archived_at is null)::bigint as published,
      coalesce(sum(stock_quantity), 0)::bigint as stock_units,
      coalesce(sum(stock_quantity * coalesce(cost_price_kes, 0)), 0)::bigint as cost_value,
      coalesce(sum(stock_quantity * price_kes), 0)::bigint as selling_value
    from public.products
    where archived_at is null
    group by category_id
  `;
  const byId = new Map(metrics.map((item) => [item.category_id, item]));
  return categories.map((category) => ({ category, metric: byId.get(category.id) ?? emptyMetric(category.id) }));
}

export async function getBrandMetrics() {
  noStore();
  const brands = await prisma.brand.findMany({ orderBy: { name: "asc" } });
  const metrics = await prisma.$queryRaw<Array<{ brand_id: string | null; products: bigint; published: bigint; in_stock: bigint; backorder: bigint; stock_value: bigint }>>`
    select brand_id,
      count(*)::bigint as products,
      count(*) filter (where is_published = true and archived_at is null)::bigint as published,
      count(*) filter (where stock_status = 'in_stock' and archived_at is null)::bigint as in_stock,
      count(*) filter (where stock_status = 'backorder' and archived_at is null)::bigint as backorder,
      coalesce(sum(stock_quantity * coalesce(cost_price_kes, 0)), 0)::bigint as stock_value
    from public.products
    where archived_at is null
    group by brand_id
  `;
  const distribution = await prisma.$queryRaw<Array<{ brand_id: string | null; category_name: string | null; products: bigint }>>`
    select p.brand_id, c.name as category_name, count(*)::bigint as products
    from public.products p
    left join public.categories c on c.id = p.category_id
    where p.archived_at is null
    group by p.brand_id, c.name
  `;
  const byId = new Map(metrics.map((item) => [item.brand_id, item]));
  return brands.map((brand) => ({
    brand,
    metric: byId.get(brand.id) ?? { brand_id: brand.id, products: 0, published: 0, in_stock: 0, backorder: 0, stock_value: 0 },
    distribution: distribution.filter((item) => item.brand_id === brand.id)
  }));
}

export async function getOrders(status?: OrderStatus | "all") {
  noStore();
  return prisma.order.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { created_at: "desc" },
    take: 100,
    include: { profile: true, payments: { orderBy: { created_at: "desc" }, take: 1 }, order_items: { include: { product: true } } }
  });
}

export async function getQuotes(status?: QuoteStatus | "all") {
  noStore();
  return prisma.quoteRequest.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { created_at: "desc" },
    take: 100,
    include: { lines: { include: { product: true }, orderBy: { sort_order: "asc" } } }
  });
}

export async function getCustomers() {
  noStore();
  return prisma.profile.findMany({
    where: { role: "customer" },
    orderBy: { created_at: "desc" },
    take: 100,
    include: { orders: { include: { payments: true } } }
  });
}

export async function getPayments(status?: PaymentStatus | "all") {
  noStore();
  return prisma.paymentTransaction.findMany({
    where: status && status !== "all" ? { status } : undefined,
    orderBy: { created_at: "desc" },
    take: 100,
    include: { order: { include: { profile: true } } }
  });
}

export async function getBanners() {
  noStore();
  return adminRead(() => prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sort_order: "asc" }, { title: "asc" }], include: { category: true } }));
}

export async function getServiceEntries() {
  noStore();
  return adminRead(() => prisma.serviceEntry.findMany({ orderBy: [{ sort_order: "asc" }, { title: "asc" }] }));
}

export async function getHomepageSectionsAdmin() {
  noStore();
  return adminRead(() => prisma.homepageSection.findMany({
    include: { category: true },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }]
  }));
}

export async function getReports() {
  noStore();
  const [byBrand, byCategory, quotePipeline, orderTotals, paidRevenue] = await Promise.all([
    prisma.$queryRaw<Array<{ name: string | null; products: bigint; published: bigint; stock_units: bigint; cost_value: bigint; selling_value: bigint }>>`
      select b.name, count(*)::bigint products,
        count(*) filter (where p.is_published = true and p.archived_at is null)::bigint published,
        coalesce(sum(p.stock_quantity), 0)::bigint stock_units,
        coalesce(sum(p.stock_quantity * coalesce(p.cost_price_kes, 0)), 0)::bigint cost_value,
        coalesce(sum(p.stock_quantity * p.price_kes), 0)::bigint selling_value
      from public.products p left join public.brands b on b.id = p.brand_id
      where p.archived_at is null group by b.name order by products desc
    `,
    prisma.$queryRaw<Array<{ name: string | null; products: bigint; published: bigint; stock_units: bigint; cost_value: bigint; selling_value: bigint }>>`
      select c.name, count(*)::bigint products,
        count(*) filter (where p.is_published = true and p.archived_at is null)::bigint published,
        coalesce(sum(p.stock_quantity), 0)::bigint stock_units,
        coalesce(sum(p.stock_quantity * coalesce(p.cost_price_kes, 0)), 0)::bigint cost_value,
        coalesce(sum(p.stock_quantity * p.price_kes), 0)::bigint selling_value
      from public.products p left join public.categories c on c.id = p.category_id
      where p.archived_at is null group by c.name order by products desc
    `,
    prisma.quoteRequest.groupBy({ by: ["status"], _count: true, _sum: { quoted_value_kes: true } }),
    prisma.order.groupBy({ by: ["status"], _count: true, _sum: { total_kes: true } }),
    prisma.paymentTransaction.groupBy({ by: ["status"], _count: true, _sum: { amount_kes: true } })
  ]);
  return { byBrand, byCategory, quotePipeline, orderTotals, paidRevenue };
}

export async function getInventoryMovements(productId?: string) {
  noStore();
  return prisma.stockMovement.findMany({
    where: productId ? { product_id: productId } : undefined,
    orderBy: { created_at: "desc" },
    take: 100,
    include: { product: true, user: true }
  });
}

export async function getAdminUsers() {
  noStore();
  return prisma.profile.findMany({ where: { role: { in: ["admin", "owner", "manager", "sales", "store"] } }, orderBy: { created_at: "desc" } });
}

function productWhere(input: ProductListSearch): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { archived_at: null };
  if (input.q?.trim()) {
    const contains = input.q.trim();
    where.OR = [
      { name: { contains, mode: "insensitive" } },
      { slug: { contains, mode: "insensitive" } },
      { sku: { contains, mode: "insensitive" } },
      { mpn: { contains, mode: "insensitive" } },
      { brand: { name: { contains, mode: "insensitive" } } },
      { category: { name: { contains, mode: "insensitive" } } }
    ];
  }
  if (input.brand) where.brand_id = input.brand;
  if (input.category) where.category_id = input.category;
  if (input.publication === "published") where.is_published = true;
  if (input.publication === "draft") where.is_published = false;
  if (input.stock && input.stock !== "all" && input.stock !== "low") where.stock_status = input.stock;
  if (input.stock === "low") where.AND = [{ reorder_level: { gt: 0 } }, { stock_quantity: { lte: prisma.product.fields.reorder_level } }];
  return where;
}

function productOrderBy(sort: ProductListSearch["sort"]): Prisma.ProductOrderByWithRelationInput {
  if (sort === "price_asc") return { price_kes: "asc" };
  if (sort === "price_desc") return { price_kes: "desc" };
  if (sort === "stock_asc") return { stock_quantity: "asc" };
  if (sort === "stock_desc") return { stock_quantity: "desc" };
  if (sort === "name") return { name: "asc" };
  return { updated_at: "desc" };
}

function emptyMetric(categoryId: string) {
  return { category_id: categoryId, products: 0, published: 0, stock_units: 0, cost_value: 0, selling_value: 0 };
}

export function toNumber(value: bigint | number | null | undefined) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}

export function stockStatusForQuantity(quantity: number, requested?: StockStatus): StockStatus {
  if (requested) return requested;
  if (quantity <= 0) return requested === "backorder" ? "backorder" : "out_of_stock";
  return "in_stock";
}

export function productCanDelete(product: Product & { _count?: { order_items: number; quote_lines: number; stock_movements: number; serials: number } }) {
  const count = product._count;
  if (!count) return false;
  return count.order_items === 0 && count.quote_lines === 0 && count.stock_movements === 0 && count.serials === 0;
}
