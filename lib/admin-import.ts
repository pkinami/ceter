import type { Prisma, ProductCondition, StockStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readFirstWorksheet, rowsToObjects, writeWorkbook } from "@/lib/xlsx";

export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "slug",
  "description",
  "category",
  "brand",
  "price_kes",
  "condition",
  "stock_status",
  "stock_quantity",
  "images",
  "specs",
  "is_featured"
] as const;

export const CATEGORY_IMPORT_COLUMNS = ["name", "slug", "description", "icon", "image"] as const;

const PRODUCT_CONDITIONS: ProductCondition[] = ["new", "refurbished"];
const STOCK_STATUSES: StockStatus[] = ["in_stock", "backorder", "out_of_stock"];
const MAX_ROWS = 500;
const MAX_IMAGE_URLS = 3;
const PLACEHOLDER_IMAGE = "/product-placeholder.svg";

export type ImportKind = "products" | "categories";

type Lookup = {
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  existingProductSlugs: Set<string>;
  existingCategorySlugs: Set<string>;
};

export type PreviewRow = {
  rowNumber: number;
  operation: "create" | "update";
  data: Record<string, string | number | boolean | string[] | Record<string, string> | null>;
  errors: string[];
};

export type PreviewResult = {
  kind: ImportKind;
  rows: PreviewRow[];
  errorCount: number;
  rowLimit: number;
};

function key(value: string) {
  return value.trim().toLowerCase();
}

function required(value: string, label: string, errors: string[]) {
  if (!value.trim()) errors.push(`${label} is required.`);
}

function parseInteger(value: string, label: string, errors: string[], fallback?: number) {
  if (!value.trim() && fallback !== undefined) return fallback;
  if (!/^\d+$/.test(value.trim())) {
    errors.push(`${label} must be a whole number greater than or equal to 0.`);
    return 0;
  }
  return Number(value);
}

function parseBoolean(value: string, errors: string[]) {
  if (!value.trim()) return false;
  const normalized = key(value);
  if (["true", "yes", "1", "featured"].includes(normalized)) return true;
  if (["false", "no", "0", "not featured"].includes(normalized)) return false;
  errors.push("is_featured must be true/false, yes/no, or 1/0.");
  return false;
}

function parseImages(value: string, errors: string[], allowPlaceholder: boolean) {
  if (!value.trim()) return allowPlaceholder ? [PLACEHOLDER_IMAGE] : [];
  const images = value.split(";").map((item) => item.trim()).filter(Boolean);
  if (images.length < 1 || images.length > MAX_IMAGE_URLS) errors.push(`images must contain 1-${MAX_IMAGE_URLS} URLs separated by semicolons.`);
  for (const image of images) {
    if (!/^https?:\/\/\S+$/i.test(image) && !image.startsWith("/") && !image.startsWith("data:image/")) {
      errors.push(`Invalid image URL: ${image}`);
    }
  }
  return images;
}

function parseSpecs(value: string) {
  if (!value.trim()) return {};
  return Object.fromEntries(
    value.split(";").map((part) => part.split(":")).filter((part) => part.length >= 2).map(([name, ...rest]) => [name.trim(), rest.join(":").trim()]).filter(([name]) => name)
  );
}

function findBySlugOrName<T extends { id: string; name: string; slug: string }>(items: T[], value: string) {
  const normalized = key(value);
  if (!normalized) return null;
  return items.find((item) => key(item.slug) === normalized || key(item.name) === normalized) ?? null;
}

async function makeLookup(): Promise<Lookup> {
  const [categories, brands, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.brand.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.product.findMany({ select: { slug: true } })
  ]);
  return {
    categories,
    brands,
    existingProductSlugs: new Set(products.map((product) => key(product.slug))),
    existingCategorySlugs: new Set(categories.map((category) => key(category.slug)))
  };
}

