import type { Metadata } from "next";
import { CategoryFilterPanel } from "@/components/CategoryFilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { getBrands, getCategories, getProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Category Catalog",
  description: "Filter Ceter Technologies products by brand, price, condition and stock availability."
};

export default async function CategoryPage({ searchParams }: { searchParams: Promise<{ category?: string; brand?: string }> }) {
  const params = await searchParams;
  const [categories, brands, products] = await Promise.all([
    getCategories(),
    getBrands(),
    getProducts({ category: params.category, brand: params.brand })
  ]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="lg:flex lg:gap-5">
        <CategoryFilterPanel categories={categories.map((category) => category.name)} brands={brands.map((brand) => brand.name)} />
        <section className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-ink">{params.category ? "Category listing" : "Catalog listing"}</h1>
              <p className="text-sm text-slate-500">{products.length} products available for this selection.</p>
            </div>
            <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
              <option>Sort by featured</option>
              <option>Price low to high</option>
              <option>Price high to low</option>
              <option>Newest first</option>
            </select>
          </div>
          <ProductGrid products={products} />
        </section>
      </div>
    </div>
  );
}
