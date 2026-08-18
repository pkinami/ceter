"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Mail, MapPin, Phone, X } from "lucide-react";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const selectedBrand = searchParams.get("brand") ?? "";
  const visibleBrands = showAllBrands ? brands : brands.slice(0, 6);

  useEffect(() => setPortalReady(true), []);

  useEffect(() => {
    if (!mobileOpen) return;
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [mobileOpen]);

  function toggleBrand(brand: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (selectedBrand === brand) params.delete("brand");
    else params.set("brand", brand);
    router.push(`/category${params.toString() ? `?${params}` : ""}`);
    onClose?.();
  }

  const content = (
    <nav className="space-y-1.5">
      {categoryTree.map((category) => {
        const Icon = iconForCategory(category.icon, category.slug);
        return (
        <CategoryBranch
          key={category.id}
          category={category}
          expandedPath={expandedCategoryPath}
          icon={<Icon className="h-4 w-4 text-signal" />}
          onToggle={setExpandedCategoryPath}
          onNavigate={onClose}
        />
      );})}
      <div className="mt-3 border-t border-line pt-3">
        <p className="px-3 text-xs font-bold uppercase text-slate-500">Printer brands</p>
        <div className="mt-2 grid grid-cols-1 gap-1">
          {visibleBrands.map((brand) => (
            <Tooltip key={brand} label={`Filter printers by ${brand}`}>
              <label className={cn("flex min-h-8 cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-xs font-medium leading-4 text-slate-600 hover:bg-teal-50 hover:text-signal", selectedBrand === brand && "bg-teal-50 text-signal")}>
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
          {brands.length > 6 ? (
            <button type="button" onClick={() => setShowAllBrands((value) => !value)} className="min-h-8 rounded px-3 py-1.5 text-left text-xs font-semibold text-signal hover:bg-teal-50">
              {showAllBrands ? "Show less" : `Show more (${brands.length - 6})`}
            </button>
          ) : null}
        </div>
      </div>
      <div className="mt-4 border-t border-line pt-4 lg:hidden">
        <p className="px-3 text-xs font-bold uppercase text-slate-500">Contact Ceter</p>
        <div className="mt-2 grid gap-1 text-sm font-semibold text-slate-700">
          <a href="https://maps.google.com/?q=Nairobi%2C%20Kenya" className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 hover:bg-teal-50 hover:text-signal">
            <MapPin className="h-4 w-4 text-signal" /> Nairobi, Kenya
          </a>
          <a href="tel:+254707143322" className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 hover:bg-teal-50 hover:text-signal">
            <Phone className="h-4 w-4 text-signal" /> +254 707 143322
          </a>
          <a href="https://wa.me/254707143322" className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 hover:bg-teal-50 hover:text-signal">
            <span className="grid h-4 w-4 place-items-center rounded-sm bg-green-600 text-[10px] font-black text-white">W</span> WhatsApp
          </a>
          <a href="mailto:info@cetertechnologies.com" className="flex min-h-11 items-center gap-2 rounded-md px-3 py-2 hover:bg-teal-50 hover:text-signal">
            <Mail className="h-4 w-4 text-signal" /> info@cetertechnologies.com
          </a>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      <aside className={cn("sticky top-[96px] hidden max-h-[calc(100dvh-104px)] w-[232px] shrink-0 overflow-y-auto overflow-x-hidden border-r border-line bg-white p-3 lg:block", drawerOnly && "lg:hidden")}>{content}</aside>
      {portalReady ? createPortal(<AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 touch-none bg-slate-950/40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            onPointerDown={(event) => {
              if (event.target === event.currentTarget) onClose?.();
            }}
          >
            <motion.aside
              id="mobile-category-drawer"
              className="absolute bottom-0 left-0 right-0 mx-auto flex max-h-[calc(100dvh-0.75rem)] w-full max-w-[100dvw] flex-col overflow-hidden rounded-t-lg bg-white shadow-industrial"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onPointerDown={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Categories"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
                <p className="text-sm font-black uppercase text-ink">Categories</p>
                <button ref={closeButtonRef} className="grid h-11 w-11 place-items-center rounded-md border border-slate-300" onClick={onClose} aria-label="Close categories">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                {content}
              </div>
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>, document.body) : null}
    </>
  );
}

const CategoryBranch = memo(function CategoryBranch({
  category,
  expandedPath,
  icon,
  onToggle,
  onNavigate
}: {
  category: Category;
  expandedPath: string[];
  icon?: ReactNode;
  onToggle: (path: string[]) => void;
  onNavigate?: () => void;
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
            onClick={onNavigate}
            className={cn(
              "flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md border-l-2 border-transparent px-3 py-1.5 text-sm font-semibold leading-5 text-slate-700 hover:border-signal hover:bg-teal-50 hover:text-ink",
              depth === 1 && "pl-7 text-xs",
              depth === 2 && "pl-10 text-xs font-medium"
            )}
          >
            {icon}
            <span className="line-clamp-2 min-w-0 whitespace-normal">{category.name}</span>
          </Link>
        </Tooltip>
        {canExpand ? (
          <button
            type="button"
            onClick={toggle}
            aria-expanded={isExpanded}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-teal-50 hover:text-signal"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </button>
        ) : <span aria-hidden="true" className="h-9 w-9" />}
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
                onNavigate={onNavigate}
              />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});