function parseWorkbook(buffer: Buffer, expectedColumns: readonly string[]) {
  const worksheetRows = readFirstWorksheet(buffer);
  const rows = rowsToObjects(worksheetRows);
  const headings = worksheetRows[0]?.map((heading) => heading.trim()).filter(Boolean) ?? [];
  const missing = expectedColumns.filter((column) => !headings.includes(column));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}`);
  if (rows.length > MAX_ROWS) throw new Error(`The file has ${rows.length} rows. The limit is ${MAX_ROWS}.`);
  return rows;
}

function validateProductRows(buffer: Buffer, lookup: Lookup): PreviewRow[] {
  const workbookRows = parseWorkbook(buffer, PRODUCT_IMPORT_COLUMNS);
  const seenSlugs = new Set<string>();

  return workbookRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const slug = values.slug.trim();
    required(values.name, "name", errors);
    required(slug, "slug", errors);
    required(values.description, "description", errors);

    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("slug must be lowercase letters, numbers, and single hyphens.");
    if (seenSlugs.has(key(slug))) errors.push("slug is duplicated in this workbook.");
    if (slug) seenSlugs.add(key(slug));

    const category = values.category.trim() ? findBySlugOrName(lookup.categories, values.category) : null;
    const brand = values.brand.trim() ? findBySlugOrName(lookup.brands, values.brand) : null;
    if (values.category.trim() && !category) errors.push(`category was not found by slug or name: ${values.category}`);
    if (values.brand.trim() && !brand) errors.push(`brand was not found by slug or name: ${values.brand}`);

    const priceKes = parseInteger(values.price_kes, "price_kes", errors);
    const stockQuantity = parseInteger(values.stock_quantity, "stock_quantity", errors, 0);
    const condition = (values.condition.trim() || "new") as ProductCondition;
    const stockStatus = (values.stock_status.trim() || "in_stock") as StockStatus;
    if (!PRODUCT_CONDITIONS.includes(condition)) errors.push(`condition must be one of: ${PRODUCT_CONDITIONS.join(", ")}`);
    if (!STOCK_STATUSES.includes(stockStatus)) errors.push(`stock_status must be one of: ${STOCK_STATUSES.join(", ")}`);

    const images = parseImages(values.images, errors, true);
    const isFeatured = parseBoolean(values.is_featured, errors);

    return {
      rowNumber,
      operation: lookup.existingProductSlugs.has(key(slug)) ? "update" : "create",
      data: {
        name: values.name.trim(),
        slug,
        description: values.description.trim(),
        category_id: category?.id ?? null,
        category: category?.name ?? null,
        brand_id: brand?.id ?? null,
        brand: brand?.name ?? null,
        price_kes: priceKes,
        condition,
        stock_status: stockStatus,
        stock_quantity: stockQuantity,
        images,
        specs: parseSpecs(values.specs),
        is_featured: isFeatured
      },
      errors
    };
  });
}

function validateCategoryRows(buffer: Buffer, lookup: Lookup): PreviewRow[] {
  const workbookRows = parseWorkbook(buffer, CATEGORY_IMPORT_COLUMNS);
  const seenSlugs = new Set<string>();

  return workbookRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const slug = values.slug.trim();
    required(values.name, "name", errors);
    required(slug, "slug", errors);
    if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errors.push("slug must be lowercase letters, numbers, and single hyphens.");
    if (seenSlugs.has(key(slug))) errors.push("slug is duplicated in this workbook.");
    if (slug) seenSlugs.add(key(slug));
    const images = parseImages(values.image, errors, false);

    return {
      rowNumber,
      operation: lookup.existingCategorySlugs.has(key(slug)) ? "update" : "create",
      data: {
        name: values.name.trim(),
        slug,
        description: values.description.trim() || null,
        icon: values.icon.trim() || null,
        image: images[0] ?? null,
        images
      },
      errors
    };
  });
}

export async function previewImport(kind: ImportKind, buffer: Buffer): Promise<PreviewResult> {
  const lookup = await makeLookup();
  const rows = kind === "products" ? validateProductRows(buffer, lookup) : validateCategoryRows(buffer, lookup);
  return { kind, rows, errorCount: rows.reduce((sum, row) => sum + row.errors.length, 0), rowLimit: MAX_ROWS };
}

async function toStoredImage(value: string) {
  if (!/^https?:\/\//i.test(value)) return value;

  const response = await fetch(value);
  if (!response.ok) throw new Error(`Could not download image ${value}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`Image URL did not return an image: ${value}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 2 * 1024 * 1024) throw new Error(`Image is larger than 2 MB: ${value}`);
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

export async function commitImport(kind: ImportKind, buffer: Buffer) {
  const preview = await previewImport(kind, buffer);
  if (preview.errorCount > 0) return { ...preview, importedCount: 0, skippedCount: preview.rows.length };

  let importedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ rowNumber: number; errors: string[] }> = [];

  for (const row of preview.rows) {
    try {
      if (kind === "products") {
        const data = row.data;
        const images = await Promise.all((data.images as string[]).map(toStoredImage));
        await prisma.product.upsert({
          where: { slug: String(data.slug) },
          create: productData(data, images),
          update: productData(data, images)
        });
      } else {
        const data = row.data;
        const images = await Promise.all((data.images as string[]).map(toStoredImage));
        await prisma.category.upsert({
          where: { slug: String(data.slug) },
          create: categoryData(data, images[0] ?? null),
          update: categoryData(data, images[0] ?? null)
        });
      }
      importedCount += 1;
    } catch (error) {
      skippedCount += 1;
      errors.push({ rowNumber: row.rowNumber, errors: [error instanceof Error ? error.message : "Import failed."] });
    }
  }

  return { ...preview, importedCount, skippedCount, importErrors: errors };
}

function productData(data: PreviewRow["data"], images: string[]): Prisma.ProductUncheckedCreateInput {
  return {
    name: String(data.name),
    slug: String(data.slug),
    description: String(data.description),
    category_id: data.category_id ? String(data.category_id) : null,
    brand_id: data.brand_id ? String(data.brand_id) : null,
    price_kes: Number(data.price_kes),
    condition: data.condition as ProductCondition,
    stock_status: data.stock_status as StockStatus,
    stock_quantity: Number(data.stock_quantity),
    images,
    specs: data.specs as Prisma.InputJsonValue,
    is_featured: Boolean(data.is_featured)
  };
}

function categoryData(data: PreviewRow["data"], image: string | null): Prisma.CategoryUncheckedCreateInput {
  return {
    name: String(data.name),
    slug: String(data.slug),
    description: data.description ? String(data.description) : null,
    icon: data.icon ? String(data.icon) : null,
    image
  };
}

export function productTemplateWorkbook() {
  return writeWorkbook([
    {
      name: "Products",
      rows: [
        [...PRODUCT_IMPORT_COLUMNS],
        ["Lenovo ThinkPad T14 Gen 3", "lenovo-thinkpad-t14-gen-3", "Business laptop with Ryzen 5, 16GB RAM, and 512GB SSD.", "laptops", "lenovo", "145000", "refurbished", "in_stock", "8", "https://example.com/thinkpad-front.jpg;https://example.com/thinkpad-side.jpg", "CPU: Ryzen 5; RAM: 16GB; Storage: 512GB SSD", "true"],
        ["HP EliteDisplay E243", "hp-elitedisplay-e243", "23.8 inch FHD office monitor with adjustable stand.", "monitors", "hp", "24000", "new", "backorder", "0", "https://example.com/e243.jpg", "Size: 23.8 inch; Resolution: 1080p", "false"]
      ]
    },
    {
      name: "Instructions",
      rows: [
        ["Column", "Required", "Instructions"],
        ["name", "Required", "Product name."],
        ["slug", "Required", "Unique lowercase slug. Existing products with the same slug are updated."],
        ["description", "Required", "Plain product description."],
        ["category", "Optional", "Match an existing category by slug or name."],
        ["brand", "Optional", "Match an existing brand by slug or name."],
        ["price_kes", "Required", "Whole number in KES, greater than or equal to 0."],
        ["condition", "Optional", `Allowed values: ${PRODUCT_CONDITIONS.join(", ")}. Default: new.`],
        ["stock_status", "Optional", `Allowed values: ${STOCK_STATUSES.join(", ")}. Default: in_stock.`],
        ["stock_quantity", "Optional", "Whole number, greater than or equal to 0. Default: 0."],
        ["images", "Optional", "Use 1-3 image URLs separated by semicolons, for example image1.jpg;image2.jpg;image3.jpg. Blank uses /product-placeholder.svg."],
        ["specs", "Optional", "Use semicolon-separated Key: Value pairs."],
        ["is_featured", "Optional", "Allowed values: true/false, yes/no, 1/0. Default: false."]
      ]
    }
  ]);
}

export function categoryTemplateWorkbook() {
  return writeWorkbook([
    {
      name: "Categories",
      rows: [
        [...CATEGORY_IMPORT_COLUMNS],
        ["Laptops", "laptops", "Business laptops, notebooks, and ultrabooks.", "Laptop", "https://example.com/laptops.jpg;https://example.com/laptop-detail.jpg"],
        ["Networking", "networking", "Routers, switches, access points, and structured cabling.", "Network", "https://example.com/networking.jpg"]
      ]
    },
    {
      name: "Instructions",
      rows: [
        ["Column", "Required", "Instructions"],
        ["name", "Required", "Category name."],
        ["slug", "Required", "Unique lowercase slug. Existing categories with the same slug are updated."],
        ["description", "Optional", "Plain category description."],
        ["icon", "Optional", "Icon text or image URL matching the manual category form."],
        ["image", "Optional", "Use 1-3 image URLs separated by semicolons, for example image1.jpg;image2.jpg;image3.jpg. The first image is stored as the category image."]
      ]
    }
  ]);
}
