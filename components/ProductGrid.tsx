"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";
import { SkeletonLoader } from "@/components/SkeletonLoader";

export function ProductGrid({ products }: { products: Product[] }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setLoading(false), 500);
    return () => window.clearTimeout(id);
  }, [products]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-300 bg-white p-3">
            <SkeletonLoader className="aspect-[4/3] w-full" />
            <SkeletonLoader className="mt-4 h-4 w-20" />
            <SkeletonLoader className="mt-3 h-5 w-full" />
            <SkeletonLoader className="mt-3 h-6 w-28" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {products.length ? products.map((product) => (
        <ProductCard key={product.id} product={product} />
      )) : <p className="col-span-full rounded-lg border border-slate-300 bg-white p-6 text-sm font-semibold text-slate-600">No products match this selection.</p>}
    </div>
  );
}
