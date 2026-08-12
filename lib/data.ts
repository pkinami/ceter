import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getStaticCategoryBanners, getStaticHomepageBanners } from "@/lib/banner-assets";
import { categoryAndDescendantKeys, flattenCategoryTree } from "@/lib/category-tree";
import { prisma } from "@/lib/prisma";
import { mapProduct } from "@/lib/product-mappers";
import type { Banner, Brand, Category, HomepageSection, Product, ProductRow, ServiceEntry } from "@/lib/types";

const productSelect = [
  "id",
  "slug",
  "name",
  "description",
  "category_id",
  "brand_id",
  "price_kes",
  "condition",
  "stock_status",
  "stock_quantity",
  "images",
  "specs",
  "is_featured",
  "categories(id,name,slug)",
  "brands(id,name,slug)",
  "price_history(price_kes,effective_from,effective_to)"
].join(",");

export const getCategories = cache(async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("categories").select("id,name,slug,description,icon,parent_id,sort_order").order("sort_order").order("name");
    if (error) throw error;
    return (data ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      parentId: category.parent_id,
      sortOrder: category.sort_order ?? 0
    }));
  } catch {
    return fallbackCategories;
  }
});

export const getBrands = cache(async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("brands").select("id,name,slug,icon").order("name");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
});

export const getProducts = cache(async function getProducts(options?: { featured?: boolean; category?: string | null; brand?: string | null; limit?: number }): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(productSelect).eq("is_published", true).order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  if (options?.featured) query = query.eq("is_featured", true);
  if (options?.limit) query = query.limit(options.limit);

  let data: unknown[] | null;
  try {
    const result = await query;
    if (result.error) throw result.error;
    data = result.data;
  } catch {
    return [];
  }

  let products = ((data ?? []) as unknown as ProductRow[]).map(mapProduct);
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
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("products").select(productSelect).eq("slug", slug).eq("is_published", true).maybeSingle();
    if (error) throw error;
    return data ? mapProduct(data as unknown as ProductRow) : null;
  } catch {
    return null;
  }
});

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const products = await getProducts({ category: product.categoryId, limit: 8 });
  return products.filter((item) => item.id !== product.id).slice(0, 4);
}

export const getCategoryBySlug = cache(async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from("categories").select("id,name,slug,description,icon,parent_id,sort_order").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data
      ? {
          id: data.id,
          name: data.name,
          slug: data.slug,
          description: data.description,
          icon: data.icon,
          parentId: data.parent_id,
          sortOrder: data.sort_order ?? 0
        }
      : null;
  } catch {
    return fallbackCategories.find((category) => category.slug === slug) ?? null;
  }
});

type HomepageBannerGroups = {
  main: Banner[];
  category: Record<string, Banner[]>;
  services: Banner[];
};

export async function getHomepageBanners(): Promise<HomepageBannerGroups> {
  return getStaticHomepageBanners();
}

export async function getCategoryBanners(categorySlug: string): Promise<Banner[]> {
  return getStaticCategoryBanners(categorySlug);
}

export async function getServices(limit?: number): Promise<ServiceEntry[]> {
  if (isProductionBuild()) return [];
  if (!(await hasPublicTable("service_entries"))) return fallbackServices.slice(0, limit);
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
  const [result] = await prisma.$queryRaw<Array<{ exists: boolean }>>`select to_regclass(${`public.${tableName}`}) is not null as exists`.catch(() => [{ exists: false }]);
  return Boolean(result?.exists);
}

function isProductionBuild() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}

const fallbackCategories: Category[] = flattenCategoryTree();

const fallbackServices: ServiceEntry[] = [
  {
    id: "cctv-installation",
    title: "CCTV Installation",
    slug: "cctv-installation",
    description: "Camera planning, installation and support for business premises.",
    image: null,
    priceKes: null,
    showRequestQuote: true
  },
  {
    id: "networking",
    title: "Business Networking",
    slug: "networking",
    description: "Wi-Fi, switching and structured connectivity for growing teams.",
    image: null,
    priceKes: null,
    showRequestQuote: true
  },
  {
    id: "managed-it-services",
    title: "Managed IT Services",
    slug: "managed-it-services",
    description: "Responsive maintenance and support for office technology.",
    image: null,
    priceKes: null,
    showRequestQuote: true
  }
];

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
