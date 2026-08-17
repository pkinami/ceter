import { Prisma, type ProductCondition, type StockStatus } from "@prisma/client";
import { storeProductImage } from "@/lib/product-image-storage";
import { prisma } from "@/lib/prisma";
import { readFirstWorksheet, rowsToObjects, writeWorkbook } from "@/lib/xlsx";
import { BUILT_IN_PARENT_CATEGORIES, BUILT_IN_PARENT_CATEGORY_SLUGS, builtInParentCategoryBySlug } from "@/lib/category-icons";
import { ensureBuiltInParentCategories } from "@/lib/category-seeding";

export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "slug",
  "description",
  "category",
  "brand",
  "mpn",
  "sku",
  "price_kes",
  "cost_price_kes",
  "supplier_name",
  "supplier_lead_time_days",
  "reorder_level",
  "reorder_quantity",
  "condition",
  "stock_status",
  "stock_quantity",
  "images",
  "specs",
  "is_featured",
  "is_published"
] as const;

export const CATEGORY_IMPORT_COLUMNS = ["name", "slug", "parent_slug", "description", "icon", "sort_order"] as const;

const PRODUCT_CONDITIONS: ProductCondition[] = ["new", "refurbished"];
const STOCK_STATUSES: StockStatus[] = ["in_stock", "backorder", "out_of_stock"];
const MAX_ROWS = 500;
const MAX_IMAGE_URLS = 3;

export type ImportKind = "products" | "categories";

type Lookup = {
  categories: Array<{ id: string; name: string; slug: string; parent_id: string | null }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  existingProductSlugs: Set<string>;
  existingCategorySlugs: Set<string>;
  categoryDepths: Map<string, number>;
};

type WorkbookRow = ReturnType<typeof parseWorkbook>[number];

export type ImportProgressStage = "Validating" | "Importing" | "Importing products" | "Downloading images" | "Saving" | "Complete";

export type ImportProgress = {
  stage: ImportProgressStage;
  processed: number;
  total: number;
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

export type CommitImportResult = PreviewResult & {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  affectedSlugs: string[];
  importErrors: Array<{ rowNumber: number; errors: string[] }>;
};

function key(value: string) {
  return value.trim().toLowerCase();
}

function isSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.trim());
}

