import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

export function ProductGrid({ products, emptyMessage = "No products match this selection." }: { products: Product[]; emptyMessage?: string }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {products.length ? products.map((product) => (
        <ProductCard key={product.id} product={product} />
      )) : <p className="col-span-full rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">{emptyMessage}</p>}
    </div>
  );
}
