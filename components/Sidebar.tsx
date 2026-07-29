"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Droplets, Package, Printer, ScanLine, Settings, Tags, X } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "@/components/Tooltip";
import { cn } from "@/lib/utils";

const categoryIcons = [Printer, ScanLine, Droplets, Settings, Tags, CreditCard];

export function Sidebar({
  mobileOpen,
  onClose,
  drawerOnly = false,
  categories,
  brands
}: {
  mobileOpen?: boolean;
  onClose?: () => void;
  drawerOnly?: boolean;
  categories: string[];
  brands: string[];
}) {
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["Kyocera"]);

  function toggleBrand(brand: string) {
    setSelectedBrands((current) => current.includes(brand) ? current.filter((item) => item !== brand) : [...current, brand]);
  }

  const content = (
    <nav className="space-y-2">
      {categories.map((category, index) => {
        const Icon = categoryIcons[index] ?? Package;
        return (
        <Tooltip key={category} label={`Browse ${category}`}>
          <Link href={`/category?category=${encodeURIComponent(category)}`} className="flex w-full items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-signal hover:bg-teal-50 hover:text-ink">
            <Icon className="h-4 w-4 text-signal" />
            <span>{category}</span>
          </Link>
        </Tooltip>
      );})}
      <div className="mt-4 border-t border-line pt-4">
        <p className="px-3 text-xs font-bold uppercase text-slate-500">Printer brands</p>
        <div className="mt-2 grid grid-cols-1 gap-1">
          {brands.map((brand) => (
            <Tooltip key={brand} label={`Filter printers by ${brand}`}>
              <label className={cn("flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-xs font-medium text-slate-600 hover:bg-teal-50 hover:text-signal", selectedBrands.includes(brand) && "bg-teal-50 text-signal")}>
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(brand)}
                  onChange={() => toggleBrand(brand)}
                  className="h-4 w-4 accent-teal-600"
                />
                {brand}
              </label>
            </Tooltip>
          ))}
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <aside className={cn("hidden w-64 shrink-0 border-r border-line bg-white p-4 lg:block", drawerOnly && "lg:hidden")}>{content}</aside>
      <AnimatePresence>
        {mobileOpen ? (
          <motion.div className="fixed inset-0 z-50 bg-slate-950/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
            <motion.aside
              className="absolute bottom-0 left-0 right-0 max-h-[82vh] rounded-t-lg bg-white p-4 shadow-industrial"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black uppercase text-ink">Categories</p>
                <button className="rounded-md border border-slate-300 p-2" onClick={onClose} aria-label="Close categories">
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
