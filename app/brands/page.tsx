import type { Metadata } from "next";
import Link from "next/link";
import { getBrands } from "@/lib/data";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Printer and Copier Brands in Kenya",
  description: "Browse Ceter Technologies Limited products by brand, including printers, photocopiers, toner cartridges and consumables.",
  path: "/brands"
});

export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="mb-5">
        <h1 className="text-[26px] font-bold leading-8 text-ink sm:text-3xl">Brands</h1>
        <p className="text-sm text-slate-500">{brands.length} brands available in the catalogue.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {brands.length ? brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/category?brand=${encodeURIComponent(brand.name)}`}
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-teal-500 hover:text-teal-700"
          >
            {brand.name}
          </Link>
        )) : (
          <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">No brands are published yet.</p>
        )}
      </div>
    </main>
  );
}
