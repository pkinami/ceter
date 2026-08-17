import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ChevronDown, Mail, Phone } from "lucide-react";
import type { ReactNode } from "react";

export type LegalDocument = {
  title: string;
  label: string;
  description: string;
  company: string;
  effectiveDate: string;
  lastReviewed: string;
  sections: LegalSection[];
};

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

export function LegalDocumentLayout({ document }: { document: LegalDocument }) {
  const tocLabel = `${document.title} contents`;

  return (
    <main className="bg-mist">
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <div className="flex flex-col gap-5 border-b border-white/10 pb-8 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="inline-flex w-fit" aria-label="Ceter Technologies Limited home">
              <Image
                src="/ceter-logo-pack/lockup/ceter-logo-horizontal-reversed.svg"
                alt="Ceter Technologies Limited"
                width={260}
                height={63}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 w-fit items-center gap-2 rounded-md border border-white/15 bg-white/10 px-4 text-sm font-bold text-white hover:border-signal hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to homepage
            </Link>
          </div>

          <div className="grid gap-8 py-10 lg:grid-cols-[1fr_340px] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase text-signal">{document.label}</p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                {document.title}
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">{document.description}</p>
            </div>
            <aside className="rounded-lg border border-white/10 bg-white/10 p-5 shadow-industrial">
              <p className="text-xs font-black uppercase text-signal">Document status</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-md bg-white px-4 py-3 text-ink">
                  <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-500">
                    <CalendarDays className="h-4 w-4 text-signal" />
                    Effective date
                  </div>
                  <p className="mt-1 text-sm font-black">{document.effectiveDate}</p>
                </div>
                <div className="rounded-md border border-white/10 bg-ink/30 px-4 py-3">
                  <p className="text-xs font-black uppercase text-slate-300">Last updated</p>
                  <p className="mt-1 text-sm font-bold text-white">{document.lastReviewed}</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-white lg:hidden">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <details className="group rounded-lg border border-line bg-mist">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-black text-ink">
              Table of contents
              <ChevronDown className="h-4 w-4 text-signal group-open:rotate-180" />
            </summary>
            <nav className="grid gap-1 border-t border-line px-3 py-3 text-sm" aria-label={tocLabel}>
              {document.sections.map((section) => (
                <TocLink key={section.id} section={section} />
              ))}
            </nav>
          </details>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[300px_1fr] lg:items-start lg:py-10">
        <aside className="hidden rounded-lg border border-line bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:block">
          <h2 className="text-sm font-black uppercase text-ink">Table of contents</h2>
          <nav className="mt-3 grid gap-1 text-sm" aria-label={tocLabel}>
            {document.sections.map((section) => (
              <TocLink key={section.id} section={section} />
            ))}
          </nav>
        </aside>

        <article className="legal-document space-y-5">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-28 rounded-lg border border-line bg-white p-5 shadow-sm sm:p-7">
              <h2>{section.title}</h2>
              <div className="mt-5">{section.content}</div>
            </section>
          ))}

          <ContactCard />
        </article>
      </section>
    </main>
  );
}

function TocLink({ section }: { section: LegalSection }) {
  return (
    <a href={`#${section.id}`} className="rounded-md px-3 py-2 font-semibold text-slate-600 hover:bg-teal-50 hover:text-signal">
      {section.title.replace(/^\d+\.\s*/, "")}
    </a>
  );
}

function ContactCard() {
  return (
    <section className="rounded-lg border border-line bg-ink p-5 text-white shadow-industrial sm:p-7">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <p className="text-xs font-black uppercase text-signal">Contact information</p>
          <h2 className="mt-2 text-2xl font-black text-white">Ceter Technologies Limited</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            For questions about this document, orders, quotations or support requests, contact Ceter Technologies through the channels below.
          </p>
        </div>
        <Link href="/" className="inline-flex h-11 w-fit items-center gap-2 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">
          <ArrowLeft className="h-4 w-4" />
          Back to homepage
        </Link>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <a href="mailto:info@cetertechnologies.com" className="flex items-center gap-3 rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:border-signal">
          <Mail className="h-5 w-5 text-signal" />
          info@cetertechnologies.com
        </a>
        <a href="https://wa.me/254707143322" className="flex items-center gap-3 rounded-md border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-white hover:border-signal">
          <Phone className="h-5 w-5 text-signal" />
          +254 707 143 322
        </a>
      </div>
    </section>
  );
}
