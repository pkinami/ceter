"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrandIcon } from "@/components/BrandIcon";
import { useCart } from "@/components/CartProvider";
import { ProductImageFrame } from "@/components/ProductImageFrame";
import { calculateOrderTotal, taxCopy } from "@/lib/pricing";
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
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const submissionInProgress = useRef(false);
  const checkoutKey = useRef(crypto.randomUUID());
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = fulfillmentMethod === "delivery" ? deliveryFees.find((fee) => fee.value === deliveryRegion && fee.isEnabled)?.feeKes ?? 0 : 0;
  const totals = calculateOrderTotal({ subtotalKes: subtotal, deliveryFeeKes: deliveryFee });

  async function submit() {
    if (submissionInProgress.current) return;
    submissionInProgress.current = true;
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          checkoutKey: checkoutKey.current,
          fulfillmentMethod,
          phone,
          items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
          delivery: {
            name,
            phone,
            email,
            region: deliveryRegion,
            location: deliveryLocation,
            instructions: deliveryInstructions
          }
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Checkout could not start.");
      try {
        await clearCart();
      } catch {
        // The order response is authoritative; cart cleanup failing must not imply checkout failed.
        toast.warning("Your order was placed, but the saved cart could not be cleared.");
      }
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }
      router.push(`/order-confirmation/${data.orderId}${data.paymentId ? `?paymentId=${data.paymentId}` : ""}`);
    } catch (caught) {
      if (caught instanceof TypeError || caught instanceof SyntaxError) {
        setOutcomeUnknown(true);
        setError("We couldn’t confirm whether your order was placed because the connection was interrupted. Contact us before trying again.");
      } else {
        setError(caught instanceof Error ? caught.message : "Checkout could not start.");
      }
    } finally {
      submissionInProgress.current = false;
      setLoading(false);
    }
  }

  function continueStep() {
    if (step === 1 && (!name.trim() || !/^\S+@\S+\.\S+$/.test(email) || phone.trim().length < 9)) {
      setError("Enter your name, a valid email address, and phone number to continue.");
      return;
    }
    setError(null);
    setStep((current) => (current + 1) as 1 | 2 | 3);
  }

  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_340px]">
      <section className="rounded-lg border border-[#DDE8EE] bg-white p-5 shadow-[0_1px_2px_rgba(11,30,57,0.04)]">
        <h1 className="text-2xl font-black text-ink">Checkout</h1>
        <p className="mt-1 text-sm text-slate-500">Confirm delivery details and choose a payment method.</p>
        <ol className="mt-4 grid grid-cols-3 gap-2 text-xs font-bold sm:text-sm" aria-label="Checkout progress">
          {["Contact and Delivery", "Payment", "Review and Place Order"].map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={`rounded-md px-2 py-3 text-center ${step === index + 1 ? "bg-ink text-white" : step > index + 1 ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-600"}`}>{index + 1}. {label}</li>)}
        </ol>
        {error ? <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert"><p>{error}</p></div> : null}
        {step === 1 ? <>
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
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-700">
              {fulfillmentMethod === "delivery" ? "Delivery name" : "Your name"}
              <input id="checkout-delivery-name" name="name" autoComplete="name" placeholder="Full name" required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Phone number
              <input id="checkout-phone" name="phone" type="tel" autoComplete="tel" placeholder="Mobile number" required value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Email address
              <input id="checkout-email" name="email" type="email" autoComplete="email" placeholder="Email for order updates" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            {fulfillmentMethod === "delivery" ? <label className="block text-sm font-bold text-slate-700">
              Delivery region
              <select id="checkout-delivery-region" name="delivery_region" autoComplete="address-level1" value={deliveryRegion} onChange={(event) => setDeliveryRegion(event.target.value as DeliveryRegion)} className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:border-signal focus:outline-none">
                {deliveryFees.map((region) => <option key={region.value} value={region.value} disabled={!region.isEnabled}>{region.label} - {region.isEnabled ? formatKes(region.feeKes) : "Unavailable"}</option>)}
              </select>
            </label> : null}
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              Delivery address
              <input id="checkout-delivery-location" name="delivery_location" autoComplete="street-address" value={deliveryLocation} onChange={(event) => setDeliveryLocation(event.target.value)} placeholder="Street, building, estate, town, or pickup point" className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
            </label>
            <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
              Delivery instructions
              <textarea id="checkout-delivery-instructions" name="delivery_instructions" autoComplete="off" value={deliveryInstructions} onChange={(event) => setDeliveryInstructions(event.target.value)} placeholder="Gate code, floor, landmark, or preferred delivery time" rows={3} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-signal focus:outline-none" />
            </label>
          </div>

        </> : null}
        {step === 2 ? <>
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
              id="checkout-mpesa-phone"
              name="mpesa_phone"
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="07XX XXX XXX"
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none"
            />
          </label>
        ) : null}
        </> : null}
        {step === 3 ? <>
        <h2 className="mt-7 text-lg font-black text-ink">Review and place order</h2>
        <p className="mt-2 text-sm text-slate-600">Check your delivery and payment selections in the order summary before placing your order.</p>
        <button
          type="button"
          disabled={loading || outcomeUnknown || !items.length}
          aria-busy={loading}
          onClick={submit}
          className="mt-6 min-h-11 w-full rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {loading ? "Placing order..." : method === "mpesa" ? "Pay with M-Pesa" : method === "card" ? "Continue to card payment" : "Confirm Pay on Delivery order"}
        </button>
        </> : null}
        <div className="mt-6 flex gap-3">
          {step > 1 ? <button type="button" disabled={loading} onClick={() => setStep((current) => (current - 1) as 1 | 2 | 3)} className="min-h-11 rounded-md border border-slate-300 px-5 text-sm font-bold text-ink disabled:opacity-60">Back</button> : null}
          {step < 3 ? <button type="button" onClick={continueStep} className="min-h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Continue to {step === 1 ? "Payment" : "Review"}</button> : null}
        </div>
      </section>
      <aside className="sticky top-4 h-fit rounded-lg border border-[#DDE8EE] bg-white p-5 shadow-[0_1px_2px_rgba(11,30,57,0.04)]">
        <h2 className="text-lg font-black text-ink">Order summary</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2"><BrandIcon name="mpesa" label="M-Pesa" size={42} className="h-5 w-auto" /></span>
          <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2"><BrandIcon name="visa" label="Visa" size={42} className="h-5 w-auto" /></span>
          <span className="inline-flex h-8 items-center rounded-md border border-line bg-white px-2"><BrandIcon name="mastercard" label="Mastercard" size={42} className="h-5 w-auto" /></span>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          {items.map((item) => (
            <div key={item.product.id} className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
              <ProductImageFrame src={item.product.image} alt="" sizes="64px" className="h-16 w-16" imageClassName="p-1.5" />
              <span className="min-w-0 break-words">{item.product.name} x {item.quantity}</span>
              <strong className="col-start-2 whitespace-nowrap text-left sm:col-auto sm:text-right">{formatKes(item.product.price * item.quantity)}</strong>
            </div>
          ))}
          <div className="border-t border-line pt-3">
            <div className="flex justify-between"><span>{totals.mode === "inclusive" ? "Items total" : "Subtotal"}</span><strong>{formatKes(totals.subtotalKes)}</strong></div>
            <div className="mt-2 flex justify-between"><span>{taxCopy(totals.mode, totals.vatRate)}</span><strong>{formatKes(totals.vatKes)}</strong></div>
            <div className="mt-2 flex justify-between"><span>Delivery</span><strong>{formatKes(deliveryFee)}</strong></div>
            <div className="mt-3 flex justify-between text-base font-black"><span>Total</span><span>{formatKes(totals.payableKes)}</span></div>
          </div>
        </div>
      </aside>
    </div>
  );
}