function slugify(value: string) {
  return key(value)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleFromSlug(value: string) {
  return value
    .trim()
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function parseOptionalInteger(value: string, label: string, errors: string[]) {
  if (!value.trim()) return null;
  return parseInteger(value, label, errors);
}

function parseBoolean(value: string, label: string, errors: string[]) {
  if (!value.trim()) return false;
  const normalized = key(value);
  if (["true", "yes", "1", "featured"].includes(normalized)) return true;
  if (["false", "no", "0", "not featured"].includes(normalized)) return false;
  errors.push(`${label} must be true/false, yes/no, or 1/0.`);
  return false;
}

function parseImages(value: string, errors: string[], remoteOnly = false) {
  if (!value.trim()) return [];
  const images = value.split(";").map((item) => item.trim()).filter(Boolean);
  if (images.length < 1 || images.length > MAX_IMAGE_URLS) errors.push(`images must contain 1-${MAX_IMAGE_URLS} URLs separated by semicolons.`);
  for (const image of images) {
    if (!/^https?:\/\/\S+$/i.test(image) && (remoteOnly || (!image.startsWith("/") && !image.startsWith("data:image/")))) {
      errors.push(remoteOnly ? `Image must be a public http(s) URL: ${image}` : `Invalid image URL: ${image}`);
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

function categoryDepth(
  category: { id: string; slug: string; parent_id: string | null },
  byId: Map<string, { id: string; slug: string; parent_id: string | null }>,
  bySlug: Map<string, { id: string; slug: string; parent_id: string | null }>
) {
  let depth = 0;
  let parent = category.parent_id ? byId.get(category.parent_id) ?? bySlug.get(key(category.parent_id)) : null;
  const seen = new Set([category.id]);

  while (parent && !seen.has(parent.id)) {
    depth += 1;
    seen.add(parent.id);
    parent = parent.parent_id ? byId.get(parent.parent_id) ?? bySlug.get(key(parent.parent_id)) : null;
  }

  return depth;
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

async function makeLookup(kind: ImportKind, workbookRows: WorkbookRow[]): Promise<Lookup> {
  if (kind === "categories") await ensureBuiltInParentCategories();
  const productSlugs = kind === "products" ? workbookRows.map((row) => key(row.values.slug ?? "")).filter(Boolean) : [];
  const [categories, brands, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true, parent_id: true } }),
    kind === "products" ? prisma.brand.findMany({ select: { id: true, name: true, slug: true } }) : Promise.resolve([]),
    productSlugs.length
      ? prisma.product.findMany({ where: { slug: { in: productSlugs } }, select: { slug: true } })
      : Promise.resolve([])
  ]);
  const bySlug = new Map(categories.map((category) => [key(category.slug), category]));
  const byId = new Map(categories.map((category) => [category.id, category]));
  return {
    categories,
    brands,
    existingProductSlugs: new Set(products.map((product) => key(product.slug))),
    existingCategorySlugs: new Set(categories.map((category) => key(category.slug))),
    categoryDepths: new Map(categories.map((category) => [key(category.slug), categoryDepth(category, byId, bySlug)]))
  };
}

function validateProductRows(workbookRows: WorkbookRow[], lookup: Lookup): PreviewRow[] {
  const seenSlugs = new Set<string>();
  const seenSkus = new Set<string>();

  return workbookRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const slug = values.slug.trim();
    const sku = values.sku.trim();
    required(values.name, "name", errors);
    required(slug, "slug", errors);
    required(values.description, "description", errors);

    if (slug && !isSlug(slug)) errors.push("slug must be lowercase letters, numbers, and single hyphens.");
    if (seenSlugs.has(key(slug))) errors.push("slug is duplicated in this workbook.");
    if (slug) seenSlugs.add(key(slug));
    if (sku && seenSkus.has(key(sku))) errors.push("sku is duplicated in this workbook.");
    if (sku) seenSkus.add(key(sku));

    const category = values.category.trim() ? findBySlugOrName(lookup.categories, values.category) : null;
    const brand = values.brand.trim() ? findBySlugOrName(lookup.brands, values.brand) : null;
    const categorySlug = category?.slug ?? (values.category.trim() && isSlug(values.category) ? values.category.trim() : "");
    const brandSlug = brand?.slug ?? (values.brand.trim() ? slugify(values.brand) : "");
    if (values.category.trim() && !categorySlug) errors.push(`category must match an existing category by slug/name or be a valid new category slug: ${values.category}`);
    if (values.brand.trim() && !brandSlug) errors.push(`brand must match an existing brand by slug/name or be convertible to a slug: ${values.brand}`);

    const priceKes = parseInteger(values.price_kes, "price_kes", errors);
    const costPriceKes = parseOptionalInteger(values.cost_price_kes, "cost_price_kes", errors);
    const supplierLeadTimeDays = parseOptionalInteger(values.supplier_lead_time_days, "supplier_lead_time_days", errors);
    const reorderLevel = parseInteger(values.reorder_level, "reorder_level", errors, 0);
    const reorderQuantity = parseInteger(values.reorder_quantity, "reorder_quantity", errors, 0);
    const stockQuantity = parseInteger(values.stock_quantity, "stock_quantity", errors, 0);
    const condition = (values.condition.trim() || "new") as ProductCondition;
    const stockStatus = (values.stock_status.trim() || "in_stock") as StockStatus;
    if (!PRODUCT_CONDITIONS.includes(condition)) errors.push(`condition must be one of: ${PRODUCT_CONDITIONS.join(", ")}`);
    if (!STOCK_STATUSES.includes(stockStatus)) errors.push(`stock_status must be one of: ${STOCK_STATUSES.join(", ")}`);

    const images = parseImages(values.images, errors, true);
    const isFeatured = parseBoolean(values.is_featured, "is_featured", errors);
    const isPublished = values.is_published.trim() ? parseBoolean(values.is_published, "is_published", errors) : true;

    return {
      rowNumber,
      operation: lookup.existingProductSlugs.has(key(slug)) ? "update" : "create",
      data: {
        name: values.name.trim(),
        slug,
        description: values.description.trim(),
        category_id: category?.id ?? null,
        category: category?.name ?? (categorySlug ? titleFromSlug(categorySlug) : null),
        category_slug: categorySlug || null,
        brand_id: brand?.id ?? null,
        brand: brand?.name ?? (brandSlug ? titleFromSlug(values.brand) : null),
        brand_slug: brandSlug || null,
        mpn: values.mpn.trim() || null,
        sku: sku || null,
        price_kes: priceKes,
        cost_price_kes: costPriceKes,
        supplier_name: values.supplier_name.trim() || null,
        supplier_lead_time_days: supplierLeadTimeDays,
        reorder_level: reorderLevel,
        reorder_quantity: reorderQuantity,
        condition,
        stock_status: stockStatus,
        stock_quantity: stockQuantity,
        images,
        specs: parseSpecs(values.specs),
        is_featured: isFeatured,
        is_published: isPublished
      },
      errors
    };
  });
}

