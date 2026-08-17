"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandIcon } from "@/components/BrandIcon";
import { useCart } from "@/components/CartProvider";
import { formatKes } from "@/lib/utils";

type PaymentMethod = "mpesa" | "card" | "pay_on_delivery";
type FulfillmentMethod = "delivery" | "pickup";
type DeliveryRegion = "within_nairobi" | "around_nairobi" | "countrywide";

type DeliveryFee = {
  value: DeliveryRegion;
  label: string;
  feeKes: number;
  isEnabled: boolean;
};

type DefaultProfile = {
  full_name: string | null;
  phone: string | null;
  email: string | null;
  delivery_region: DeliveryRegion | null;
  delivery_location: string | null;
  delivery_instructions: string | null;
};

export function CheckoutForm({ defaultProfile, deliveryFees }: { defaultProfile: DefaultProfile; deliveryFees: DeliveryFee[] }) {
  const router = useRouter();
  const { items, clearCart } = useCart();
  const firstEnabledRegion = deliveryFees.find((fee) => fee.isEnabled)?.value ?? "within_nairobi";
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>("delivery");
  const [name, setName] = useState(defaultProfile.full_name ?? "");
  const [phone, setPhone] = useState(defaultProfile.phone ?? "");
  const [email, setEmail] = useState(defaultProfile.email ?? "");
  const [deliveryRegion, setDeliveryRegion] = useState<DeliveryRegion>(defaultProfile.delivery_region ?? firstEnabledRegion);
  const [deliveryLocation, setDeliveryLocation] = useState(defaultProfile.delivery_location ?? "");
  const [deliveryInstructions, setDeliveryInstructions] = useState(defaultProfile.delivery_instructions ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const vat = Math.round(subtotal * 0.16);
  const deliveryFee = fulfillmentMethod === "delivery" ? deliveryFees.find((fee) => fee.value === deliveryRegion && fee.isEnabled)?.feeKes ?? 0 : 0;
  const total = subtotal + vat + deliveryFee;

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          fulfillmentMethod,
          phone,
          delivery: fulfillmentMethod === "delivery" ? {
            name,
            phone,
            email,
            region: deliveryRegion,
            location: deliveryLocation,
            instructions: deliveryInstructions
          } : null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Checkout could not start.");
      await clearCart();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      router.push(`/order-confirmation/${data.orderId}${data.paymentId ? `?paymentId=${data.paymentId}` : ""}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Checkout could not start.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <section className="rounded-lg border border-[#DDE8EE] bg-white p-5 shadow-[0_1px_2px_rgba(11,30,57,0.04)]">
        <h1 className="text-2xl font-black text-ink">Checkout</h1>
        <p className="mt-1 text-sm text-slate-500">Confirm delivery details and choose a payment method.</p>
        {error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFulfillmentMethod("delivery")}
            className={fulfillmentMethod === "delivery" ? "rounded-lg border-2 border-signal bg-teal-50/70 p-4 text-left" : "rounded-lg border border-slate-300 bg-white p-4 text-left hover:border-teal-200 hover:bg-teal-50/40"}
          >
            <span className="block font-black text-ink">Delivery</span>
            <span className="mt-1 block text-sm text-slate-600">Send this order to your selected Kenyan delivery region.</span>
          </button>
          <button
            type="button"
            onClick={() => setFulfillmentMethod("pickup")}
            className={fulfillmentMethod === "pickup" ? "rounded-lg border-2 border-signal bg-teal-50/70 p-4 text-left" : "rounded-lg border border-slate-300 bg-white p-4 text-left hover:border-teal-200 hover:bg-teal-50/40"}
          >
            <span className="block font-black text-ink">Pickup / arrange later</span>
            <span className="mt-1 block text-sm text-slate-600">No physical or business address is required.</span>
          </button>
        </div>
        {fulfillmentMethod === "delivery" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              Delivery name
              <input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Phone
              <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Delivery region
              <select value={deliveryRegion} onChange={(event) => setDeliveryRegion(event.target.value as DeliveryRegion)} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-signal focus:outline-none">
                {deliveryFees.map((region) => <option key={region.value} value={region.value} disabled={!region.isEnabled}>{region.label} - {region.isEnabled ? formatKes(region.feeKes) : "Unavailable"}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              Location / address details
              <input value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value)} placeholder="Estate, building, road, town, or pickup point details" className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              Delivery instructions
              <textarea value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-signal focus:outline-none" />
            </label>
          </div>
        ) : null}

        <h2 className="mt-7 text-lg font-black text-ink">Payment</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setMethod("mpesa")}
            className={method === "mpesa" ? "rounded-lg border-2 border-signal bg-teal-50/70 p-4 text-left shadow-[inset_0_1px_0_rgba(20,184,166,0.12)]" : "rounded-lg border border-slate-300 bg-white p-4 text-left hover:border-teal-200 hover:bg-teal-50/40"}
          >
            <BrandIcon name="mpesa" label="M-Pesa" size={54} className="h-7 w-auto" />
            <span className="mt-3 block font-black text-ink">Pay with M-Pesa</span>
            <span className="mt-1 block text-sm text-slate-600">Fast and securely with your Mpesa account.</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod("card")}
            className={method === "card" ? "rounded-lg border-2 border-signal bg-teal-50/70 p-4 text-left shadow-[inset_0_1px_0_rgba(20,184,166,0.12)]" : "rounded-lg border border-slate-300 bg-white p-4 text-left hover:border-teal-200 hover:bg-teal-50/40"}
          >
            <div className="flex items-center gap-2">
              <BrandIcon name="visa" label="Visa" size={42} className="h-6 w-auto" />
              <BrandIcon name="mastercard" label="Mastercard" size={42} className="h-6 w-auto" />
            </div>
            <span className="mt-3 block font-black text-ink">Pay with bank card</span>
            <span className="mt-1 block text-sm text-slate-600">Fast and secure payment.</span>
          </button>
          <button
            type="button"
            onClick={() => setMethod("pay_on_delivery")}
            className={method === "pay_on_delivery" ? "rounded-lg border-2 border-signal bg-teal-50/70 p-4 text-left shadow-[inset_0_1px_0_rgba(20,184,166,0.12)]" : "rounded-lg border border-slate-300 bg-white p-4 text-left hover:border-teal-200 hover:bg-teal-50/40"}
          >
            <span className="block font-black text-ink">Pay on Delivery</span>
            <span className="mt-1 block text-sm text-slate-600">Confirm now and pay when the order is delivered.</span>
          </button>
        </div>
        {method === "mpesa" ? (
          <label className="mt-5 block text-sm font-bold text-slate-700">
            M-Pesa phone number
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="07XXXXXXXX"
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none"
            />
          </label>
        ) : null}
        <button
          type="button"
          disabled={loading || !items.length}
          onClick={submit}
          className="mt-6 h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Placing order..." : method === "mpesa" ? "Pay with M-Pesa" : method === "card" ? "Continue to card payment" : "Confirm Pay on Delivery order"}
        </button>
      </section>
      <aside className="h-fit rounded-lg border border-[#DDE8EE] bg-white p-5 shadow-[0_1px_2px_rgba(11,30,57,0.04)]">
        <h2 className="text-lg font-black text-ink">Order summary</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2"><BrandIcon name="mpesa" label="M-Pesa" size={42} className="h-5 w-auto" /></span>
          <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2"><BrandIcon name="visa" label="Visa" size={42} className="h-5 w-auto" /></span>
          <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2"><BrandIcon name="mastercard" label="Mastercard" size={42} className="h-5 w-auto" /></span>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <div key={item.product.id} className="flex justify-between gap-3">
              <span>{item.product.name} x {item.quantity}</span>
              <strong>{formatKes(item.product.price * item.quantity)}</strong>
            </div>
          ))}
          <div className="border-t border-line pt-3">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatKes(subtotal)}</strong></div>
            <div className="mt-2 flex justify-between"><span>VAT estimate</span><strong>{formatKes(subtotal * 0.16)}</strong></div>
            <div className="mt-2 flex justify-between"><span>Delivery</span><strong>{formatKes(deliveryFee)}</strong></div>
            <div className="mt-3 flex justify-between text-base font-black"><span>Total</span><span>{formatKes(total)}</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
