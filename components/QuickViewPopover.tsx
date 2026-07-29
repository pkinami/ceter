"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";

export function QuickViewPopover({ product }: { product: Product }) {
  const specs = Object.entries(product.specs).slice(0, 4);

  return (
    <div className="pointer-events-none absolute left-3 right-3 top-10 z-20 translate-y-3 rounded-lg border border-slate-300 bg-white p-3 opacity-0 shadow-industrial transition duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
      <div className="flex gap-3">
        <div className="relative h-24 w-24 shrink-0 rounded-md bg-panel">
          <Image src={product.image} alt="" fill className="object-contain p-2" sizes="96px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase text-ink">Quick view</p>
          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-600">{product.description}</p>
          {specs.slice(0, 2).map(([key, value]) => (
            <p key={key} className="mt-1 text-xs text-slate-600">
              <span className="font-bold">{key}:</span> {value}
            </p>
          ))}
          <AddToCartButton product={product} className="mt-3 h-9 w-full px-3 text-xs">
            <ShoppingCart className="h-3.5 w-3.5" /> Add
          </AddToCartButton>
        </div>
      </div>
    </div>
  );
}