function validateCategoryRows(workbookRows: WorkbookRow[], lookup: Lookup): PreviewRow[] {
  const seenSlugs = new Set<string>();
  const workbookDepths = new Map<string, number>();

  return workbookRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const slug = values.slug.trim();
    const parentSlug = values.parent_slug.trim();
    required(values.name, "name", errors);
    required(slug, "slug", errors);
    if (slug && !isSlug(slug)) errors.push("slug must be lowercase letters, numbers, and single hyphens.");
    if (seenSlugs.has(key(slug))) errors.push("slug is duplicated in this workbook.");
    if (slug) seenSlugs.add(key(slug));
    if (parentSlug && !isSlug(parentSlug)) errors.push("parent_slug must be blank or a valid lowercase slug.");
    if (parentSlug && key(parentSlug) === key(slug)) errors.push("parent_slug cannot match slug.");
    const parent = parentSlug ? findBySlugOrName(lookup.categories, parentSlug) : null;
    const parentDepth = parentSlug ? workbookDepths.get(key(parentSlug)) ?? lookup.categoryDepths.get(key(parentSlug)) : null;
    if (parentSlug && !parent && parentDepth == null) errors.push("parent_slug must match an existing category or an earlier row in this workbook.");
    if (parentDepth != null && parentDepth >= 2) errors.push("parent_slug cannot point to a sub-subcategory; category imports support root, subcategory, and sub-subcategory levels only.");
    const sortOrder = parseInteger(values.sort_order, "sort_order", errors, 0);
    const builtIn = builtInParentCategoryBySlug(slug);
    if (slug && !errors.length) workbookDepths.set(key(slug), parentDepth == null ? 0 : parentDepth + 1);

    return {
      rowNumber,
      operation: lookup.existingCategorySlugs.has(key(slug)) ? "update" : "create",
      data: {
        name: values.name.trim(),
        slug,
        parent_id: parent?.id ?? null,
        parent_slug: parentSlug || null,
        description: values.description.trim() || builtIn?.description || null,
        icon: values.icon.trim() || builtIn?.icon || null,
        is_builtin_parent: BUILT_IN_PARENT_CATEGORY_SLUGS.some((parentSlug) => parentSlug === slug),
        sort_order: sortOrder
      },
      errors
    };
  });
}

export async function previewImport(kind: ImportKind, buffer: Buffer): Promise<PreviewResult> {
  const workbookRows = parseWorkbook(buffer, kind === "products" ? PRODUCT_IMPORT_COLUMNS : CATEGORY_IMPORT_COLUMNS);
  const lookup = await makeLookup(kind, workbookRows);
  const rows = kind === "products" ? validateProductRows(workbookRows, lookup) : validateCategoryRows(workbookRows, lookup);
  return { kind, rows, errorCount: rows.reduce((sum, row) => sum + row.errors.length, 0), rowLimit: MAX_ROWS };
}

export async function commitImport(
  kind: ImportKind,
  buffer: Buffer,
  options: { userId?: string | null; onProgress?: (progress: ImportProgress) => void | Promise<void>; batchSize?: number } = {}
) {
  options.onProgress?.({ stage: "Validating", processed: 0, total: 0 });
  const preview = await previewImport(kind, buffer);
  const validRows = preview.rows.filter((row) => row.errors.length === 0);
  const validationErrors = preview.rows
    .filter((row) => row.errors.length > 0)
    .map((row) => ({ rowNumber: row.rowNumber, errors: row.errors }));

  const result =
    kind === "products"
      ? await commitProductRows(validRows, preview, options)
      : await commitCategoryRows(validRows, preview, options);

  const importedCount = result.importedCount;
  const updatedCount = validRows.filter((row) => row.operation === "update").length - result.importErrors.length;
  const importErrors = [...validationErrors, ...result.importErrors];
  const failedCount = importErrors.length;
  const skippedCount = preview.rows.length - importedCount;
  const affectedSlugs = validRows.filter((row) => !result.importErrors.some((error) => error.rowNumber === row.rowNumber)).map((row) => String(row.data.slug));
  options.onProgress?.({ stage: "Complete", processed: importedCount, total: validRows.length });

  return { ...preview, importedCount, updatedCount: Math.max(0, updatedCount), skippedCount, failedCount, affectedSlugs, importErrors } satisfies CommitImportResult;
}

