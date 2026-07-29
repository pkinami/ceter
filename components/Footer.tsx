import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Music2, Phone } from "lucide-react";

const socials = [
  { label: "Instagram @cetertechnologies", icon: Instagram, href: "#" },
  { label: "TikTok @cetertechnologies", icon: Music2, href: "#" },
  { label: "X @cetertechnologies", icon: null, href: "#" },
  { label: "Facebook @cetertechnologies", icon: Facebook, href: "#" }
];

const quickLinks = [
  { label: "Shop", href: "/category" },
  { label: "Service Quote", href: "/quote" },
  { label: "Admin", href: "/admin" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "mailto:info@cetertechnologies.com" }
];

const footerCategories = [
  "Photocopiers",
  "Printers",
  "Toners & Inkjets",
  "Copy Printers",
  "Printer Spare Parts",
  "Printer & Office Services/Solutions"
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
            <p className="text-lg font-black uppercase tracking-normal text-white">CETER TECHNOLOGIES LIMITED</p>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Photocopiers, printers, toners and inkjets, spare parts, and office print solutions in Nairobi.</p>
            <div className="mt-5 flex gap-2">
            {socials.map((social) => {
              const Icon = social.icon;
              return (
                <a key={social.label} href={social.href} className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-sm text-slate-200 hover:bg-signal hover:text-white" aria-label={social.label} title={social.label}>
                  {Icon ? <Icon className="h-4 w-4" /> : "X"}
                </a>
              );
            })}
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
                <Link key={category} href={`/category?category=${encodeURIComponent(category)}`} className="text-slate-300 hover:text-signal">{category}</Link>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase text-white">Contact details</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <a href="https://wa.me/254707143322" className="flex items-center gap-2 hover:text-signal"><Phone className="h-4 w-4 text-signal" /> +254 707 143322</a>
              <a href="mailto:info@cetertechnologies.com" className="flex items-center gap-2 hover:text-signal"><Mail className="h-4 w-4 text-signal" /> info@cetertechnologies.com</a>
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-signal" /> Nairobi, Kenya</p>
            </div>
          </div>
        </div>
      </section>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <Link href="#" className="hover:text-signal">Privacy Policy</Link>
            <Link href="#" className="hover:text-signal">Terms and Conditions</Link>
          </div>
          <p>© 2026 Ceter Technologies Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
