"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Grid2X2 } from "lucide-react";
import { iconForCategory } from "@/lib/category-icons";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function FeaturedCategoriesMobile({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div ref={rootRef} className="sm:hidden">
      <div className="mb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex min-h-11 flex-1 items-center justify-between rounded-lg border border-slate-200 bg-white px-3 text-left text-[15px] font-bold text-ink shadow-sm focus-visible:ring-2 focus-visible:ring-accent/25"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          data-featured-categories-toggle
        >
          <span className="inline-flex min-w-0 items-center gap-2">
            <Grid2X2 className="h-5 w-5 shrink-0 text-signal" />
            <span>Featured Categories</span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} />
        </button>
        <Link href="/category" className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-1 text-sm font-semibold text-signal">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {open ? (
        <div id={panelId} className="max-h-[58svh] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm" data-featured-categories-panel>
          {categories.length ? categories.map((category) => {
            const Icon = iconForCategory(category.icon, category.slug);
            return (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex min-h-11 items-center gap-3 border-b border-slate-100 px-3 py-2 text-sm font-semibold text-ink last:border-b-0 hover:bg-teal-50/60 focus-visible:bg-teal-50"
                onClick={() => setOpen(false)}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-panel text-signal">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 whitespace-normal leading-5">{category.name}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
              </Link>
            );
          }) : (
            <p className="px-3 py-4 text-sm font-semibold text-slate-600">No categories available yet.</p>
          )}
          <Link
            href="/category"
            className="flex min-h-11 items-center justify-between bg-slate-50 px-3 py-2 text-sm font-bold text-signal hover:bg-teal-50 focus-visible:bg-teal-50"
            onClick={() => setOpen(false)}
          >
            View all categories
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
