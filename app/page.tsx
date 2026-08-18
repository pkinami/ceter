import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Cloud, DatabaseBackup, Network, Server, ShieldCheck, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryTile } from "@/components/CategoryTile";
import { ProductGrid } from "@/components/ProductGrid";
import { ProductRail } from "@/components/ProductRail";
import { Sidebar } from "@/components/Sidebar";
import { formatKes } from "@/lib/utils";
import { buildCategoryTree, categoryAndDescendantKeys } from "@/lib/category-tree";
import { iconForCategory } from "@/lib/category-icons";
import { getBrands, getCategories, getHomepageBanners, getHomepageSections, getProducts, getServices } from "@/lib/data";
import { JsonLd, metadataForPage, organizationJsonLd } from "@/lib/seo";
import type { Banner, Category, Product, ServiceEntry } from "@/lib/types";

export const metadata: Metadata = metadataForPage({
  title: "Printers, Photocopiers and Toners in Kenya",
  description: "Shop printers in Kenya, photocopiers, toner cartridges, spare parts and printer repair services from Ceter Technologies in Nairobi.",
  path: "/"
});

export const dynamic = "force-dynamic";

const serviceIconMap: Record<string, LucideIcon> = {
  "cctv-installation": ShieldCheck,
  "structured-cabling": Network,
  networking: Network,
  "server-installation": Server,
  "data-recovery": DatabaseBackup,
  "managed-it-services": Wrench,
  "cloud-solutions": Cloud,
  "security-solutions": ShieldCheck
};

export default async function HomePage() {
  const categories = await getCategories();
  const brands = await getBrands();
  const products = await getProducts();
  const banners = await getHomepageBanners();
  const services = await getServices(8);
  const homepageSections = await getHomepageSections();
  const rootCategories = buildCategoryTree(categories);

  const categorySections = homepageSections
    .filter((section) => section.sectionType === "category_products" && section.category)
    .map((section) => ({
      id: section.id,
      title: section.title,
      category: section.category as Category,
      products: section.category ? productsForCategory(products, section.category, categories).slice(0, Math.min(Math.max(section.productLimit, 6), 8)) : []
    }))
    .filter((section) => section.products.length);

  const fallbackCategorySections = rootCategories.map((category) => ({
    id: category.id,
    title: category.name,
    category,
    products: productsForCategory(products, category, categories).slice(0, 8)
  })).filter((section) => section.products.length);

  const sectionsToRender = categorySections.length ? categorySections : fallbackCategorySections;
  const servicesSection = homepageSections.find((section) => section.sectionType === "services");
  const latestSection = homepageSections.find((section) => section.sectionType === "latest_products");
  const latestProducts = [...products].sort((a, b) => b.name.localeCompare(a.name)).slice(0, latestSection?.productLimit ?? 8);

  return (
    <div className="mx-auto flex max-w-[1440px] gap-5 px-4 py-4 sm:py-4 lg:gap-5">
      <Suspense fallback={null}>
        <Sidebar categories={categories} brands={brands.map((brand) => brand.name)} />
      </Suspense>
      <JsonLd data={organizationJsonLd()} />
      <div className="min-w-0 flex-1 space-y-6 sm:space-y-7">
        <BannerCarousel banners={banners.main} variant="main" />

        <section>
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h2 className="text-[21px] font-bold leading-7 text-ink sm:text-[22px]">Featured Categories</h2>
            <Link href="/category" className="inline-flex items-center gap-1 text-sm font-semibold text-signal">View all <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {rootCategories.length ? rootCategories.slice(0, 10).map((category) => {
              const Icon = iconForCategory(category.icon, category.slug);
              return (
                <CategoryTile
                  key={category.id}
                  name={category.name}
                  slug={category.slug}
                  description={category.description ?? "Browse stocked equipment, consumables and service options."}
                  icon={Icon}
                />
              );
            }) : <p className="col-span-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">No categories available yet.</p>}
          </div>
        </section>

        {sectionsToRender.map((section) => (
          <div key={section.id} className="space-y-4">
            {banners.category[section.category.slug]?.length ? <BannerCarousel banners={banners.category[section.category.slug]} variant="category" compact /> : null}
            <CategoryProductSection title={section.title} category={section.category} products={section.products} />
          </div>
        ))}

        {!products.length ? <ProductGrid products={[]} emptyMessage="No products available yet." /> : null}

        {servicesSection ? (
          <ServicesSection title={servicesSection.title} services={services.slice(0, servicesSection.productLimit)} banners={banners.services} />
        ) : null}

        {latestSection && products.length ? (
          <ProductRail title={latestSection.title} href="/category" products={latestProducts} emptyMessage="No products available yet." />
        ) : null}
      </div>
    </div>
  );
}

function productsForCategory(products: Product[], category: Category, categories: Category[]) {
  const keys = categoryAndDescendantKeys(category, categories);
  return products
    .filter((product) => keys.has(product.category.toLowerCase()) || Boolean(product.categorySlug && keys.has(product.categorySlug)) || Boolean(product.categoryId && keys.has(product.categoryId)))
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
}

function CategoryProductSection({ title, category, products }: { title: string; category: Category; products: Product[] }) {
  return (
    <ProductRail title={title} href={`/category/${category.slug}`} products={products} />
  );
}

function ServicesSection({ title, services, banners }: { title: string; services: ServiceEntry[]; banners: Banner[] }) {
  if (!services.length) return null;

  return (
    <section className="space-y-5">
      {banners.length ? <BannerCarousel banners={banners} variant="services" compact /> : null}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-bold leading-7 text-ink sm:text-[22px]">{title}</h2>
          <p className="hidden text-sm text-slate-500 sm:block">Project-based IT, security and infrastructure work managed separately from product stock.</p>
        </div>
        <Link href="/quote" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-signal">Request quote <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => {
          const Icon = serviceIconMap[service.slug] ?? Wrench;
          return (
            <article key={service.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-signal sm:h-11 sm:w-11">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-5 text-ink">{service.title}</h3>
              <p className="mt-1 hidden text-sm leading-6 text-slate-600 sm:line-clamp-2">{service.description}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-signal">{service.priceKes ? formatKes(service.priceKes) : "Quote-based"}</span>
                {service.showRequestQuote ? (
                  <Link href={`/quote?service=${encodeURIComponent(service.title)}`} className="rounded-md bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-slate-800">
                    Request Quote
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
