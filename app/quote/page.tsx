import type { Metadata } from "next";
import { QuoteForm } from "@/components/QuoteForm";
import { prisma } from "@/lib/prisma";
import { metadataForPage, PUBLIC_PRODUCT_WHERE } from "@/lib/seo";

export const metadata: Metadata = metadataForPage({
  title: "Printer Repair Nairobi and Service Quotes",
  description: "Request printer repair in Nairobi, office equipment maintenance, spare parts, installation or managed print support from Ceter Technologies Limited.",
  path: "/quote"
});

export default async function QuotePage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const params = await searchParams;
  const product = params.product
    ? await prisma.product.findFirst({
        where: { slug: params.product, ...PUBLIC_PRODUCT_WHERE },
        select: { id: true, name: true, sku: true }
      })
    : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-ink">{product ? "Request product quote" : "Service and quote request"}</h1>
        <p className="mt-2 text-sm text-slate-500">{product ? `Submit a quotation request for ${product.name}.` : "Submit service and procurement requests directly to the Ceter team."}</p>
      </div>
      <QuoteForm product={product} />
    </div>
  );
}
