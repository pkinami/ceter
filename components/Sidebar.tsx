"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/Tooltip";
import { buildCategoryTree } from "@/lib/category-tree";
import { iconForCategory } from "@/lib/category-icons";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  categories: Category[];
  brands: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedCategoryPath, setExpandedCategoryPath] = useState<string[]>([]);
  const categoryTree = buildCategoryTree(categories);
  const selectedBrand = searchParams.get("brand") ?? "";

  function toggleBrand(brand: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedBrand === brand) params.delete("brand");
    else params.set("brand", brand);
    router.push(`/category${params.toString() ? `?${params}` : ""}`);
    onClose?.();
  }

  const content = (
    <nav className="space-y-2">
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
      );})}
      <div className="mt-4 border-t border-line pt-4">
        <p className="px-3 text-xs font-bold uppercase text-slate-500">Printer brands</p>
        <div className="mt-2 grid grid-cols-1 gap-1">
          {brands.map((brand) => (
            <Tooltip key={brand} label={`Filter printers by ${brand}`}>
              <label className={cn("flex cursor-pointer items-center gap-2 rounded px-3 py-2 text-xs font-medium text-slate-600 hover:bg-teal-50 hover:text-signal", selectedBrand === brand && "bg-teal-50 text-signal")}>
                <input
                  type="checkbox"
                  checked={selectedBrand === brand}
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
              className="absolute bottom-0 left-0 right-0 max-h-[82dvh] overflow-y-auto rounded-t-lg bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-industrial"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.22 }}
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Categories"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-black uppercase text-ink">Categories</p>
                <button className="grid h-11 w-11 place-items-center rounded-md border border-slate-300" onClick={onClose} aria-label="Close categories">
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
  const isExpanded = canExpand && expandedPath[depth] === category.id;

  function toggle() {
    if (!canExpand) return;
    if (isExpanded) onToggle(expandedPath.slice(0, depth));
    else onToggle([...expandedPath.slice(0, depth), category.id].slice(0, 2));
  }

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-1">
        <Tooltip label={`Browse ${category.name}`}>
          <Link
            href={`/category/${category.slug}`}
            className={cn(
              "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-signal hover:bg-teal-50 hover:text-ink",
              depth === 1 && "pl-7 text-xs",
              depth === 2 && "pl-10 text-xs font-medium"
            )}
          >
            {icon}
            <span className="truncate">{category.name}</span>
          </Link>
        </Tooltip>
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
