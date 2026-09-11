import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { getProducts } from "@/lib/data";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Search Ceter Products",
  description: "Search Ceter Technologies Limited printers, photocopiers, toner cartridges, consumables and IT equipment in Kenya.",
  path: "/search"
});

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const products = query ? await getProducts({ q: query }) : [];

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-8 text-ink sm:text-3xl">{query ? `Search results for "${query}"` : "Search products"}</h1>
          <p className="text-sm text-slate-500">
            {query ? `${products.length} products found.` : "Enter a product, SKU, brand or category from the site search."}
          </p>
        </div>
        <Link href="/category" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400">
          Browse catalogue
        </Link>
      </div>
      <ProductGrid products={products} emptyMessage={query ? `No products match "${query}".` : "No search term provided."} />
    </main>
  );
}
