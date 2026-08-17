import { cache } from "react";
import { normalizeBannerImageVariants, normalizePublicAssetUrl } from "@/lib/banner-schema";
import { categoryAndDescendantKeys } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/product-mappers";
import { PUBLIC_PRODUCT_WHERE } from "@/lib/seo";
import type { Banner, Brand, Category, HomepageSection, Product, ProductRow, ServiceEntry } from "@/lib/types";

async function prismaRead<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientPrismaReadError(error) || attempt === 2) break;
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function isTransientPrismaReadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "P2039" || /EAUTHTIMEOUT|timeout while waiting|timeout exceeded|Connection terminated|Can't reach database|ECONNRESET|ETIMEDOUT/i.test(message);
}

export const getCategories = cache(async function getCategories(): Promise<Category[]> {
  const categories = await prismaRead(() => prisma.category.findMany({
    select: { id: true, name: true, slug: true, description: true, icon: true, parent_id: true, sort_order: true },
    orderBy: [{ sort_order: "asc" }, { name: "asc" }]
  }));

  return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      parentId: category.parent_id,
      sortOrder: category.sort_order ?? 0
  }));
});

export const getBrands = cache(async function getBrands(): Promise<Brand[]> {
  return prismaRead(() => prisma.brand.findMany({
    select: { id: true, name: true, slug: true, icon: true },
    orderBy: { name: "asc" }
  }));
});

export const getProducts = cache(async function getProducts(options?: { featured?: boolean; category?: string | null; brand?: string | null; q?: string | null; limit?: number }): Promise<Product[]> {
  const query = options?.q?.trim();
  const data = await prismaRead(() => prisma.product.findMany({
    where: {
      ...PUBLIC_PRODUCT_WHERE,
      is_featured: options?.featured ? true : undefined,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
              { sku: { contains: query, mode: "insensitive" } },
              { mpn: { contains: query, mode: "insensitive" } },
              { brand: { is: { name: { contains: query, mode: "insensitive" } } } },
              { category: { is: { name: { contains: query, mode: "insensitive" } } } },
              { category: { is: { slug: { contains: query, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      price_history: { select: { price_kes: true, effective_from: true, effective_to: true } }
    },
    orderBy: [{ is_featured: "desc" }, { created_at: "desc" }],
    take: options?.limit
  }));

  let products = data.map((product) => mapProduct({
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
    categories: product.category,
    brands: product.brand,
    price_history: product.price_history.map((price) => ({
      price_kes: price.price_kes,
      effective_from: price.effective_from.toISOString(),
      effective_to: price.effective_to?.toISOString() ?? null
    }))
  } satisfies ProductRow));
  if (options?.category) {
    const categories = await getCategories();
    products = filterProductsByCategory(products, categories, options.category);
  }
  if (options?.brand) {
    const brand = options.brand.toLowerCase();
    products = products.filter((product) => product.brand.toLowerCase() === brand || product.brandId === options.brand);
  }
  return products;
});

export const getProductBySlug = cache(async function getProductBySlug(slug: string): Promise<Product | null> {
  const product = await prismaRead(() => prisma.product.findFirst({
    where: { slug, ...PUBLIC_PRODUCT_WHERE },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      price_history: { select: { price_kes: true, effective_from: true, effective_to: true } }
    }
  }));
  if (!product) return null;
  return mapProduct({
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
    categories: product.category,
    brands: product.brand,
    price_history: product.price_history.map((price) => ({
      price_kes: price.price_kes,
      effective_from: price.effective_from.toISOString(),
      effective_to: price.effective_to?.toISOString() ?? null
    }))
  });
});

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const products = await getProducts({ category: product.categoryId, limit: 8 });
  return products.filter((item) => item.id !== product.id).slice(0, 4);
}

export const getCategoryBySlug = cache(async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const category = await prismaRead(() => prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, description: true, icon: true, parent_id: true, sort_order: true }
  }));

  return category
    ? {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        parentId: category.parent_id,
        sortOrder: category.sort_order ?? 0
      }
    : null;
});

type HomepageBannerGroups = {
  main: Banner[];
  category: Record<string, Banner[]>;
  services: Banner[];
};

export async function getHomepageBanners(): Promise<HomepageBannerGroups> {
  if (isProductionBuild()) return emptyHomepageBanners();
  const banners = await prismaRead(() => prisma.banner.findMany({
    where: { is_enabled: true },
    include: { category: true },
    orderBy: [{ placement: "asc" }, { sort_order: "asc" }, { title: "asc" }]
  }));
  if (!banners.length) return emptyHomepageBanners();
  const main = banners.filter((banner) => banner.placement === "main").slice(0, 5).map(mapDbBanner);
  const services = banners.filter((banner) => banner.placement === "services").map(mapDbBanner);

  return {
    main,
    category: banners.filter((banner) => banner.placement === "category").reduce<Record<string, Banner[]>>((groups, banner) => {
      const key = banner.category?.slug;
      if (!key) return groups;
      groups[key] = [...(groups[key] ?? []), mapDbBanner(banner)];
      return groups;
    }, {}),
    services
  };
}