async function commitProductRows(
  rows: PreviewRow[],
  preview: PreviewResult,
  options: { userId?: string | null; onProgress?: (progress: ImportProgress) => void | Promise<void>; batchSize?: number }
) {
  let importedCount = 0;
  const importErrors: Array<{ rowNumber: number; errors: string[] }> = [];
  const batchSize = options.batchSize ?? 50;

  await prepareProductLookups(rows);
  const [categories, brands] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.brand.findMany({ select: { id: true, slug: true } })
  ]);
  const categoryIds = new Map(categories.map((category) => [key(category.slug), category.id]));
  const brandIds = new Map(brands.map((brand) => [key(brand.slug), brand.id]));
  const currentImages = await currentProductImages(rows);

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    try {
      await upsertProductBatch(batch, preview, categoryIds, brandIds, currentImages, options.userId);
      importedCount += batch.length;
    } catch (error) {
      for (const row of batch) {
        try {
          await upsertProductBatch([row], preview, categoryIds, brandIds, currentImages, options.userId);
          importedCount += 1;
        } catch (rowError) {
          importErrors.push({ rowNumber: row.rowNumber, errors: [rowError instanceof Error ? rowError.message : error instanceof Error ? error.message : "Import failed."] });
        }
      }
    }
    await options.onProgress?.({ stage: "Importing products", processed: importedCount, total: rows.length });
  }

  const imageResult = await downloadAndSaveProductImages(rows, currentImages, options);
  importErrors.push(...imageResult.importErrors);

  return { importedCount, importErrors };
}

async function prepareProductLookups(rows: PreviewRow[]) {
  const categories = uniqueBySlug(rows
    .map((row) => row.data)
    .filter((data) => !data.category_id && data.category_slug && data.category)
    .map((data) => ({
      name: String(data.category),
      slug: String(data.category_slug),
      description: `${String(data.category)} products.`,
      icon: null as string | null
    })));
  const brands = uniqueBySlug(rows
    .map((row) => row.data)
    .filter((data) => !data.brand_id && data.brand_slug && data.brand)
    .map((data) => ({
      name: String(data.brand),
      slug: String(data.brand_slug),
      icon: null as string | null
    })));

  await Promise.all([
    categories.length ? prisma.category.createMany({ data: categories, skipDuplicates: true }) : Promise.resolve(),
    brands.length ? prisma.brand.createMany({ data: brands, skipDuplicates: true }) : Promise.resolve()
  ]);
}

