"use client";

import Image from "next/image";
import Link from "next/link";
import { FileText, Flame, Minus, Package, Plus, ShoppingCart, Zap } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductCard } from "@/components/ProductCard";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrderButton";
import { formatKes } from "@/lib/utils";

export function ProductDetail({ product, related }: { product: Product; related: Product[] }) {
  const [quantity, setQuantity] = useState(1);
  const gallery = product.images.length ? product.images : [];
  const [activeImage, setActiveImage] = useState(gallery[0] ?? "");
  const maxQuantity = product.stockStatus === "backorder" ? Number.POSITIVE_INFINITY : Math.max(0, product.stockQuantity);
  const canAddToCart = product.stockStatus === "backorder" || maxQuantity > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <section className="rounded-lg border border-slate-300 bg-white p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-white">
            {activeImage ? (
              <Image src={activeImage} alt={product.name} fill className="object-contain object-center p-3" priority sizes="(max-width: 1024px) 100vw, 50vw" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-500">
                <Package className="h-14 w-14" aria-hidden />
              </div>
            )}
          </div>
          {gallery.length > 1 ? (
            <div className="mt-3 grid grid-cols-3 gap-3 min-[520px]:grid-cols-4">
              {gallery.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={image === activeImage ? "relative aspect-[4/3] min-h-11 rounded-md border-2 border-signal bg-white" : "relative aspect-[4/3] min-h-11 rounded-md border border-slate-300 bg-white hover:border-signal"}
                  aria-label={`Show product image ${index + 1}`}
                  aria-current={image === activeImage}
                >
                  <Image src={image} alt="" fill className="object-contain object-center p-1.5" sizes="120px" />
                </button>
              ))}
            </div>
          ) : null}
        </section>
        <section>
          <p className="text-sm font-black uppercase text-signal">{product.brand}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.condition === "new" ? <span className="rounded-full bg-teal-600 px-3 py-1 text-xs font-black uppercase text-white">New</span> : null}
            {product.showOfferBadge ? <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-3 py-1 text-xs font-black uppercase text-white"><Flame className="h-3.5 w-3.5" aria-hidden /> Offer</span> : null}
            {product.showFlashSaleBadge ? <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-black uppercase text-white"><Zap className="h-3.5 w-3.5" aria-hidden /> Flash Sale</span> : null}
          </div>
          <h1 className="mt-2 text-[clamp(1.75rem,4vw,2.5rem)] font-black leading-tight text-ink">{product.name}</h1>
          <p className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-black text-slate-950">{formatKes(product.price)}</p>
          {product.previousPrice ? <p className="mt-1 text-sm text-slate-500"><span className="line-through">{formatKes(product.previousPrice)}</span> previous price</p> : null}
          <p className={product.stockStatus === "in_stock" ? "mt-2 text-sm font-bold text-teal-700" : "mt-2 text-sm font-bold text-red-600"}>
            {product.stockStatus === "in_stock" ? `Available in stock (${product.stockQuantity})` : product.stockStatus === "backorder" ? "Available on backorder" : "Out of stock"}
          </p>
          <div className="mt-6 rounded-lg border border-slate-300 bg-white p-4">
            <h2 className="text-sm font-black uppercase text-ink">Specifications</h2>
            <table className="mt-3 w-full table-fixed text-sm">
              <tbody>
                {Object.entries(product.specs).map(([key, value]) => (
                  <tr key={key} className="border-t border-line">
                    <th className="w-2/5 break-words py-3 pr-4 text-left font-bold text-slate-600">{key}</th>
                    <td className="break-words py-3 text-slate-700">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center rounded-md border border-slate-300 bg-white">
              <button className="grid h-11 w-11 place-items-center" onClick={() => setQuantity((value) => Math.max(1, value - 1))} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center text-sm font-black">{quantity}</span>
              <button className="grid h-11 w-11 place-items-center" onClick={() => setQuantity((value) => Math.min(value + 1, maxQuantity))} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
            {canAddToCart ? (
              <AddToCartButton product={product} quantity={quantity} className="min-w-40">
                <ShoppingCart className="h-4 w-4" /> Add to cart
              </AddToCartButton>
            ) : (
              <button type="button" disabled className="inline-flex h-11 min-w-40 cursor-not-allowed items-center justify-center gap-2 rounded-md bg-slate-300 px-4 text-sm font-semibold text-white">
                <ShoppingCart className="h-4 w-4" /> Out of stock
              </button>
            )}
            <Link href={`/quote?product=${encodeURIComponent(product.slug)}`} className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-ink hover:bg-slate-50">
              <FileText className="h-4 w-4" /> Request quote
            </Link>
            <WhatsAppOrderButton product={product} className="min-w-48" />
          </div>
        </section>
      </div>
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black text-ink">Related products</h2>
        <div className="grid grid-cols-1 gap-4 min-[460px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {related.map((item) => <ProductCard key={item.id} product={item} />)}
        </div>
      </section>
    </div>
  );
}
