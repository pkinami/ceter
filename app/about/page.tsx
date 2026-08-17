import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, Phone, Wrench, PackageCheck, Printer } from "lucide-react";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "About Ceter Technologies",
  description: "Learn about Ceter Technologies, a Nairobi supplier of printers, photocopiers, toners, spare parts and office print support for Kenyan organizations.",
  path: "/about"
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <section className="grid gap-8 rounded-lg border border-slate-300 bg-white p-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-black uppercase text-signal">Nairobi office print supplier</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-ink">Ceter Technologies Limited</h1>
          <p className="mt-4 text-slate-600">
            Ceter Technologies Limited supplies office printing equipment, consumables, spare parts and service solutions for organizations that need dependable document workflows.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Printer, label: "Printers and copiers" },
              { icon: PackageCheck, label: "Toners and parts" },
              { icon: Wrench, label: "Service solutions" }
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-slate-300 bg-panel p-4">
                <item.icon className="h-5 w-5 text-signal" />
                <p className="mt-3 text-sm font-black text-white">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <aside className="rounded-lg bg-ink p-5 text-white">
          <h2 className="text-xl font-black">Contact</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-200">
            <p className="flex gap-3"><MapPin className="h-5 w-5 text-teal-300" /> Nairobi, Kenya</p>
            <p className="flex gap-3"><Phone className="h-5 w-5 text-teal-300" /> +254 707 143322</p>
            <p className="flex gap-3"><Mail className="h-5 w-5 text-teal-300" /> info@cetertechnologies.com</p>
          </div>
          <Link href="/quote" className="mt-6 inline-flex h-11 items-center rounded-md bg-white px-5 text-sm font-bold text-ink hover:bg-slate-100">Request service</Link>
        </aside>
      </section>
    </div>
  );
}
