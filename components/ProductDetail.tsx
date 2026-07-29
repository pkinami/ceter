"use client";

import Image from "next/image";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrderButton";
import { formatKes } from "@/lib/utils";

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const [quantity, setQuantity] = useState(1);
  const gallery = product.images.length ? product.images : [product.image];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-slate-300 bg-white p-4">
          <div className="relative aspect-[4/3] rounded-md bg-panel">
            <Image src={gallery[0]} alt={product.name} fill className="object-contain p-8" priority />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {gallery.map((image, index) => (
              <button key={index} className="relative aspect-[4/3] rounded-md border border-slate-300 bg-panel hover:border-signal">
                <Image src={image} alt="" fill className="object-contain p-3" />
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="text-sm font-black uppercase text-signal">{product.brand}</p>
          <h1 className="mt-2 text-3xl font-black text-ink">{product.name}</h1>
          <p className="mt-3 text-3xl font-black text-slate-950">{formatKes(product.price)}</p>
          <p className={product.stockStatus === "in_stock" ? "mt-2 text-sm font-bold text-teal-700" : "mt-2 text-sm font-bold text-red-600"}>
            {product.stockStatus === "in_stock" ? `Available in stock (${product.stockQuantity})` : product.stockStatus === "backorder" ? "Available on backorder" : "Out of stock"}
          </p>
          <div className="mt-6 rounded-lg border border-slate-300 bg-white p-4">
            <h2 className="text-sm font-black uppercase text-ink">Specifications</h2>
            <table className="mt-3 w-full text-sm">
              <tbody>
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key} className="border-t border-line">
                    <th className="py-3 pr-4 text-left font-bold text-slate-600">{key}</th>
                    <td className="py-3 text-slate-700">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center rounded-md border border-slate-300 bg-white">
              <button className="px-3" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-black">{quantity}</span>
              <button className="px-3" onClick={() => setQuantity((value) => value + 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
            <AddToCartButton product={product} quantity={quantity} className="min-w-40">
              <ShoppingCart className="h-4 w-4" /> Add to cart
            </AddToCartButton>
            <WhatsAppOrderButton product={product} className="min-w-48" />
          </div>
        </section>
      </div>
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black text-ink">Related products</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {related.map((item) => <ProductCard key={item.id} product={item} />)}
        </div>
      </section>
    </div>
  );
}