async function upsertProductBatch(
  rows: PreviewRow[],
  preview: PreviewResult,
  categoryIds: Map<string, string>,
  brandIds: Map<string, string>,
  currentImages: Map<string, string[]>,
  userId?: string | null
) {
  if (!rows.length) return;
  const values = rows.map((row) => {
    const data = row.data;
    const categoryId = data.category_id ? String(data.category_id) : data.category_slug ? categoryIds.get(key(String(data.category_slug))) ?? null : null;
    const brandId = data.brand_id ? String(data.brand_id) : data.brand_slug ? brandIds.get(key(String(data.brand_slug))) ?? null : null;
    const existingImages = currentImages.get(key(String(data.slug))) ?? [];
    const product = productData(data, initialImagesForProduct(data.images as string[], existingImages), categoryId, brandId);
    return Prisma.sql`(
      ${product.name},
      ${product.slug},
      ${product.description},
      ${product.mpn},
      ${product.sku},
      ${product.category_id},
      ${product.brand_id},
      ${product.price_kes},
      ${product.cost_price_kes},
      ${product.supplier_name},
      ${product.supplier_lead_time_days},
      ${product.reorder_level},
      ${product.reorder_quantity},
      ${product.is_published},
      ${product.condition}::public.product_condition,
      ${product.stock_status}::public.stock_status,
      ${product.stock_quantity},
      ${JSON.stringify(product.images)}::jsonb,
      ${JSON.stringify(product.specs)}::jsonb,
      ${product.is_featured},
      now()
    )`;
  });

  const query = Prisma.sql`
    insert into public.products (
      name, slug, description, mpn, sku, category_id, brand_id, price_kes, cost_price_kes,
      supplier_name, supplier_lead_time_days, reorder_level, reorder_quantity, is_published,
      condition, stock_status, stock_quantity, images, specs, is_featured, updated_at
    )
    values ${Prisma.join(values)}
    on conflict (slug) do update set
      name = excluded.name,
      description = excluded.description,
      mpn = excluded.mpn,
      sku = excluded.sku,
      category_id = excluded.category_id,
      brand_id = excluded.brand_id,
      price_kes = excluded.price_kes,
      cost_price_kes = excluded.cost_price_kes,
      supplier_name = excluded.supplier_name,
      supplier_lead_time_days = excluded.supplier_lead_time_days,
      reorder_level = excluded.reorder_level,
      reorder_quantity = excluded.reorder_quantity,
      is_published = excluded.is_published,
      condition = excluded.condition,
      stock_status = excluded.stock_status,
      stock_quantity = excluded.stock_quantity,
      images = excluded.images,
      specs = excluded.specs,
      is_featured = excluded.is_featured,
      updated_at = now()
  `;

  await prisma.$executeRaw(query);
  await createImportAuditLogs("Product", rows, preview, userId);
}

async function currentProductImages(rows: PreviewRow[]) {
  const slugs = rows.map((row) => key(String(row.data.slug))).filter(Boolean);
  if (!slugs.length) return new Map<string, string[]>();
  const products = await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { slug: true, images: true } });
  return new Map(products.map((product) => [key(product.slug), asImages(product.images)]));
}

function initialImagesForProduct(importImages: string[], currentImages: string[]) {
  if (currentImages.length) return currentImages;
  return importImages;
}

async function downloadAndSaveProductImages(
  rows: PreviewRow[],
  currentImages: Map<string, string[]>,
  options: { onProgress?: (progress: ImportProgress) => void | Promise<void> }
) {
  const importErrors: Array<{ rowNumber: number; errors: string[] }> = [];
  const rowsWithImages = rows.filter((row) => (row.data.images as string[]).length > 0);
  let processed = 0;

  for (const row of rowsWithImages) {
    const data = row.data;
    const sourceImages = data.images as string[];
    const storedImages: string[] = [];
    const errors: string[] = [];
    const existing = currentImages.get(key(String(data.slug))) ?? [];

    for (let index = 0; index < sourceImages.length; index += 1) {
      const sourceUrl = sourceImages[index];
      try {
        const stored = await storeProductImage({
          slug: String(data.slug),
          sku: data.sku ? String(data.sku) : null,
          sourceUrl,
          index,
          currentImages: existing
        });
        storedImages.push(stored.storedUrl);
      } catch (error) {
        errors.push(`image ${index + 1} (${sourceUrl}): ${error instanceof Error ? error.message : "Download failed."}`);
      }
    }

    processed += 1;
    await options.onProgress?.({ stage: "Downloading images", processed, total: rowsWithImages.length });

    if (storedImages.length) {
      await prisma.product.update({
        where: { slug: String(data.slug) },
        data: { images: storedImages as Prisma.InputJsonValue }
      });
      currentImages.set(key(String(data.slug)), storedImages);
    }
    if (errors.length) importErrors.push({ rowNumber: row.rowNumber, errors });
  }

  await options.onProgress?.({ stage: "Saving", processed: rowsWithImages.length, total: rowsWithImages.length });
  return { importErrors };
}

