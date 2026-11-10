export const PRODUCT_ITEM_TYPES = ["product", "raw_material"] as const;
export const PRODUCT_UNITS = ["pcs", "unit", "box", "service"] as const;
export const PRODUCT_IMPORT_COLUMNS = [
  "name", "slug", "description", "category", "brand", "mpn", "sku", "item_type", "unit", "price_kes",
  "cost_price_kes", "supplier_name", "supplier_lead_time_days", "reorder_level", "reorder_quantity", "condition",
  "stock_status", "stock_quantity", "images", "specs", "is_featured", "is_published"
] as const;

export type ProductItemType = (typeof PRODUCT_ITEM_TYPES)[number];
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export function parseProductInteger(value: unknown, optional = false): number | null {
  if ((value === null || value === undefined || String(value).trim() === "") && optional) return null;
  const text = String(value ?? "").trim();
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseProductItemType(value: unknown): ProductItemType | null {
  return typeof value === "string" && PRODUCT_ITEM_TYPES.includes(value.trim().toLowerCase() as ProductItemType)
    ? value.trim().toLowerCase() as ProductItemType
    : null;
}

export function parseProductUnit(value: unknown): ProductUnit | null {
  return typeof value === "string" && PRODUCT_UNITS.includes(value.trim().toLowerCase() as ProductUnit)
    ? value.trim().toLowerCase() as ProductUnit
    : null;
}

export function productItemTypeLabel(value: string | null | undefined) {
  if (value === "raw_material") return "Raw Material";
  if (value === "product") return "Product";
  return "Unclassified";
}
