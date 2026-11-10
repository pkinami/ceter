"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

type FormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
  quantity: number;
};
type FormErrors = Partial<Record<keyof FormState, string>>;

const initialState: FormState = { name: "", email: "", phone: "", service: "", message: "", quantity: 1 };

export function QuoteForm({ product }: { product?: { id: string; name: string; sku?: string | null } | null }) {
  const [form, setForm] = useState<FormState>({
    ...initialState,
    service: product ? "Product quotation" : "",
    message: product ? `Please quote ${product.name}${product.sku ? ` (${product.sku})` : ""}.` : ""
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [reference, setReference] = useState<string | null>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    service: useRef<HTMLSelectElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
    quantity: useRef<HTMLInputElement>(null)
  };

  function validate() {
    const next: FormErrors = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email";
    if (form.phone.trim().length < 9) next.phone = "Enter a valid phone number";
    if (!form.service) next.service = "Select a service";
    if (form.message.trim().length < 10) next.message = "Message must be at least 10 characters";
    setErrors(next);
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      const firstInvalid = Object.keys(validationErrors)[0] as keyof FormState | undefined;
      toast.error("Please fix the highlighted fields");
      if (firstInvalid) refs[firstInvalid].current?.focus();
      return;
    }
    setStatus("loading");
    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          service: form.service,
          message: form.message,
          productId: product?.id,
          quantity: form.quantity
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Quote request could not be submitted");
      setStatus("success");
      setReference(typeof data.reference === "string" ? data.reference : typeof data.quoteRequestId === "string" ? data.quoteRequestId : null);
      toast.success("Quote request submitted");
    } catch (error) {
      setStatus("idle");
      toast.error(error instanceof Error ? error.message : "Quote request could not be submitted. Check your connection and try again.");
    }
  }

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm" aria-live="polite">
      {status === "success" ? <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900" role="status"><h2 className="text-lg font-black">Your quote request is in</h2><p className="mt-2 text-sm">Our team will review your request and contact you using the details provided.</p>{reference ? <p className="mt-2 text-sm font-bold">Reference: {reference}</p> : null}<p className="mt-2 text-sm">You can continue browsing while we prepare your response.</p></div> : null}
      {status !== "success" ? <>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="quote-name" label="Full name" error={errors.name}>
          <input ref={refs.name} id="quote-name" name="name" autoComplete="name" placeholder="Your full name" aria-describedby={errors.name ? "quote-name-error" : undefined} value={form.name} onChange={(event) => field("name", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </Field>
        <Field id="quote-email" label="Email address" error={errors.email}>
          <input ref={refs.email} id="quote-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" aria-describedby={errors.email ? "quote-email-error" : undefined} value={form.email} onChange={(event) => field("email", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </Field>
        <Field id="quote-phone" label="Phone number" error={errors.phone}>
          <input ref={refs.phone} id="quote-phone" name="phone" type="tel" autoComplete="tel" placeholder="Your mobile number" aria-describedby={errors.phone ? "quote-phone-error" : undefined} value={form.phone} onChange={(event) => field("phone", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </Field>
        <Field id="quote-service" label="Service needed" error={errors.service}>
          <select ref={refs.service} id="quote-service" name="service" autoComplete="off" aria-describedby={errors.service ? "quote-service-error" : undefined} value={form.service} onChange={(event) => field("service", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none">
            <option value="">Select service</option>
            <option>Product quotation</option>
            <option>Printer repair</option>
            <option>Photocopier installation</option>
            <option>Toner supply</option>
            <option>Spare parts</option>
            <option>Managed print service</option>
          </select>
        </Field>
        {product ? (
          <Field id="quote-quantity" label="Quantity" error={errors.quantity}>
            <input ref={refs.quantity} id="quote-quantity" name="quantity" type="number" autoComplete="off" min="1" value={form.quantity} onChange={(event) => field("quantity", Math.max(1, Number(event.target.value) || 1))} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </Field>
        ) : null}
      </div>
      <Field id="quote-message" label="What do you need?" error={errors.message} className="mt-4">
        <textarea ref={refs.message} id="quote-message" name="message" autoComplete="off" placeholder="Briefly describe the product or service you need" aria-describedby={errors.message ? "quote-message-error" : undefined} value={form.message} onChange={(event) => field("message", event.target.value)} rows={3} className="w-full rounded-md border border-slate-300 px-3 py-3 text-sm focus:border-signal focus:outline-none" />
        <details className="mt-2 text-xs text-slate-600"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Optional details and examples</summary><p>For example: model number, quantity, delivery location, preferred service date, or symptoms of a fault.</p></details>
      </Field>
      {status === "loading" ? <p className="mt-5 flex items-center gap-2 text-sm text-slate-700" role="status" aria-live="polite"><LoadingSpinner label="Submitting quotation request" />Submitting your quotation request…</p> : null}
      <button disabled={status === "loading"} aria-busy={status === "loading"} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-signal px-5 text-sm font-bold text-white disabled:opacity-70">
        {status === "loading" ? <LoadingSpinner /> : <><Send className="h-4 w-4" /> Submit request</>}
      </button>
      </> : null}
    </form>
  );
}

function Field({ id, label, error, children, className }: { id: string; label: string; error?: string; children: ReactNode; className?: string }) {
  return (
    <label className={className ? `block ${className}` : "block"}>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <span className="mt-2 block">{children}</span>
      {error ? <span id={`${id}-error`} className="mt-1 block text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}
