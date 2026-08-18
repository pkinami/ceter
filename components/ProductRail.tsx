import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/ProductCard";

export function ProductRail({
  title,
  href,
  products,
  emptyMessage = "No products available yet."
}: {
  title: string;
  href: string;
  products: Product[];
  emptyMessage?: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[21px] font-bold leading-7 text-ink sm:text-[22px]">{title}</h2>
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-signal">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {products.length ? (
        <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          <div className="grid auto-cols-[minmax(218px,78vw)] grid-flow-col gap-3 scroll-smooth snap-x snap-proximity sm:auto-cols-[minmax(220px,42vw)] md:auto-cols-[minmax(230px,31vw)] lg:auto-cols-[minmax(230px,24%)]">
            {products.map((product) => (
              <div key={product.id} className="snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600">{emptyMessage}</p>
      )}
    </section>
  );
}