export async function getCategoryBanners(categorySlug: string): Promise<Banner[]> {
  if (isProductionBuild()) return [];
  const banners = await prismaRead(() => prisma.banner.findMany({
    where: { is_enabled: true, placement: "category", category: { slug: categorySlug } },
    include: { category: true },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }]
  }));
  return banners.map(mapDbBanner);
}

type DbBanner = Awaited<ReturnType<typeof prisma.banner.findMany>>[number] & {
  category?: { slug: string } | null;
};

function mapDbBanner(banner: DbBanner): Banner {
  const images = resolveDbBannerImages(banner);

  return {
    id: banner.id,
    title: banner.title,
    kicker: banner.kicker,
    body: banner.body,
    alt: banner.title,
    ctaLabel: banner.cta_label,
    ctaHref: banner.cta_href,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    image: images.image,
    laptopImage: images.laptopImage,
    mobileImage: images.mobileImage,
    imageVariants: normalizeBannerImageVariants("image_variants" in banner ? banner.image_variants : []),
    focalPoint: bannerFocalPoint("image_variants" in banner ? banner.image_variants : []),
    placement: banner.placement,
    categoryId: banner.category_id,
    sortOrder: banner.sort_order
  };
}

function bannerFocalPoint(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  const master = value.find((item) => item && typeof item === "object" && (item as Record<string, unknown>).slot === "master");
  if (!master || typeof master !== "object") return undefined;
  const record = master as Record<string, unknown>;
  const x = Number(record.focalX);
  const y = Number(record.focalY);
  const mode: "left" | "center" | "right" | "custom" = record.focalMode === "left" || record.focalMode === "right" || record.focalMode === "custom" ? record.focalMode : "center";
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : mode === "left" ? 25 : mode === "right" ? 75 : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
    mode,
    crop: typeof record.crop === "string" ? record.crop : null
  };
}

function resolveDbBannerImages(banner: DbBanner) {
  return {
    image: bannerAssetUrlOrNull(banner.image),
    laptopImage: bannerAssetUrlOrNull("laptop_image" in banner && typeof banner.laptop_image === "string" ? banner.laptop_image : null),
    mobileImage: bannerAssetUrlOrNull(banner.mobile_image)
  };
}

function bannerAssetUrlOrNull(value: string | null | undefined) {
  const normalized = normalizePublicAssetUrl(value);
  if (!normalized) return null;
  if (normalized.startsWith("/banners/") || /^https?:\/\//i.test(normalized)) return normalized;
  return null;
}

export async function getServices(limit?: number): Promise<ServiceEntry[]> {
  if (isProductionBuild()) return [];
  if (!(await hasPublicTable("service_entries"))) return [];
  const services = await prismaRead(() => prisma.serviceEntry.findMany({
    where: { is_enabled: true },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    take: limit
  }));

  return services.map((service) => ({
    id: service.id,
    title: service.title,
    slug: service.slug,
    description: service.description,
    image: service.image,
    priceKes: service.price_kes,
    showRequestQuote: service.show_request_quote
  }));
}

export async function getHomepageSections(): Promise<HomepageSection[]> {
  if (isProductionBuild()) return [];
  if (!(await hasPublicTable("homepage_sections"))) return [];
  const sections = await prismaRead(() => prisma.homepageSection.findMany({
    where: { is_enabled: true },
    include: { category: true },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }]
  }));

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    sectionType: section.section_type,
    sortOrder: section.sort_order,
    productLimit: section.product_limit,
    category: section.category
      ? {
          id: section.category.id,
          name: section.category.name,
          slug: section.category.slug,
          description: section.category.description,
          icon: section.category.icon,
          parentId: categoryParentId(section.category as Record<string, unknown>),
          sortOrder: categorySortOrder(section.category as Record<string, unknown>)
        }
      : null
  }));
}

function categoryParentId(category: Record<string, unknown>) {
  return typeof category.parent_id === "string" ? category.parent_id : null;
}

function categorySortOrder(category: Record<string, unknown>) {
  return typeof category.sort_order === "number" ? category.sort_order : 0;
}

async function hasPublicTable(tableName: string) {
  const [result] = await prismaRead(() => prisma.$queryRaw<Array<{ exists: boolean }>>`select to_regclass(${`public.${tableName}`}) is not null as exists`);
  return Boolean(result?.exists);
}

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}

function emptyHomepageBanners(): HomepageBannerGroups {
  return { main: [], category: {}, services: [] };
}

export function filterProductsByCategory(products: Product[], categories: Category[], categoryValue: string | null | undefined) {
  if (!categoryValue) return products;
  const normalized = categoryValue.toLowerCase();
  const selected = categories.find((category) => category.slug === categoryValue || category.id === categoryValue || category.name.toLowerCase() === normalized);
  if (!selected) {
    return products.filter((product) => product.category.toLowerCase() === normalized || product.categorySlug === categoryValue || product.categoryId === categoryValue);
  }
  const keys = categoryAndDescendantKeys(selected, categories);
  return products.filter((product) => keys.has(product.category.toLowerCase()) || Boolean(product.categorySlug && keys.has(product.categorySlug)) || Boolean(product.categoryId && keys.has(product.categoryId)));
}
