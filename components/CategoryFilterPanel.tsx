"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Droplets, Package, Printer, ScanLine, Settings, SlidersHorizontal, Tags, X } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { cn } from "@/lib/utils";

const categoryIcons = [Printer, ScanLine, Droplets, Settings, Tags, CreditCard];

export function CategoryFilterPanel({ categories, brands }: { categories: string[]; brands: string[] }) {
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["Kyocera"]);
  const [conditionFilters, setConditionFilters] = useState<string[]>([]);
  const [price, setPrice] = useState(200000);

  const activeFilterCount = selectedBrands.length + conditionFilters.length + (price !== 200000 ? 1 : 0);

  function toggleBrand(brand: string) {
    setSelectedBrands((current) => current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand]);
  }

  function toggleCondition(condition: string) {
    setConditionFilters((current) => current.includes(condition) ? current.filter((item) => item !== condition) : [...current, condition]);
  }

  async function applyFilters() {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    setLoading(false);
    toast.success("Filters applied");
  }

  const content = (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-black uppercase text-ink">
          <Package className="h-4 w-4 text-signal" /> Categories
        </div>
        <nav className="mt-3 space-y-1">
          {categories.map((category, index) => {
            const Icon = categoryIcons[index] ?? Package;
            return (
              <Link
                key={category}
                href={`/category?category=${encodeURIComponent(category)}`}
                className="flex items-center gap-2 rounded-md border-l-2 border-transparent px-2.5 py-2 text-sm font-semibold text-slate-700 hover:border-signal hover:bg-teal-50 hover:text-ink"
              >
                <Icon className="h-4 w-4 text-signal" />
                <span>{category}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t border-line pt-5">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-ink">
          <SlidersHorizontal className="h-4 w-4 text-signal" /> Filters
        </div>
        <label className="block text-sm font-bold text-slate-700">
          Category
          <select className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option>All categories</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-bold text-slate-700">Brand</legend>
          <div className="mt-2 grid grid-cols-1 gap-1">
            {brands.map((brand) => (
              <label key={brand} className={cn("flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm text-slate-600 hover:bg-teal-50 hover:text-signal", selectedBrands.includes(brand) && "bg-teal-50 text-signal")}>
                <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} className="h-4 w-4 accent-teal-700" /> {brand}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold text-slate-700">
          Price range
          <input type="range" min="10000" max="450000" value={price} onChange={(event) => setPrice(Number(event.target.value))} className="mt-3 w-full accent-teal-700" />
          <span className="mt-1 block text-xs font-semibold text-slate-500">Up to Ksh {price.toLocaleString("en-KE")}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["New", "Refurbished", "In stock"].map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={conditionFilters.includes(item)} onChange={() => toggleCondition(item)} className="accent-teal-700" /> {item}
            </label>
          ))}
        </div>
        <button onClick={applyFilters} disabled={loading} className="flex h-10 w-full items-center justify-center rounded-md bg-ink text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-70">
          {loading ? <LoadingSpinner /> : "Apply filters"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="mb-4 inline-flex h-11 items-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white shadow-sm hover:bg-slate-800 lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters & Categories
        {activeFilterCount > 0 ? <span className="rounded-full bg-signal px-2 py-0.5 text-xs text-white">{activeFilterCount}</span> : null}
      </button>
      <aside className="hidden w-full max-w-[220px] shrink-0 rounded-lg border border-slate-300 bg-white p-3 lg:block">
        {content}
      </aside>
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawerOpen(false)}>
            <motion.aside
              className="absolute bottom-0 left-0 right-0 max-h-[86vh] overflow-y-auto rounded-t-lg bg-white p-4 shadow-industrial"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black uppercase text-ink">Filters & Categories</p>
                <button className="rounded-md border border-slate-300 p-2 hover:bg-slate-50" onClick={() => setDrawerOpen(false)} aria-label="Close filters and categories">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {content}
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
