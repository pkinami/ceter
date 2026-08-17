import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Barcode,
  BriefcaseBusiness,
  ClipboardCheck,
  Cpu,
  Handshake,
  Headphones,
  IdCard,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  Printer,
  ShieldCheck,
  ShoppingBag,
  Wrench
} from "lucide-react";
import { metadataForPage } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "About Ceter Technologies",
  description: "Learn about Ceter Technologies Limited, a Nairobi supplier of printers, photocopiers, toners, spare parts, office equipment, POS solutions and technology support.",
  path: "/about"
});

const values = [
  { icon: ShieldCheck, title: "Reliability", text: "We focus on dependable products, practical service options and clear communication for business technology needs." },
  { icon: ClipboardCheck, title: "Professionalism", text: "We support procurement, quotation and installation workflows with organized follow-up and realistic information." },
  { icon: Headphones, title: "Responsiveness", text: "We make it easy for customers to request quotes, ask product questions and follow up on support needs." },
  { icon: Handshake, title: "Customer focus", text: "We work around the needs of offices, institutions and organizations that depend on working equipment." }
] satisfies ProfileItem[];

const offers = [
  { icon: Printer, title: "Printers and photocopiers", text: "Office printers, photocopiers and multifunction devices for everyday document workflows." },
  { icon: PackageCheck, title: "Toners and consumables", text: "Toner, ink and related consumables for supported printer and copier models." },
  { icon: Wrench, title: "Printer spare parts", text: "Replacement parts and accessories to help extend equipment service life." },
  { icon: Barcode, title: "Barcode and POS solutions", text: "Barcode printers, label printing equipment and POS-related technology for operational environments." },
  { icon: IdCard, title: "ID card printing solutions", text: "ID card printer options and related consumables for organizations with card issuance needs." },
  { icon: ShoppingBag, title: "Office equipment", text: "Office technology products selected for business, institutional and administrative use." },
  { icon: Cpu, title: "IT and business technology solutions", text: "Technology support for organizations that need practical business systems and equipment advice." },
  { icon: Headphones, title: "Printer repair and maintenance services", text: "Repair, maintenance and service quotation support for printers, photocopiers and related equipment." }
] satisfies ProfileItem[];

const support = [
  { icon: BadgeCheck, title: "Professional support and installation", text: "Customers can request installation, setup and service support for equipment purchased or maintained through Ceter Technologies." },
  { icon: ClipboardCheck, title: "Procurement support", text: "We support quotation requests, product selection and procurement communication for businesses, offices and institutions." },
  { icon: Wrench, title: "After-sales service", text: "Our service approach includes follow-up for repair requests, maintenance needs, consumables and replacement parts." },
  { icon: BriefcaseBusiness, title: "Customer-focused approach", text: "We aim to match recommendations to the customer's operating environment, budget and workflow requirements." }
] satisfies ProfileItem[];

type ProfileItem = {
  icon: LucideIcon;
  title: string;
  text: string;
};

export default function AboutPage() {
  return (
    <main className="bg-mist">
      <section className="border-b border-line bg-ink text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase text-signal">Company profile</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl">Ceter Technologies Limited</h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200">
              Ceter Technologies Limited supplies office printing equipment, consumables, spare parts and business technology solutions for customers that need reliable office operations and practical support.
            </p>
          </div>
          <aside className="rounded-lg border border-white/10 bg-white/10 p-5">
            <h2 className="text-lg font-black text-white">Contact</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-200">
              <p className="flex items-center gap-3"><MapPin className="h-5 w-5 text-signal" /> Nairobi, Kenya</p>
              <a href="https://wa.me/254707143322" className="flex items-center gap-3 hover:text-white"><Phone className="h-5 w-5 text-signal" /> +254 707 143322</a>
              <a href="mailto:info@cetertechnologies.com" className="flex items-center gap-3 hover:text-white"><Mail className="h-5 w-5 text-signal" /> info@cetertechnologies.com</a>
            </div>
            <Link href="/quote" className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">
              Request a quote <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-black uppercase text-signal">Who we are</p>
            <h2 className="mt-2 text-3xl font-black text-ink">Technology supply and support for working organizations</h2>
          </div>
          <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
            <p className="text-[15px] leading-7 text-slate-700">
              Ceter Technologies serves businesses, institutions, offices and organizations requiring reliable technology solutions. The company focuses on office print environments, procurement support, consumables, replacement parts and related business technology needs.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-slate-700">
              Our customers need equipment that fits real office workflows, clear product information and support after purchase. Ceter Technologies is positioned to help with product selection, quotation requests, installation coordination, repair and maintenance enquiries, and ongoing consumables supply.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <StatementCard title="Our mission" text="To help organizations access dependable office equipment, consumables, spare parts and technology support that keep business operations moving." />
          <StatementCard title="Our vision" text="To be a trusted technology supply and support partner for businesses, institutions and offices that require practical, reliable and customer-focused solutions." />
        </section>

        <ProfileSection
          eyebrow="Our values"
          title="Principles that guide our work"
          description="Ceter Technologies keeps its service approach practical: accurate information, responsive support and solutions suited to the customer's operating needs."
          items={values}
          columns="lg:grid-cols-4"
        />

        <ProfileSection
          eyebrow="What we offer"
          title="Products and services"
          description="Our offering covers equipment supply, consumables, parts and service support for organizations that depend on office document and business technology systems."
          items={offers}
          columns="lg:grid-cols-4"
        />

        <ProfileSection
          eyebrow="Why choose Ceter Technologies"
          title="Support across the procurement and service cycle"
          description="Customers can engage Ceter Technologies before purchase, during installation and after equipment is in use."
          items={support}
          columns="lg:grid-cols-4"
        />
      </div>
    </main>
  );
}

function StatementCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <p className="mt-3 text-[15px] leading-7 text-slate-700">{text}</p>
    </article>
  );
}

function ProfileSection({
  eyebrow,
  title,
  description,
  items,
  columns
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: ProfileItem[];
  columns: string;
}) {
  return (
    <section>
      <div className="mb-5 max-w-3xl">
        <p className="text-xs font-black uppercase text-signal">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-black text-ink sm:text-3xl">{title}</h2>
        <p className="mt-3 text-[15px] leading-7 text-slate-600">{description}</p>
      </div>
      <div className={`grid gap-4 sm:grid-cols-2 ${columns}`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-50 text-signal">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-black text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
