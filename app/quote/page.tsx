import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";

export const metadata: Metadata = {
  title: "Service and Quote Request",
  description: "Request printer service, parts, installation or managed print support from Ceter Technologies Limited."
};

export default function QuotePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-ink">Service and quote request</h1>
        <p className="mt-2 text-sm text-slate-500">Submit service and procurement requests directly to the Ceter team.</p>
      </div>
      <QuoteForm />
    </div>
  );
}
