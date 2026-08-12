import type { Product, ProductRow } from "@/lib/types";
import { findPreviousPrice } from "@/lib/pricing";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asSpecs(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item)]));
}

export function mapProduct(row: ProductRow): Product {
  const images = asStringArray(row.images);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brands?.name ?? "Unbranded",
    brandId: row.brand_id,
    category: row.categories?.name ?? "Uncategorized",
    categoryId: row.category_id,
    categorySlug: row.categories?.slug ?? null,
    description: row.description,
    price: row.price_kes,
    previousPrice: findPreviousPrice(row.price_history ?? [], row.price_kes),
    inStock: row.stock_status === "in_stock" && row.stock_quantity > 0,
    stockStatus: row.stock_status,
    stockQuantity: row.stock_quantity,
    condition: row.condition,
    image: images[0] ?? "/product-placeholder.svg",
    images: images.length ? images : ["/product-placeholder.svg"],
    specs: asSpecs(row.specs),
    isFeatured: row.is_featured
  };
}
