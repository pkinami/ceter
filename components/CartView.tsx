"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Package, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatKes } from "@/lib/utils";

export function CartView() {
  const { items, loading, updateItem, removeItem } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  async function update(id: string, currentQuantity: number, direction: number) {
    await updateItem(id, Math.max(1, currentQuantity + direction));
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-line p-4">
          <h1 className="text-2xl font-black text-ink">Cart</h1>
          <p className="text-sm text-slate-500">Review saved cart items before secure checkout.</p>
        </div>
        <div className="divide-y divide-line">
          {loading ? <p className="p-4 text-sm font-semibold text-slate-500">Loading cart...</p> : null}
          {!loading && !items.length ? (
            <div className="p-5">
              <p className="text-sm font-semibold text-slate-600">Your cart is empty.</p>
              <Link href="/category" className="mt-3 inline-flex rounded-md bg-signal px-4 py-2 text-sm font-bold text-white">Browse products</Link>
            </div>
          ) : null}
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="grid gap-4 p-4 sm:grid-cols-[96px_1fr_auto]">
              <div className="relative h-28 w-full rounded-md bg-panel sm:h-24">
                {product.image ? (
                  <Image src={product.image} alt={product.name} fill className="object-contain p-2" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <Package className="h-8 w-8" aria-hidden />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-black text-ink">{product.name}</p>
                <p className="text-xs font-bold uppercase text-signal">{product.brand}</p>
                <p className="mt-2 font-black">{formatKes(product.price)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button className="grid h-11 w-11 place-items-center rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => update(product.id, quantity, -1)} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-black">{quantity}</span>
                <button className="grid h-11 w-11 place-items-center rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => update(product.id, quantity, 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                <button className="grid h-11 w-11 place-items-center rounded-md border border-red-200 text-red-600 hover:bg-red-50" onClick={() => removeItem(product.id)} aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="h-fit rounded-lg border border-slate-300 bg-white p-5">
        <h2 className="text-lg font-black text-ink">Order summary</h2>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div>
          <div className="flex justify-between"><span>VAT estimate</span><strong>{formatKes(subtotal * 0.16)}</strong></div>
          <div className="border-t border-line pt-3 text-base font-black"><div className="flex justify-between"><span>Total</span><span>{formatKes(subtotal * 1.16)}</span></div></div>
        </div>
        <div className="mt-5 rounded bg-panel p-3">
          <p className="mb-2 text-xs font-bold uppercase text-slate-600">Checkout progress</p>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full w-1/3 rounded-full bg-signal" />
          </div>
          <p className="mt-2 text-xs text-slate-500">Step 1 of 3: Review cart</p>
        </div>
        <Link href="/checkout" className={items.length ? "mt-5 flex h-11 w-full items-center justify-center rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700" : "mt-5 flex h-11 w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-300 px-5 text-sm font-bold text-white"}>
          Proceed to checkout
        </Link>
      </aside>
    </div>
  );
}
