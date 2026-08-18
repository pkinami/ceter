"use client";

import Link from "next/link";
import { Flame, ShoppingCart, Zap } from "lucide-react";
import { KeyboardEvent, MouseEvent, PointerEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { QuickViewPopover } from "@/components/QuickViewPopover";
import { WhatsAppOrderButton } from "@/components/WhatsAppOrderButton";
import { ProductImageFrame } from "@/components/ProductImageFrame";
import { formatKes } from "@/lib/utils";

const TAP_MOVEMENT_THRESHOLD_PX = 10;

export function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const productHref = `/product/${product.slug}`;
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number; pointerType: string } | null>(null);
  const suppressActivationRef = useRef(false);
  const hasImage = Boolean(product.image);

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
      className="product-card group relative flex h-full min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3"
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
        <div className="relative aspect-[4/3]">
          {hasImage ? (
            <ProductImageFrame src={product.image} alt={product.name} sizes="(max-width: 520px) 48vw, (max-width: 768px) 33vw, 25vw" className="h-full w-full border-0 bg-slate-50" imageClassName="p-1.5 sm:p-2" />
          ) : (
            <ProductImageFrame alt={product.name} sizes="(max-width: 520px) 48vw, (max-width: 768px) 33vw, 25vw" className="h-full w-full border-0 bg-slate-50" placeholderClassName="[&_svg]:h-8 [&_svg]:w-8" />
          )}
          <div className="absolute left-1.5 top-1.5 flex max-w-[calc(100%-0.75rem)] flex-wrap gap-1">
            {product.condition === "new" ? <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 text-white">New</span> : null}
            {product.showOfferBadge ? <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 text-white"><Flame className="h-2.5 w-2.5" aria-hidden /> Offer</span> : null}
            {product.showFlashSaleBadge ? <span className="inline-flex items-center gap-0.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase leading-4 text-white"><Zap className="h-2.5 w-2.5" aria-hidden /> Flash</span> : null}
          </div>
          {product.condition === "refurbished" ? <span className="absolute right-1.5 top-1.5 rounded-full border border-slate-200 bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold capitalize leading-4 text-slate-700">Refurb</span> : null}
        </div>
        <div className="pt-2.5">
          <p className="truncate text-[11px] font-semibold uppercase leading-4 text-slate-500">{product.brand}</p>
          <h3 className="mt-0.5 line-clamp-2 min-h-10 text-[15px] font-semibold leading-5 text-ink">{product.name}</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-[19px] font-bold leading-6 text-signal">{formatKes(product.price)}</p>
            {product.previousPrice ? <p className="text-[11px] text-slate-500"><span className="line-through">{formatKes(product.previousPrice)}</span></p> : null}
          </div>
          <p className={product.stockStatus === "in_stock" ? "mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-green-700" : product.stockStatus === "backorder" ? "mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-700" : "mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-red-700"}>
            <span className={product.stockStatus === "in_stock" ? "h-1.5 w-1.5 rounded-full bg-green-500" : product.stockStatus === "backorder" ? "h-1.5 w-1.5 rounded-full bg-amber-500" : "h-1.5 w-1.5 rounded-full bg-red-500"} />
            {product.stockStatus === "in_stock" ? "In stock" : product.stockStatus === "backorder" ? "Backorder" : "Out of stock"}
          </p>
        </div>
      </Link>
      <div className="mt-2.5 grid grid-cols-[minmax(0,1fr)_44px] gap-2" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
        <AddToCartButton product={product} className="min-h-10 w-full px-2 text-[13px] sm:text-sm">
          <ShoppingCart className="h-4 w-4" /> Add
        </AddToCartButton>
        <WhatsAppOrderButton product={product} compact className="min-h-10 w-11 px-0" />
      </div>
      <QuickViewPopover product={product} />
    </article>
  );
}
