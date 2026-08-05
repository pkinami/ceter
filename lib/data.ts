import { createClient } from "@/lib/supabase/server";
import { getFixedBannerAsset } from "@/lib/banner-assets";
import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/product-mappers";
import type { Banner, Brand, Category, HomepageSection, Product, ProductRow, ServiceEntry } from "@/lib/types";

const productSelect = "*, categories(id,name,slug), brands(id,name,slug)";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id,name,slug,description,icon").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("id,name,slug,icon").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(options?: { featured?: boolean; category?: string | null; brand?: string | null; limit?: number }): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(productSelect).order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  if (options?.featured) query = query.eq("is_featured", true);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  let products = ((data ?? []) as ProductRow[]).map(mapProduct);
  if (options?.category) {
    const category = options.category.toLowerCase();
    products = products.filter((product) => product.category.toLowerCase() === category || product.categorySlug === options.category || product.categoryId === options.category);
  }
  if (options?.brand) {
    const brand = options.brand.toLowerCase();
    products = products.filter((product) => product.brand.toLowerCase() === brand || product.brandId === options.brand);
  }
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data as ProductRow) : null;
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const products = await getProducts({ category: product.categoryId, limit: 8 });
  return products.filter((item) => item.id !== product.id).slice(0, 4);
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id,name,slug,description,icon").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

type HomepageBannerGroups = {
  main: Banner[];
  category: Record<string, Banner[]>;
  services: Banner[];
};

export async function getHomepageBanners(): Promise<HomepageBannerGroups> {
  if (isProductionBuild()) return { main: [], category: {}, services: [] };
  if (!(await hasPublicTable("banners"))) return { main: [], category: {}, services: [] };
  const banners = await prisma.banner.findMany({
    where: { is_enabled: true },
    include: { category: { select: { slug: true } } },
    orderBy: [{ placement: "asc" }, { sort_order: "asc" }]
  }).catch(() => []);

  const category: Record<string, Banner[]> = {};
  banners
    .filter((banner) => isCategoryBannerPlacement(banner.placement) && banner.category_id)
    .map((banner) => mapBanner(banner))
    .forEach((banner) => {
      if (!banner.categoryId) return;
      category[banner.categoryId] = [...(category[banner.categoryId] ?? []), banner];
    });

  return {
    main: banners.filter((banner) => isMainBannerPlacement(banner.placement)).map((banner, index) => mapBanner(banner, index)),
    category,
    services: banners.filter((banner) => isServicesBannerPlacement(banner.placement)).map((banner, index) => mapBanner(banner, index))
  };
}

export async function getCategoryBanners(categoryId: string): Promise<Banner[]> {
  if (isProductionBuild()) return [];
  if (!(await hasPublicTable("banners"))) return [];
  const banners = await prisma.banner.findMany({
    where: {
      is_enabled: true,
      category_id: categoryId,
      placement: { in: ["category", "middle"] }
    },
    include: { category: { select: { slug: true } } },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }]
  }).catch(() => []);

  return banners.map(mapBanner);
}

export async function getServices(limit?: number): Promise<ServiceEntry[]> {
  if (isProductionBuild()) return [];
  if (!(await hasPublicTable("service_entries"))) return [];
  const services = await prisma.serviceEntry.findMany({
    where: { is_enabled: true },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }],
    take: limit
  }).catch(() => []);

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
  const sections = await prisma.homepageSection.findMany({
    where: { is_enabled: true },
    include: { category: true },
    orderBy: [{ sort_order: "asc" }, { title: "asc" }]
  }).catch(() => []);

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
          icon: section.category.icon
        }
      : null
  }));
}

function mapBanner(banner: Awaited<ReturnType<typeof prisma.banner.findMany>>[number] & { category?: { slug: string } | null }, index = 0): Banner {
  const fixedAsset = getFixedBannerAsset({
    placement: banner.placement,
    index,
    categorySlug: banner.category?.slug
  });

  return {
    id: banner.id,
    title: banner.title,
    kicker: banner.kicker,
    body: banner.body,
    ctaLabel: banner.cta_label,
    ctaHref: banner.cta_href,
    image: fixedAsset?.image ?? banner.image,
    mobileImage: fixedAsset?.mobileImage ?? banner.mobile_image,
    placement: banner.placement,
    categoryId: banner.category_id,
    sortOrder: banner.sort_order
  };
}

function isMainBannerPlacement(placement: string) {
  return placement === "main" || placement === "top";
}

function isCategoryBannerPlacement(placement: string) {
  return placement === "category" || placement === "middle";
}

function isServicesBannerPlacement(placement: string) {
  return placement === "services" || placement === "bottom";
}

async function hasPublicTable(tableName: string) {
  const [result] = await prisma.$queryRaw<Array<{ exists: boolean }>>`select to_regclass(${`public.${tableName}`}) is not null as exists`.catch(() => [{ exists: false }]);
  return Boolean(result?.exists);
}

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}
