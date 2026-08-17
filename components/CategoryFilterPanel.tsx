"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Package, SlidersHorizontal, X } from "lucide-react";
import { buildCategoryTree } from "@/lib/category-tree";
import { iconForCategory } from "@/lib/category-icons";
import type { Category } from "@/lib/types";
import { cn, formatKes } from "@/lib/utils";

export function CategoryFilterPanel({ categories, brands }: { categories: Category[]; brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedCategoryPath, setExpandedCategoryPath] = useState<string[]>([]);
  const selectedBrand = searchParams.get("brand") ?? "";
  const selectedCategory = searchParams.get("category") ?? "";
  const selectedCondition = searchParams.get("condition") ?? "";
  const selectedStock = searchParams.get("stock") ?? "";
  const price = Number(searchParams.get("maxPrice") ?? 450000);

  const activeFilterCount = Number(Boolean(selectedBrand)) + Number(Boolean(selectedCategory)) + Number(Boolean(selectedCondition)) + Number(Boolean(selectedStock)) + Number(price !== 450000);
  const categoryTree = buildCategoryTree(categories);

  useEffect(() => {
    if (!drawerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  function updateFilter(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
  }

  const content = (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-sm font-black uppercase text-ink">
          <Package className="h-4 w-4 text-signal" /> Categories
        </div>
        <nav className="mt-3 space-y-1">
          {categoryTree.map((category) => {
            const Icon = iconForCategory(category.icon, category.slug);
            return (
              <CategoryBranch
                key={category.id}
                category={category}
                expandedPath={expandedCategoryPath}
                icon={<Icon className="h-4 w-4 text-signal" />}
                onToggle={setExpandedCategoryPath}
              />
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
          <select value={selectedCategory} autoComplete="off" onChange={(event) => updateFilter("category", event.target.value || null)} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm">
            <option value="">All categories</option>
            {flattenOptions(categoryTree).map((category) => <option key={category.id} value={category.slug}>{`${"  ".repeat(category.depth ?? 0)}${category.name}`}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="text-sm font-bold text-slate-700">Brand</legend>
          <div className="mt-2 grid grid-cols-1 gap-1">
            {brands.map((brand) => (
              <label key={brand} className={cn("flex cursor-pointer items-center gap-2 rounded px-2.5 py-1.5 text-sm text-slate-600 hover:bg-teal-50 hover:text-signal", selectedBrand === brand && "bg-teal-50 text-signal")}>
                <input type="checkbox" checked={selectedBrand === brand} onChange={() => updateFilter("brand", selectedBrand === brand ? null : brand)} className="h-4 w-4 accent-teal-700" /> {brand}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block text-sm font-bold text-slate-700">
          Price range
          <input type="range" autoComplete="off" min="10000" max="450000" step="5000" value={price} onChange={(event) => updateFilter("maxPrice", event.target.value === "450000" ? null : event.target.value)} className="mt-3 w-full accent-teal-700" />
          <span className="mt-1 block text-xs font-semibold text-slate-500">Up to {formatKes(price)}</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["new", "refurbished"].map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selectedCondition === item} onChange={() => updateFilter("condition", selectedCondition === item ? null : item)} className="accent-teal-700" /> <span className="capitalize">{item}</span>
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={selectedStock === "in_stock"} onChange={() => updateFilter("stock", selectedStock === "in_stock" ? null : "in_stock")} className="accent-teal-700" /> In stock
          </label>
        </div>
        <button type="button" onClick={() => router.push(pathname)} className="flex h-10 w-full items-center justify-center rounded-md border border-slate-300 bg-white text-sm font-bold text-ink hover:bg-slate-50">
          Clear filters
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
              className="absolute bottom-0 left-0 right-0 max-h-[86dvh] overflow-y-auto rounded-t-lg bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-industrial"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Filters and categories"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black uppercase text-ink">Filters & Categories</p>
                <button className="grid h-11 w-11 place-items-center rounded-md border border-slate-300 hover:bg-slate-50" onClick={() => setDrawerOpen(false)} aria-label="Close filters and categories">
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

function CategoryBranch({
  category,
  expandedPath,
  icon,
  onToggle
}: {
  category: Category;
  expandedPath: string[];
  icon?: ReactNode;
  onToggle: (path: string[]) => void;
}) {
  const depth = category.depth ?? 0;
  const children = category.children ?? [];
  const canExpand = children.length > 0 && depth < 2;
  const childPath = expandedPath.slice(0, depth + 1);
  const isExpanded = canExpand && childPath[depth] === category.id;

  function toggle() {
    if (!canExpand) return;
    if (isExpanded) onToggle(expandedPath.slice(0, depth));
    else onToggle([...expandedPath.slice(0, depth), category.id].slice(0, 2));
  }

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-1">
        <Link
          href={`/category/${category.slug}`}
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border-l-2 border-transparent px-2.5 py-2 text-sm font-semibold text-slate-700 hover:border-signal hover:bg-teal-50 hover:text-ink",
            depth === 1 && "pl-6 text-xs",
            depth === 2 && "pl-9 text-xs font-medium"
          )}
        >
          {icon}
          <span className="truncate">{category.name}</span>
        </Link>
        {canExpand ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-teal-50 hover:text-signal"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </button>
        ) : <span aria-hidden="true" className="h-11 w-11" />}
      </div>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            className="mt-1 space-y-0.5 border-l border-line pl-1"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {children.map((child) => (
              <CategoryBranch
                key={child.id}
                category={{ ...child, depth: depth + 1 }}
                expandedPath={expandedPath}
                onToggle={onToggle}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function flattenOptions(categories: Category[], depth = 0): Category[] {
  return categories.flatMap((category) => {
    const current = { ...category, depth };
    return [current, ...flattenOptions(category.children ?? [], depth + 1)];
  });
}
