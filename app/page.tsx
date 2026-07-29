import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Printer, ScanLine, Settings, Wrench } from "lucide-react";
import { BannerCarousel } from "@/components/BannerCarousel";
import { CategoryTile } from "@/components/CategoryTile";
import { ProductGrid } from "@/components/ProductGrid";
import { Sidebar } from "@/components/Sidebar";
import { getBrands, getCategories, getProducts } from "@/lib/data";

export const metadata: Metadata = {
  title: "Office Printing Equipment Nairobi",
  description: "Shop printers, photocopiers, toners, spare parts and services from Ceter Technologies Limited in Nairobi."
};

const categoryMeta = [
  { description: "A4 and A3 workhorse devices for office teams.", icon: Printer },
  { description: "Refurbished and new copier systems with setup support.", icon: ScanLine },
  { description: "Original toner, ink bottles and cartridge multipacks.", icon: BadgeCheck },
  { description: "Drums, maintenance kits and replacement assemblies.", icon: Settings },
  { description: "Barcode and label printers for inventory workflows.", icon: Wrench },
  { description: "PVC card printers for access and staff identification.", icon: CreditCard }
];

export default async function HomePage() {
  const [categories, brands, products] = await Promise.all([getCategories(), getBrands(), getProducts({ limit: 12 })]);

  return (
    <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
      <Sidebar categories={categories.map((category) => category.name)} brands={brands.map((brand) => brand.name)} />
      <div className="min-w-0 flex-1 space-y-8">
        <BannerCarousel />
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black text-ink">Shop by category</h2>
            <Link href="/category" className="inline-flex items-center gap-1 text-sm font-bold text-signal">All categories <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => (
              <CategoryTile
                key={category.id}
                name={category.name}
                description={category.description ?? categoryMeta[index]?.description ?? "Browse stocked equipment, consumables and service options."}
                icon={categoryMeta[index]?.icon ?? Printer}
              />
            ))}
          </div>
        </section>
        <section>
          <div className="mb-4">
            <h2 className="text-xl font-black text-ink">Featured products</h2>
            <p className="text-sm text-slate-500">Public KES pricing shown for planning and procurement.</p>
          </div>
          <ProductGrid products={products} />
        </section>
      </div>
    </div>
  );
}
