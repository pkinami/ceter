"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { QuickViewPopover } from "@/components/QuickViewPopover";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrderButton";
import { formatKes } from "@/lib/utils";

export function ProductCard({ product }: { product: Product }) {
  return (
    <motion.article
      className="group relative rounded-lg border border-slate-300 bg-white p-3 shadow-sm hover:-translate-y-1 hover:shadow-industrial"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.18 }}
    >
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-panel">
          <Image src={product.image} alt={product.name} fill className="object-contain p-5" sizes="(max-width: 768px) 100vw, 25vw" />
          <span className="absolute left-2 top-2 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white shadow">New</span>
          <span className="absolute right-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-slate-700 shadow">{product.condition}</span>
        </div>
        <div className="pt-3">
          <p className="text-xs font-bold uppercase text-signal">{product.brand}</p>
          <h3 className="mt-1 min-h-10 text-sm font-bold leading-5 text-ink">{product.name}</h3>
          <p className="mt-2 text-lg font-black text-signal">{formatKes(product.price)}</p>
          <p className={product.stockStatus === "in_stock" ? "inline-flex items-center gap-1.5 text-xs font-semibold text-green-700" : product.stockStatus === "backorder" ? "inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700" : "inline-flex items-center gap-1.5 text-xs font-semibold text-red-700"}>
            <span className={product.stockStatus === "in_stock" ? "h-2 w-2 rounded-full bg-green-500" : product.stockStatus === "backorder" ? "h-2 w-2 rounded-full bg-amber-500" : "h-2 w-2 rounded-full bg-red-500"} />
            {product.stockStatus === "in_stock" ? "In stock" : product.stockStatus === "backorder" ? "Backorder" : "Out of stock"}
          </p>
        </div>
      </Link>
      <div className="mt-3 grid gap-2 min-[1180px]:grid-cols-2">
        <AddToCartButton product={product} className="w-full px-2 text-xs">
          <ShoppingCart className="h-4 w-4" /> Add to cart
        </AddToCartButton>
        <WhatsAppOrderButton product={product} className="w-full px-2 text-xs" />
      </div>
      <QuickViewPopover product={product} />
    </motion.article>
  );
}
