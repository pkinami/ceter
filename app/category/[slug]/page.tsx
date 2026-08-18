import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryFilterPanel } from "@/components/CategoryFilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { getBrands, getCategories, getCategoryBanners, getCategoryBySlug, getProducts } from "@/lib/data";
import { JsonLd, breadcrumbJsonLd, categoryMetadata } from "@/lib/seo";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return category ? categoryMetadata(category) : { title: "Category" };
}

export default async function CategorySlugPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ brand?: string; condition?: string; stock?: string; maxPrice?: string; q?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const searchQuery = query.q?.trim();
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const categories = await getCategories();
  const brands = await getBrands();
  const products = await getProducts({ category: category.slug, brand: query.brand, q: searchQuery });
  const banners = await getCategoryBanners(category.slug);
  const breadcrumbs = categoryBreadcrumbs(category, categories);
  const filteredProducts = products.filter((product) => {
    if (query.condition && product.condition !== query.condition) return false;
    if (query.stock && product.stockStatus !== query.stock) return false;
    if (query.maxPrice && product.price > Number(query.maxPrice)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:py-6">
      <JsonLd data={breadcrumbJsonLd(breadcrumbs)} />
      <div className="lg:flex lg:gap-5">
        <Suspense fallback={null}>
          <CategoryFilterPanel categories={categories} brands={brands.map((brand) => brand.name)} />
        </Suspense>
        <section className="min-w-0 flex-1 space-y-5">
          {banners.length ? <BannerCarousel banners={banners} variant="category" compact /> : null}
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-bold leading-8 text-ink sm:text-3xl">{searchQuery ? `${category.name}: "${searchQuery}"` : category.name}</h1>
              <p className="text-sm text-slate-500">{category.description ?? `${filteredProducts.length} products in this category.`}</p>
            </div>
            <select aria-label="Sort products" autoComplete="off" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
              <option>Sort by featured</option>
              <option>Price low to high</option>
              <option>Price high to low</option>
              <option>Newest first</option>
            </select>
          </div>
          <ProductGrid products={filteredProducts} emptyMessage={searchQuery ? `No products match "${searchQuery}" in ${category.name}.` : query.brand || query.condition || query.stock || query.maxPrice ? "No products match this selection." : "No products available yet."} />
        </section>
      </div>
    </div>
  );
}

function categoryBreadcrumbs(category: Category, categories: Category[]) {
  const trail: Category[] = [];
  let current: Category | undefined = category;
  while (current) {
    trail.unshift(current);
    current = current.parentId ? categories.find((item) => item.id === current?.parentId) : undefined;
  }
  return [
    { name: "Home", path: "/" },
    { name: "Catalogue", path: "/category" },
    ...trail.map((item) => ({ name: item.name, path: `/category/${item.slug}` }))
  ];
}
