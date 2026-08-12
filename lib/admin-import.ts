import { Prisma, type ProductCondition, type StockStatus } from "@prisma/client";
import { products as demoProducts } from "@/data/mockProducts";
import { flattenCategoryTree } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { readFirstWorksheet, rowsToObjects, writeWorkbook } from "@/lib/xlsx";

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

export const CATEGORY_IMPORT_COLUMNS = ["name", "slug", "parent_slug", "description", "icon", "image", "sort_order"] as const;

const PRODUCT_CONDITIONS: ProductCondition[] = ["new", "refurbished"];
const STOCK_STATUSES: StockStatus[] = ["in_stock", "backorder", "out_of_stock"];
const MAX_ROWS = 500;
const MAX_IMAGE_URLS = 3;
const PLACEHOLDER_IMAGE = "/product-placeholder.svg";

export type ImportKind = "products" | "categories";

type Lookup = {
  categories: Array<{ id: string; name: string; slug: string; parent_id: string | null }>;
  brands: Array<{ id: string; name: string; slug: string }>;
  existingProductSlugs: Set<string>;
  existingCategorySlugs: Set<string>;
  categoryDepths: Map<string, number>;
};

type WorkbookRow = ReturnType<typeof parseWorkbook>[number];

export type ImportProgressStage = "Validating" | "Preparing" | "Importing" | "Complete";

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

  return workbookRows.map(({ rowNumber, values }) => {
    const errors: string[] = [];
    const slug = values.slug.trim();
    required(values.name, "name", errors);
    required(slug, "slug", errors);
    required(values.description, "description", errors);

    if (slug && !isSlug(slug)) errors.push("slug must be lowercase letters, numbers, and single hyphens.");
    if (seenSlugs.has(key(slug))) errors.push("slug is duplicated in this workbook.");
    if (slug) seenSlugs.add(key(slug));

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
        sku: values.sku.trim() || null,
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
    const images = parseImages(values.image, errors, false);
    if (slug && !errors.length) workbookDepths.set(key(slug), parentDepth == null ? 0 : parentDepth + 1);

    return {
      rowNumber,
      operation: lookup.existingCategorySlugs.has(key(slug)) ? "update" : "create",
      data: {
        name: values.name.trim(),
        slug,
        parent_id: parent?.id ?? null,
        parent_slug: parentSlug || null,
        description: values.description.trim() || null,
        icon: values.icon.trim() || null,
        image: images[0] ?? null,
        images,
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

export async function toStoredImage(value: string) {
  if (!/^https?:\/\//i.test(value)) return value;

  const response = await fetch(value);
  if (!response.ok) throw new Error(`Could not download image ${value}: HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`Image URL did not return an image: ${value}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 2 * 1024 * 1024) throw new Error(`Image is larger than 2 MB: ${value}`);
  return `data:${contentType};base64,${bytes.toString("base64")}`;
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

  options.onProgress?.({ stage: "Preparing", processed: 0, total: validRows.length });

  const result =
    kind === "products"
      ? await commitProductRows(validRows, preview, options)
      : await commitCategoryRows(validRows, preview, options);

  const importedCount = result.importedCount;
  const importErrors = [...validationErrors, ...result.importErrors];
  const skippedCount = preview.rows.length - importedCount;
  options.onProgress?.({ stage: "Complete", processed: importedCount, total: validRows.length });

  return { ...preview, importedCount, skippedCount, importErrors };
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

  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    try {
      await upsertProductBatch(batch, preview, categoryIds, brandIds, options.userId);
      importedCount += batch.length;
    } catch (error) {
      for (const row of batch) {
        try {
          await upsertProductBatch([row], preview, categoryIds, brandIds, options.userId);
          importedCount += 1;
        } catch (rowError) {
          importErrors.push({ rowNumber: row.rowNumber, errors: [rowError instanceof Error ? rowError.message : error instanceof Error ? error.message : "Import failed."] });
        }
      }
    }
    await options.onProgress?.({ stage: "Importing", processed: importedCount, total: rows.length });
  }

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
      icon: "/product-placeholder.svg"
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
  userId?: string | null
) {
  if (!rows.length) return;
  const values = rows.map((row) => {
    const data = row.data;
    const categoryId = data.category_id ? String(data.category_id) : data.category_slug ? categoryIds.get(key(String(data.category_slug))) ?? null : null;
    const brandId = data.brand_id ? String(data.brand_id) : data.brand_slug ? brandIds.get(key(String(data.brand_slug))) ?? null : null;
    const product = productData(data, data.images as string[], categoryId, brandId);
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
    const category = categoryData(data, data.image ? String(data.image) : null, parentId);
    return Prisma.sql`(
      ${category.name},
      ${category.slug},
      ${category.description},
      ${category.icon},
      ${category.image},
      ${category.parent_id},
      ${category.sort_order}
    )`;
  });

  const query = Prisma.sql`
    insert into public.categories (name, slug, description, icon, image, parent_id, sort_order)
    values ${Prisma.join(values)}
    on conflict (slug) do update set
      name = excluded.name,
      description = excluded.description,
      icon = excluded.icon,
      image = excluded.image,
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
  const rows = demoProducts.map((product) => [
    product.name,
    product.slug,
    product.description,
    slugify(product.category),
    slugify(product.brand),
    product.specs.Model ?? "",
    `DEMO-${product.id.toUpperCase()}`,
    String(product.price),
    "",
    "",
    "",
    "0",
    "0",
    product.condition.toLowerCase(),
    product.stockStatus === "in-stock" ? "in_stock" : "backorder",
    product.inStock ? "5" : "0",
    product.image,
    Object.entries(product.specs).map(([key, value]) => `${key}: ${value}`).join("; "),
    "true",
    "true"
  ]);

  return writeWorkbook([
    {
      name: "Products",
      rows: [
        [...PRODUCT_IMPORT_COLUMNS],
        ...rows
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
        ["images", "Optional", "Use 1-3 image URLs separated by semicolons, for example image1.jpg;image2.jpg;image3.jpg. Blank uses /product-placeholder.svg."],
        ["specs", "Optional", "Use semicolon-separated Key: Value pairs."],
        ["is_featured", "Optional", "Allowed values: true/false, yes/no, 1/0. Default: false."],
        ["is_published", "Optional", "Allowed values: true/false, yes/no, 1/0. Default: true."]
      ]
    }
  ]);
}

export function categoryTemplateWorkbook() {
  const rows = flattenCategoryTree().map((category) => [
    category.name,
    category.slug,
    category.parentId ?? "",
    category.description ?? `${category.name} products and services.`,
    category.icon ?? "",
    "",
    String(category.sortOrder)
  ]);

  return writeWorkbook([
    {
      name: "Categories",
      rows: [
        [...CATEGORY_IMPORT_COLUMNS],
        ...rows
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
        ["icon", "Optional", "Icon text or image URL matching the manual category form."],
        ["image", "Optional", "Use 1-3 image URLs separated by semicolons, for example image1.jpg;image2.jpg;image3.jpg. The first image is stored as the category image."],
        ["sort_order", "Optional", "Whole number used to order siblings under the same parent. Default: 0."]
      ]
    }
  ]);
}