function asImages(value: Prisma.JsonValue | null | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function commitCategoryRows(
  rows: PreviewRow[],
  preview: PreviewResult,
  options: { userId?: string | null; onProgress?: (progress: ImportProgress) => void | Promise<void>; batchSize?: number }
) {
  let importedCount = 0;
  const importErrors: Array<{ rowNumber: number; errors: string[] }> = [];
  const batchSize = options.batchSize ?? 50;

  for (const depthRows of categoryRowsByDepth(rows)) {
    for (let index = 0; index < depthRows.length; index += batchSize) {
      const batch = depthRows.slice(index, index + batchSize);
      const parentIds = await categoryParentMap(batch);
      try {
        await upsertCategoryBatch(batch, preview, parentIds, options.userId);
        importedCount += batch.length;
      } catch (error) {
        for (const row of batch) {
          try {
            const singleParentIds = await categoryParentMap([row]);
            await upsertCategoryBatch([row], preview, singleParentIds, options.userId);
            importedCount += 1;
          } catch (rowError) {
            importErrors.push({ rowNumber: row.rowNumber, errors: [rowError instanceof Error ? rowError.message : error instanceof Error ? error.message : "Import failed."] });
          }
        }
      }
      await options.onProgress?.({ stage: "Importing", processed: importedCount, total: rows.length });
    }
  }

  return { importedCount, importErrors };
}

function categoryRowsByDepth(rows: PreviewRow[]) {
  const bySlug = new Map(rows.map((row) => [key(String(row.data.slug)), row]));
  const depth = (row: PreviewRow, seen = new Set<string>()): number => {
    const slug = key(String(row.data.slug));
    const parentSlug = row.data.parent_slug ? key(String(row.data.parent_slug)) : "";
    if (!parentSlug || seen.has(slug)) return 0;
    const parent = bySlug.get(parentSlug);
    return parent ? 1 + depth(parent, new Set([...seen, slug])) : 1;
  };
  const groups = new Map<number, PreviewRow[]>();
  for (const row of rows) {
    const rowDepth = depth(row);
    groups.set(rowDepth, [...(groups.get(rowDepth) ?? []), row]);
  }
  return [...groups.entries()].sort(([left], [right]) => left - right).map(([, group]) => group);
}

async function categoryParentMap(rows: PreviewRow[]) {
  const slugs = rows.map((row) => row.data.parent_slug ? key(String(row.data.parent_slug)) : "").filter(Boolean);
  if (!slugs.length) return new Map<string, string>();
  const parents = await prisma.category.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  return new Map(parents.map((parent) => [key(parent.slug), parent.id]));
}

async function upsertCategoryBatch(rows: PreviewRow[], preview: PreviewResult, parentIds: Map<string, string>, userId?: string | null) {
  if (!rows.length) return;
  const values = rows.map((row) => {
    const data = row.data;
    const parentId = data.parent_slug ? parentIds.get(key(String(data.parent_slug))) ?? null : null;
    const category = categoryData(data, null, parentId);
    return Prisma.sql`(
      ${category.name},
      ${category.slug},
      ${category.description},
      ${category.icon},
      ${category.parent_id},
      ${category.sort_order}
    )`;
  });

  const query = Prisma.sql`
    insert into public.categories (name, slug, description, icon, parent_id, sort_order)
    values ${Prisma.join(values)}
    on conflict (slug) do update set
      name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      parent_id = excluded.parent_id,
      sort_order = excluded.sort_order
  `;

  await prisma.$executeRaw(query);
  await createImportAuditLogs("Category", rows, preview, userId);
}

async function createImportAuditLogs(entity: "Product" | "Category", rows: PreviewRow[], preview: PreviewResult, userId?: string | null) {
  if (!userId || !rows.length) return;
  const slugs = rows.map((row) => String(row.data.slug));
  const records = entity === "Product"
    ? await prisma.product.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } })
    : await prisma.category.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const ids = new Map(records.map((record) => [key(record.slug), record.id]));
  await prisma.auditLog.createMany({
    data: rows.flatMap((row) => {
      const id = ids.get(key(String(row.data.slug)));
      if (!id) return [];
      return [{
        user_id: userId,
        entity,
        entity_id: id,
        action: `excel_import.${row.operation}`,
        before: {},
        after: { kind: preview.kind, rowNumber: row.rowNumber, slug: row.data.slug }
      }];
    })
  });
}

function uniqueBySlug<T extends { slug: string }>(items: T[]) {
  return [...new Map(items.map((item) => [key(item.slug), item])).values()];
}

