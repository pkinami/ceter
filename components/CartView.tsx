"use client";

import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { AsyncButton } from "@/components/AsyncButton";
import { useCart } from "@/components/CartProvider";
import { createClient } from "@/lib/supabase/client";
import { formatKes } from "@/lib/utils";

export function CartView() {
  const { items, loading, updateItem, removeItem, clearCart } = useCart();
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  async function update(id: string, currentQuantity: number, direction: number) {
    await updateItem(id, Math.max(1, currentQuantity + direction));
  }

  async function checkout() {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      throw new Error("Sign in to create an order");
    }
    if (!items.length) {
      throw new Error("Your cart is empty");
    }

    const totalKes = Math.round(subtotal * 1.16);
    const { data: order, error } = await supabase.from("orders").insert({
      user_id: user.id,
      status: "pending",
      payment_method: null,
      total_kes: totalKes
    }).select("id").single();

    if (error || !order) throw new Error("Could not create order");

    const { error: itemError } = await supabase.from("order_items").insert(items.map((item) => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_purchase_kes: item.product.price
    })));

    if (itemError) throw new Error("Order item creation failed");

    await clearCart();
    window.location.href = "/account#orders";
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-line p-4">
          <h1 className="text-2xl font-black text-ink">Cart</h1>
          <p className="text-sm text-slate-500">Review saved cart items before creating a pending order.</p>
        </div>
        <div className="divide-y divide-line">
          {loading ? <p className="p-4 text-sm font-semibold text-slate-500">Loading cart...</p> : null}
          {!loading && !items.length ? <p className="p-4 text-sm font-semibold text-slate-500">Your cart is empty.</p> : null}
          {items.map(({ product, quantity }) => (
            <div key={product.id} className="grid gap-4 p-4 sm:grid-cols-[96px_1fr_auto]">
              <div className="relative h-24 rounded-md bg-panel">
                <Image src={product.image} alt={product.name} fill className="object-contain p-2" />
              </div>
              <div>
                <p className="text-sm font-black text-ink">{product.name}</p>
                <p className="text-xs font-bold uppercase text-signal">{product.brand}</p>
                <p className="mt-2 font-black">{formatKes(product.price)}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-md border border-slate-300 p-2 hover:bg-slate-50" onClick={() => update(product.id, quantity, -1)} aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center font-black">{quantity}</span>
                <button className="rounded-md border border-slate-300 p-2 hover:bg-slate-50" onClick={() => update(product.id, quantity, 1)} aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
                <button className="rounded-md border border-red-200 p-2 text-red-600 hover:bg-red-50" onClick={() => removeItem(product.id)} aria-label="Remove item"><Trash2 className="h-4 w-4" /></button>
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
        <AsyncButton className="mt-5 w-full" successMessage="Pending order created" errorMessage="Checkout could not start. Please retry." onAction={checkout}>
          Proceed to checkout
        </AsyncButton>
      </aside>
    </div>
  );
}
