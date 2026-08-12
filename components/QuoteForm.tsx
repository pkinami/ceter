"use client";

import { FormEvent, ReactNode, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Send } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";

type FormState = {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
};

const initialState: FormState = { name: "", email: "", phone: "", service: "", message: "" };

export function QuoteForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const refs = {
    name: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    service: useRef<HTMLSelectElement>(null),
    message: useRef<HTMLTextAreaElement>(null)
  };

  function validate() {
    const next: Partial<FormState> = {};
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
    const supabase = createClient();
    const { error } = await supabase.from("quote_requests").insert({
      name: form.name,
      email: form.email,
      phone: form.phone,
      service_needed: form.service,
      message: form.message,
      status: "new"
    });
    if (error) {
      setStatus("idle");
      toast.error("Quote request could not be submitted");
      return;
    }
    setStatus("success");
    toast.success("Quote request submitted");
    window.setTimeout(() => {
      setForm(initialState);
      setStatus("idle");
    }, 1200);
  }

  function field<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-slate-300 bg-white p-5 shadow-sm" aria-live="polite">
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="quote-name" label="Name" error={errors.name}>
          <input ref={refs.name} id="quote-name" aria-describedby={errors.name ? "quote-name-error" : undefined} value={form.name} onChange={(event) => field("name", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </Field>
        <Field id="quote-email" label="Email" error={errors.email}>
          <input ref={refs.email} id="quote-email" aria-describedby={errors.email ? "quote-email-error" : undefined} value={form.email} onChange={(event) => field("email", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </Field>
        <Field id="quote-phone" label="Phone" error={errors.phone}>
          <input ref={refs.phone} id="quote-phone" aria-describedby={errors.phone ? "quote-phone-error" : undefined} value={form.phone} onChange={(event) => field("phone", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </Field>
        <Field id="quote-service" label="Service needed" error={errors.service}>
          <select ref={refs.service} id="quote-service" aria-describedby={errors.service ? "quote-service-error" : undefined} value={form.service} onChange={(event) => field("service", event.target.value)} className="h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none">
            <option value="">Select service</option>
            <option>Printer repair</option>
            <option>Photocopier installation</option>
            <option>Toner supply</option>
            <option>Spare parts</option>
            <option>Managed print service</option>
          </select>
        </Field>
      </div>
      <Field id="quote-message" label="Message" error={errors.message} className="mt-4">
        <textarea ref={refs.message} id="quote-message" aria-describedby={errors.message ? "quote-message-error" : undefined} value={form.message} onChange={(event) => field("message", event.target.value)} rows={6} className="w-full rounded-md border border-slate-300 px-3 py-3 text-sm focus:border-signal focus:outline-none" />
      </Field>
      <div className="mt-5 rounded bg-panel p-3">
        <p className="mb-2 text-xs font-bold uppercase text-slate-600">Submission progress</p>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full bg-signal transition-all duration-200 ${status === "idle" ? "w-1/3" : status === "loading" ? "w-2/3" : "w-full"}`} />
        </div>
      </div>
      <button disabled={status === "loading"} className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-signal px-5 text-sm font-bold text-white disabled:opacity-70">
        {status === "loading" ? <LoadingSpinner /> : status === "success" ? <CheckCircle2 className="h-4 w-4" /> : <><Send className="h-4 w-4" /> Submit request</>}
      </button>
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
