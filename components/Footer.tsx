import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { BrandIcon, type BrandIconName } from "@/components/BrandIcon";

const socials = [
  { label: "WhatsApp +254 707 143322", icon: "whatsapp", href: "https://wa.me/254707143322" },
  { label: "Instagram @cetertechnologies", icon: "instagram", href: "https://www.instagram.com/cetertechnologies/" },
  { label: "X @cetertechnologies", icon: "x", href: "https://x.com/cetertechnologies" },
  { label: "Facebook @cetertechnologies", icon: "facebook", href: "https://www.facebook.com/cetertechnologies/" },
  { label: "TikTok @cetertechnologies", icon: "tiktok", href: "https://www.tiktok.com/@cetertechnologies" },
  { label: "Email info@cetertechnologies.com", icon: "email", href: "mailto:info@cetertechnologies.com" }
] satisfies Array<{ label: string; icon: BrandIconName; href: string }>;

const payments = [
  { label: "M-Pesa", icon: "mpesa", className: "h-6 w-auto" },
  { label: "Visa", icon: "visa", className: "h-6 w-auto" },
  { label: "Mastercard", icon: "mastercard", className: "h-6 w-auto" },
] satisfies Array<{ label: string; icon: BrandIconName; className: string }>;

const quickLinks = [
  { label: "Shop", href: "/category" },
  { label: "Service Quote", href: "/quote" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "mailto:info@cetertechnologies.com" }
];

const footerCategories = [
  { label: "Printers & Photocopiers", href: "/category/printers-and-photocopiers" },
  { label: "Toner, Ink & Consumables", href: "/category/toner-ink-and-consumables" },
  { label: "Printer Parts & Accessories", href: "/category/printer-parts-and-accessories" },
  { label: "Barcode, POS & ID Solutions", href: "/category/barcode-pos-and-id-solutions" },
  { label: "Office Equipment & Services", href: "/category/office-equipment-and-services" }
];

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <section className="border-b border-white/10 bg-ink">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 lg:grid-cols-[1fr_auto] lg:items-end lg:py-8">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-signal">NEWSLETTER</p>
            <h2 className="mt-1 text-[22px] font-bold leading-7 text-white sm:text-2xl">Get catalogue & procurement updates</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Product, pricing, and service updates from Ceter Technologies.</p>
          </div>
          <form className="flex w-full max-w-lg flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="footer-newsletter">Email address</label>
            <input id="footer-newsletter" name="email" type="email" autoComplete="email" placeholder="you@example.com" className="h-11 min-w-0 flex-1 rounded-md border border-white/15 bg-white px-3 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-teal-400/20" />
            <button type="button" className="h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Subscribe</button>
          </form>
        </div>
      </section>
      <section>
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-7 md:grid-cols-2 lg:grid-cols-[1.35fr_0.75fr_1fr_1fr] lg:gap-8 lg:py-10">
          <div>
            <Link href="/" className="inline-flex" aria-label="Ceter Technologies Limited home">
              <Image
                src="/ceter-logo-pack/lockup/ceter-logo-horizontal-reversed.svg"
                alt="Ceter Technologies Limited"
                width={240}
                height={58}
                className="h-10 w-auto sm:h-12"
              />
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-300">Photocopiers, printers, toners and inkjets, spare parts, and office print solutions in Nairobi.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Social links">
              {socials.map((social) => (
                <a key={social.label} href={social.href} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition hover:-translate-y-0.5 hover:text-white" aria-label={social.label} title={social.label}>
                  <BrandIcon name={social.icon} label={social.label} size={20} className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          <details className="group border-t border-white/10 pt-3 md:border-0 md:pt-0" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold uppercase text-white md:cursor-default">Quick links <span className="md:hidden">+</span></summary>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-1">
              {quickLinks.map((link) => <Link key={link.label} href={link.href} className="text-slate-300 hover:text-signal">{link.label}</Link>)}
            </div>
          </details>
          <details className="group border-t border-white/10 pt-3 md:border-0 md:pt-0" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold uppercase text-white md:cursor-default">Shop by category <span className="md:hidden">+</span></summary>
            <div className="mt-3 grid gap-2 text-sm">
              {footerCategories.map((category) => (
                <Link key={category.href} href={category.href} className="text-slate-300 hover:text-signal">{category.label}</Link>
              ))}
            </div>
          </details>
          <details className="group border-t border-white/10 pt-3 md:border-0 md:pt-0" open>
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-bold uppercase text-white md:cursor-default">Contact details <span className="md:hidden">+</span></summary>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <a href="https://wa.me/254707143322" className="flex items-center gap-2 hover:text-signal"><BrandIcon name="whatsapp" label="WhatsApp" size={18} className="h-4 w-4" /> +254 707 143322</a>
              <a href="mailto:info@cetertechnologies.com" className="flex items-center gap-2 hover:text-signal"><BrandIcon name="email" label="Email" size={18} className="h-4 w-4" /> info@cetertechnologies.com</a>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-signal" /> Nairobi, Kenya</p>
            </div>
            <div className="mt-4" aria-label="Accepted payment methods">
              <h4 className="text-sm font-bold uppercase text-white">Accepted Payments</h4>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                {payments.map((payment) => (
                  <span key={payment.label} className="inline-flex h-7 items-center justify-center" title={payment.label}>
                    <BrandIcon name={payment.icon} label={payment.label} size={58} className={payment.className} />
                  </span>
                ))}
              </div>
            </div>
          </details>
        </div>
      </section>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/privacy-policy" className="text-slate-300 hover:text-signal">Privacy Policy</Link>
            <span className="text-slate-500">|</span>
            <Link href="/terms-conditions" className="text-slate-300 hover:text-signal">Terms and Conditions</Link>
          </div>
          <p>&copy; 2026 Ceter Technologies Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