function productData(data: PreviewRow["data"], images: string[], categoryId: string | null, brandId: string | null): Prisma.ProductUncheckedCreateInput {
  return {
    name: String(data.name),
    slug: String(data.slug),
    description: String(data.description),
    category_id: categoryId,
    brand_id: brandId,
    price_kes: Number(data.price_kes),
    mpn: data.mpn ? String(data.mpn) : null,
    sku: data.sku ? String(data.sku) : null,
    condition: data.condition as ProductCondition,
    stock_status: data.stock_status as StockStatus,
    stock_quantity: Number(data.stock_quantity),
    cost_price_kes: data.cost_price_kes == null ? null : Number(data.cost_price_kes),
    supplier_name: data.supplier_name ? String(data.supplier_name) : null,
    supplier_lead_time_days: data.supplier_lead_time_days == null ? null : Number(data.supplier_lead_time_days),
    reorder_level: Number(data.reorder_level),
    reorder_quantity: Number(data.reorder_quantity),
    images,
    specs: data.specs as Prisma.InputJsonValue,
    is_featured: Boolean(data.is_featured),
    is_published: Boolean(data.is_published)
  };
}

function categoryData(data: PreviewRow["data"], image: string | null, parentId: string | null): Prisma.CategoryUncheckedCreateInput {
  return {
    name: String(data.name),
    slug: String(data.slug),
    description: data.description ? String(data.description) : null,
    icon: data.icon ? String(data.icon) : null,
    image,
    parent_id: parentId,
    sort_order: Number(data.sort_order)
  };
}

export function productTemplateWorkbook() {
  return writeWorkbook([
    {
      name: "Products",
      rows: [
        [...PRODUCT_IMPORT_COLUMNS]
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
        ["mpn", "Optional", "Manufacturer part number or model. Keep this separate from slug and SKU."],
        ["sku", "Optional", "Internal stock keeping unit. Must be unique if your database has SKU uniqueness enabled."],
        ["price_kes", "Required", "Whole number in KSh, greater than or equal to 0."],
        ["cost_price_kes", "Optional", "Whole number internal cost in KSh, or blank."],
        ["supplier_name", "Optional", "Supplier name as plain text."],
        ["supplier_lead_time_days", "Optional", "Whole number lead time in days, or blank."],
        ["reorder_level", "Optional", "Whole number minimum stock threshold. Default: 0."],
        ["reorder_quantity", "Optional", "Whole number restock quantity. Default: 0."],
        ["condition", "Optional", `Allowed values: ${PRODUCT_CONDITIONS.join(", ")}. Default: new.`],
        ["stock_status", "Optional", `Allowed values: ${STOCK_STATUSES.join(", ")}. Default: in_stock.`],
        ["stock_quantity", "Optional", "Whole number, greater than or equal to 0. Default: 0."],
        ["images", "Optional", "Use 1-3 public http(s) image URLs separated by semicolons. Confirmed imports download and store images in Supabase Storage. Blank stores no product images."],
        ["specs", "Optional", "Use semicolon-separated Key: Value pairs."],
        ["is_featured", "Optional", "Allowed values: true/false, yes/no, 1/0. Default: false."],
        ["is_published", "Optional", "Allowed values: true/false, yes/no, 1/0. Default: true."]
      ]
    }
  ]);
}

export function categoryTemplateWorkbook() {
  return writeWorkbook([
    {
      name: "Categories",
      rows: [
        [...CATEGORY_IMPORT_COLUMNS]
      ]
    },
    {
      name: "Instructions",
      rows: [
        ["Column", "Required", "Instructions"],
        ["name", "Required", "Category name."],
        ["slug", "Required", "Unique lowercase slug. Existing categories with the same slug are updated."],
        ["parent_slug", "Optional", "Blank for a root category. To create a subcategory or sub-subcategory, use an existing category slug or a parent row that appears earlier in this workbook. Maximum depth is root > subcategory > sub-subcategory."],
        ["description", "Optional", "Plain category description."],
        ["icon", "Optional", "Parent category icon identifier. Built-in parent identifiers are Printer, Tags, Settings, Barcode, and Wrench. Child categories can leave this blank."],
        ["sort_order", "Optional", "Whole number used to order siblings under the same parent. Default: 0."]
      ]
    },
    {
      name: "Built-in Parents",
      rows: [
        ["parent_slug", "name", "icon", "usage"],
        ...BUILT_IN_PARENT_CATEGORIES.map((category) => [category.slug, category.name, category.icon, "Use this parent_slug for child categories. These parent categories are created by the application if missing."])
      ]
    }
  ]);
}
