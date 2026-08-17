"use client";

import type { Product } from "@/lib/types";
import { ProductImageFrame } from "@/components/ProductImageFrame";

export function QuickViewPopover({ product }: { product: Product }) {
  const specs = Object.entries(product.specs).slice(0, 4);

  return (
    <div className="product-quick-view pointer-events-none absolute left-3 right-3 top-10 z-20 hidden translate-y-3 rounded-lg border border-slate-300 bg-white p-3 opacity-0 shadow-industrial transition duration-200">
      <div className="flex gap-3">
        <ProductImageFrame src={product.image} alt="" sizes="96px" className="h-24 w-24 shrink-0" imageClassName="p-1.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-ink">Quick view</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-600">{product.description}</p>
          {specs.slice(0, 2).map(([key, value]) => (
            <p key={key} className="mt-1 text-xs text-slate-600">
              <span className="font-bold">{key}:</span> {value}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
