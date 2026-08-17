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
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-normal text-signal">NEWSLETTER</p>
            <h2 className="mt-2 text-2xl font-black text-white">Get catalogue & procurement updates</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Product, pricing, and service updates from Ceter Technologies.</p>
          </div>
          <form className="flex w-full max-w-lg flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="footer-newsletter">Email address</label>
            <input id="footer-newsletter" type="email" placeholder="Email address" className="h-11 min-w-0 flex-1 rounded-md border border-white/15 bg-white px-3 text-sm text-ink outline-none focus:border-signal focus:ring-2 focus:ring-teal-400/20" />
            <button type="button" className="h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Subscribe</button>
          </form>
        </div>
      </section>
      <section>
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-2 lg:grid-cols-[1.35fr_0.75fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex" aria-label="Ceter Technologies Limited home">
              <Image
                src="/ceter-logo-pack/lockup/ceter-logo-horizontal-reversed.svg"
                alt="Ceter Technologies Limited"
                width={240}
                height={58}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Photocopiers, printers, toners and inkjets, spare parts, and office print solutions in Nairobi.</p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5" aria-label="Social links">
              {socials.map((social) => (
                <a key={social.label} href={social.href} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-200 transition hover:-translate-y-0.5 hover:text-white" aria-label={social.label} title={social.label}>
                  <BrandIcon name={social.icon} label={social.label} size={20} className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white">Quick links</h3>
            <div className="mt-4 grid gap-2 text-sm">
              {quickLinks.map((link) => <Link key={link.label} href={link.href} className="text-slate-300 hover:text-signal">{link.label}</Link>)}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white">Shop by category</h3>
            <div className="mt-4 grid gap-2 text-sm">
              {footerCategories.map((category) => (
                <Link key={category.href} href={category.href} className="text-slate-300 hover:text-signal">{category.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white">Contact details</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <a href="https://wa.me/254707143322" className="flex items-center gap-2 hover:text-signal"><BrandIcon name="whatsapp" label="WhatsApp" size={18} className="h-4 w-4" /> +254 707 143322</a>
              <a href="mailto:info@cetertechnologies.com" className="flex items-center gap-2 hover:text-signal"><BrandIcon name="email" label="Email" size={18} className="h-4 w-4" /> info@cetertechnologies.com</a>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-signal" /> Nairobi, Kenya</p>
            </div>
            <div className="mt-6" aria-label="Accepted payment methods">
              <h4 className="text-sm font-black uppercase text-white">Accepted Payment Methods</h4>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
                {payments.map((payment) => (
                  <span key={payment.label} className="inline-flex h-7 items-center justify-center" title={payment.label}>
                    <BrandIcon name={payment.icon} label={payment.label} size={58} className={payment.className} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
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
