"use client";

import Image from "next/image";
import Link from "next/link";
import { Flame, ShoppingCart, Zap } from "lucide-react";
import { KeyboardEvent, MouseEvent, PointerEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { QuickViewPopover } from "@/components/QuickViewPopover";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrderButton";
import { formatKes } from "@/lib/utils";

const TAP_MOVEMENT_THRESHOLD_PX = 10;

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const productHref = `/product/${product.slug}`;
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number; pointerType: string } | null>(null);
  const suppressActivationRef = useRef(false);
  const hasImage = Boolean(product.image);
  const placeholderLabel = (product.name || product.category || "Ceter").trim().charAt(0).toUpperCase();

  function onPointerDown(event: PointerEvent<HTMLAnchorElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, pointerType: event.pointerType };
    suppressActivationRef.current = false;
  }

  function onPointerMove(event: PointerEvent<HTMLAnchorElement>) {
    const start = pointerStartRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    if (start.pointerType === "mouse") return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance > TAP_MOVEMENT_THRESHOLD_PX) suppressActivationRef.current = true;
  }

  function onPointerEnd() {
    pointerStartRef.current = null;
  }

  function onProductClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!suppressActivationRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressActivationRef.current = false;
    pointerStartRef.current = null;
  }

  function onProductKeyDown(event: KeyboardEvent<HTMLAnchorElement>) {
    if (event.key !== " ") return;
    event.preventDefault();
    router.push(productHref);
  }

  return (
    <article
      className="product-card group relative flex h-full min-w-0 flex-col rounded-lg border border-slate-300 bg-white p-3 shadow-sm"
    >
      <Link
        href={productHref}
        className="block min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerCancel={onPointerEnd}
        onPointerUp={onPointerEnd}
        onClick={onProductClick}
        onKeyDown={onProductKeyDown}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-white">
          {hasImage ? (
            <Image src={product.image} alt={product.name} fill className="object-contain object-center p-2" sizes="(max-width: 520px) 100vw, (max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white text-slate-400">
              <span className="grid h-16 w-16 place-items-center rounded-md border border-slate-200 bg-slate-50 text-3xl font-black">{placeholderLabel}</span>
            </div>
          )}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {product.condition === "new" ? <span className="rounded-full bg-teal-600 px-2.5 py-1 text-xs font-black uppercase text-white">New</span> : null}
            {product.showOfferBadge ? <span className="inline-flex items-center gap-1 rounded-full bg-orange-600 px-2.5 py-1 text-xs font-black uppercase text-white"><Flame className="h-3 w-3" aria-hidden /> Offer</span> : null}
            {product.showFlashSaleBadge ? <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-black uppercase text-white"><Zap className="h-3 w-3" aria-hidden /> Flash Sale</span> : null}
          </div>
          {product.condition === "refurbished" ? <span className="absolute right-2 top-2 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-bold capitalize text-slate-700">{product.condition}</span> : null}
        </div>
        <div className="pt-3">
          <p className="text-xs font-bold uppercase text-signal">{product.brand}</p>
          <h3 className="mt-1 min-h-10 text-sm font-bold leading-5 text-ink">{product.name}</h3>
          <p className="mt-2 text-lg font-black text-signal">{formatKes(product.price)}</p>
          {product.previousPrice ? <p className="text-xs text-slate-500"><span className="line-through">{formatKes(product.previousPrice)}</span> previous price</p> : null}
          <p className={product.stockStatus === "in_stock" ? "inline-flex items-center gap-1.5 text-xs font-semibold text-green-700" : product.stockStatus === "backorder" ? "inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700" : "inline-flex items-center gap-1.5 text-xs font-semibold text-red-700"}>
            <span className={product.stockStatus === "in_stock" ? "h-2 w-2 rounded-full bg-green-500" : product.stockStatus === "backorder" ? "h-2 w-2 rounded-full bg-amber-500" : "h-2 w-2 rounded-full bg-red-500"} />
            {product.stockStatus === "in_stock" ? "In stock" : product.stockStatus === "backorder" ? "Backorder" : "Out of stock"}
          </p>
        </div>
      </Link>
      <div className="mt-3 grid gap-2 min-[1180px]:grid-cols-2" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <AddToCartButton product={product} className="min-h-11 w-full px-2 text-xs">
          <ShoppingCart className="h-4 w-4" /> Add to cart
        </AddToCartButton>
        <WhatsAppOrderButton product={product} className="min-h-11 w-full px-2 text-xs" />
      </div>
      <QuickViewPopover product={product} />
    </article>
  );
}
