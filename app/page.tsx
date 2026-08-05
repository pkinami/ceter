import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Cloud, CreditCard, DatabaseBackup, Network, Printer, ScanLine, Server, Settings, ShieldCheck, Tags, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryTile } from "@/components/CategoryTile";
import { ProductGrid } from "@/components/ProductGrid";
import { Sidebar } from "@/components/Sidebar";
import { formatKes } from "@/lib/utils";
import { getBrands, getCategories, getHomepageBanners, getHomepageSections, getProducts, getServices } from "@/lib/data";
import type { Banner, Category, Product, ServiceEntry } from "@/lib/types";

export const metadata: Metadata = {
  title: "Ceter Technologies Storefront",
  description: "Shop office equipment, consumables and IT services from Ceter Technologies Limited in Nairobi."
};

const categoryIconMap: Record<string, LucideIcon> = {
  Printer,
  ScanLine,
  BadgeCheck,
  Settings,
  Tags,
  CreditCard
};

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
  const [categories, brands, products, banners, services, homepageSections] = await Promise.all([
    getCategories(),
    getBrands(),
    getProducts(),
    getHomepageBanners(),
    getServices(8),
    getHomepageSections()
  ]);

  const categorySections = homepageSections
    .filter((section) => section.sectionType === "category_products" && section.category)
    .map((section) => ({
      id: section.id,
      title: section.title,
      category: section.category as Category,
      products: products
        .filter((product) => product.categoryId === section.category?.id)
        .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
        .slice(0, Math.min(Math.max(section.productLimit, 6), 8))
    }))
    .filter((section) => section.products.length);

  const fallbackCategorySections = categories.map((category) => ({
    id: category.id,
    title: category.name,
    category,
    products: products.filter((product) => product.categoryId === category.id).slice(0, 8)
  })).filter((section) => section.products.length);

  const sectionsToRender = categorySections.length ? categorySections : fallbackCategorySections;
  const servicesSection = homepageSections.find((section) => section.sectionType === "services");
  const latestSection = homepageSections.find((section) => section.sectionType === "latest_products");
  const brandsSection = homepageSections.find((section) => section.sectionType === "brands");
  const shouldShowDefaultCmsSections = homepageSections.length === 0;
  const latestProducts = [...products].sort((a, b) => b.name.localeCompare(a.name)).slice(0, latestSection?.productLimit ?? 8);

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <Sidebar categories={categories.map((category) => category.name)} brands={brands.map((brand) => brand.name)} />
      <div className="min-w-0 flex-1 space-y-10">
        <BannerCarousel banners={banners.main} variant="main" />

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-ink">Featured Categories</h2>
            <Link href="/category" className="inline-flex items-center gap-1 text-sm font-bold text-signal">All categories <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.slice(0, 6).map((category) => {
              const Icon = categoryIconMap[category.icon ?? ""] ?? Printer;
              return (
                <CategoryTile
                  key={category.id}
                  name={category.name}
                  slug={category.slug}
                  description={category.description ?? "Browse stocked equipment, consumables and service options."}
                  icon={Icon}
                />
              );
            })}
          </div>
        </section>

        {sectionsToRender.map((section) => (
          <div key={section.id} className="space-y-5">
            {banners.category[section.category.id]?.length ? <BannerCarousel banners={banners.category[section.category.id]} variant="category" compact /> : null}
            <CategoryProductSection title={section.title} category={section.category} products={section.products} />
          </div>
        ))}

        {servicesSection || shouldShowDefaultCmsSections ? (
          <ServicesSection title={servicesSection?.title ?? "Ceter Services & Solutions"} services={services.slice(0, servicesSection?.productLimit ?? 8)} banners={banners.services} />
        ) : null}

        {latestSection || shouldShowDefaultCmsSections ? <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-ink">{latestSection?.title ?? "Latest Products"}</h2>
              <p className="text-sm text-slate-500">Recently added equipment, consumables and parts.</p>
            </div>
            <Link href="/category" className="inline-flex items-center gap-1 text-sm font-bold text-signal">View catalog <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <ProductGrid products={latestProducts} />
        </section> : null}

        {brandsSection || shouldShowDefaultCmsSections ? <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-ink">{brandsSection?.title ?? "Featured Brands"}</h2>
            <p className="text-sm text-slate-500">Commercial printer, copier, labeling and card-printing brands supplied by Ceter.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {brands.slice(0, brandsSection?.productLimit ?? 10).map((brand) => (
              <Link key={brand.id} href={`/category?brand=${encodeURIComponent(brand.name)}`} className="flex h-28 flex-col items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white p-4 text-center shadow-sm hover:border-signal hover:shadow-industrial">
                <div className="relative h-10 w-20">
                  <Image src={brand.icon || "/product-placeholder.svg"} alt={`${brand.name} icon`} fill className="object-contain" sizes="80px" />
                </div>
                <span className="text-sm font-black text-ink">{brand.name}</span>
              </Link>
            ))}
          </div>
        </section> : null}
      </div>
    </div>
  );
}

function CategoryProductSection({ title, category, products }: { title: string; category: Category; products: Product[] }) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <p className="text-sm text-slate-500">{category.description ?? "Featured products selected for this category."}</p>
        </div>
        <Link href={`/category/${category.slug}`} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-ink hover:border-signal hover:text-signal">
          View All <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}

function ServicesSection({ title, services, banners }: { title: string; services: ServiceEntry[]; banners: Banner[] }) {
  if (!services.length) return null;

  return (
    <section className="space-y-5">
      {banners.length ? <BannerCarousel banners={banners} variant="services" compact /> : null}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-ink">{title}</h2>
          <p className="text-sm text-slate-500">Project-based IT, security and infrastructure work managed separately from product stock.</p>
        </div>
        <Link href="/quote" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-signal">Request quote <ArrowRight className="h-4 w-4" /></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {services.map((service) => {
          const Icon = serviceIconMap[service.slug] ?? Wrench;
          return (
            <article key={service.id} className="rounded-lg border border-slate-300 bg-white p-4 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-signal">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-black text-ink">{service.title}</h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{service.description}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-sm font-black text-signal">{service.priceKes ? formatKes(service.priceKes) : "Quote-based"}</span>
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
