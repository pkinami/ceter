import type { Metadata } from "next";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryFilterPanel } from "@/components/CategoryFilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { getBrands, getCategories, getHomepageBanners, getProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Category Catalog",
  description: "Filter Ceter Technologies products by brand, price, condition and stock availability."
};

export default async function CategoryPage({ searchParams }: { searchParams: Promise<{ category?: string; brand?: string; condition?: string; stock?: string; maxPrice?: string }> }) {
  const params = await searchParams;
  const [categories, brands, products, banners] = await Promise.all([
    getCategories(),
    getBrands(),
    getProducts({ category: params.category, brand: params.brand }),
    getHomepageBanners()
  ]);
  const filteredProducts = products.filter((product) => {
    if (params.condition && product.condition !== params.condition) return false;
    if (params.stock && product.stockStatus !== params.stock) return false;
    if (params.maxPrice && product.price > Number(params.maxPrice)) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="lg:flex lg:gap-5">
        <CategoryFilterPanel categories={categories} brands={brands.map((brand) => brand.name)} />
        <section className="min-w-0 flex-1 space-y-5">
          <BannerCarousel banners={banners.main} variant="category" compact />
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-ink">{params.category ? "Category listing" : "Catalog listing"}</h1>
              <p className="text-sm text-slate-500">{filteredProducts.length} products available for this selection.</p>
            </div>
            <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option>Sort by featured</option>
              <option>Price low to high</option>
              <option>Price high to low</option>
              <option>Newest first</option>
            </select>
          </div>
          <ProductGrid products={filteredProducts} />
        </section>
      </div>
    </div>
  );
}
