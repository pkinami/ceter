import type { Metadata } from "next";
import { Suspense } from "react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryFilterPanel } from "@/components/CategoryFilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { getBrands, getCategories, getHomepageBanners, getProducts } from "@/lib/data";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Office Printing Catalogue in Kenya",
  description: "Browse Ceter Technologies products by category, brand and stock status, including printers, photocopiers, toner cartridges and spare parts in Kenya.",
  path: "/category"
});

export const dynamic = "force-dynamic";

export default async function CategoryPage({ searchParams }: { searchParams: Promise<{ category?: string; brand?: string; condition?: string; stock?: string; maxPrice?: string; q?: string }> }) {
  const params = await searchParams;
  const searchQuery = params.q?.trim();
  const categories = await getCategories();
  const brands = await getBrands();
  const products = await getProducts({ category: params.category, brand: params.brand, q: searchQuery });
  const banners = await getHomepageBanners();
  const filteredProducts = products.filter((product) => {
    if (params.condition && product.condition !== params.condition) return false;
    if (params.stock && product.stockStatus !== params.stock) return false;
    if (params.maxPrice && product.price > Number(params.maxPrice)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-5 sm:py-6">
      <div className="lg:flex lg:gap-5">
        <Suspense fallback={null}>
          <CategoryFilterPanel categories={categories} brands={brands.map((brand) => brand.name)} />
        </Suspense>
        <section className="min-w-0 flex-1 space-y-5">
          <BannerCarousel banners={banners.main} variant="category" compact />
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-[26px] font-bold leading-8 text-ink sm:text-3xl">{searchQuery ? `Search results for "${searchQuery}"` : params.category ? "Category listing" : "Catalog listing"}</h1>
              <p className="text-sm text-slate-500">{filteredProducts.length} products available for this selection.</p>
            </div>
            <select aria-label="Sort products" autoComplete="off" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option>Sort by featured</option>
              <option>Price low to high</option>
              <option>Price high to low</option>
              <option>Newest first</option>
            </select>
          </div>
          <ProductGrid products={filteredProducts} emptyMessage={searchQuery ? `No products match "${searchQuery}".` : params.category || params.brand || params.condition || params.stock || params.maxPrice ? "No products match this selection." : "No products available yet."} />
        </section>
      </div>
    </div>
  );
}
