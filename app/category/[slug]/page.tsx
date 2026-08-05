import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryFilterPanel } from "@/components/CategoryFilterPanel";
import { ProductGrid } from "@/components/ProductGrid";
import { getBrands, getCategories, getCategoryBanners, getCategoryBySlug, getProducts } from "@/lib/data";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return {
    title: category ? `${category.name} | Ceter Technologies` : "Category",
    description: category?.description ?? "Browse Ceter Technologies category products."
  };
}

export default async function CategorySlugPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ brand?: string }> }) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [categories, brands, products, banners] = await Promise.all([
    getCategories(),
    getBrands(),
    getProducts({ category: category.slug, brand: query.brand }),
    getCategoryBanners(category.id)
  ]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="lg:flex lg:gap-5">
        <CategoryFilterPanel categories={categories.map((item) => item.name)} brands={brands.map((brand) => brand.name)} />
        <section className="min-w-0 flex-1 space-y-5">
          {banners.length ? <BannerCarousel banners={banners} variant="category" compact /> : null}
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-ink">{category.name}</h1>
              <p className="text-sm text-slate-500">{category.description ?? `${products.length} products in this category.`}</p>
            </div>
            <select className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
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
