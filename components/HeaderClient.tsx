"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, Search, ShoppingCart, X } from "lucide-react";
import { FormEvent, Suspense, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Tooltip } from "@/components/Tooltip";
import { Sidebar } from "@/components/Sidebar";
import { AuthMenu } from "@/components/AuthMenu";
import { BrandIcon } from "@/components/BrandIcon";
import { useCart } from "@/components/CartProvider";
import type { Category } from "@/lib/types";

export function HeaderClient({ categories, brands }: { categories: Category[]; brands: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const { items } = useCart();
  const cartQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get("q") ?? "").trim();
    setQuery(value);
    window.location.href = value ? `/category?q=${encodeURIComponent(value)}` : "/category";
  }

  function clearSearch() {
    setQuery("");
    window.location.href = "/category";
  }

  const searchInput = (className: string) => (
    <>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={className}
        placeholder="Search toners, models, parts..."
        aria-label="Search products"
      />
      {query ? (
        <Tooltip label="Clear search">
          <button type="button" onClick={clearSearch} className="absolute right-12 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        </Tooltip>
      ) : null}
      <Tooltip label="Search products">
        <button type="submit" className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-md bg-signal text-white hover:bg-teal-700" aria-label="Search products">
          <Search className="h-4 w-4" />
        </button>
      </Tooltip>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <TopBar />
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 lg:grid-cols-[240px_1fr_auto]">
        <div className="flex items-center gap-3">
          <Tooltip label="Open categories">
            <button className="rounded-md border border-slate-300 p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open categories">
              <Menu className="h-5 w-5" />
            </button>
          </Tooltip>
          <Link href="/" className="inline-flex items-center leading-tight" aria-label="Ceter Technologies Limited home">
            <Image
              src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg"
              alt="Ceter Technologies Limited"
              width={210}
              height={50}
              priority
              className="h-10 w-auto"
            />
          </Link>
        </div>
        <form className="relative hidden sm:block" onSubmit={submitSearch}>
          {searchInput("h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-24 text-sm font-medium text-slate-950 placeholder:text-slate-500 outline-none focus:border-signal focus:ring-2 focus:ring-teal-100")}
        </form>
        <div className="flex items-center justify-end gap-4">
          <nav className="hidden items-center gap-4 text-sm font-bold text-slate-600 lg:flex">
            <Link href="/category" className="hover:text-signal">Catalog</Link>
            <Link href="/quote" className="hover:text-signal">Service Quote</Link>
            <Link href="/about" className="hover:text-signal">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Tooltip label="WhatsApp Ceter Technologies">
              <a href="https://wa.me/254707143322" className="hidden h-11 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 md:inline-flex">
                <BrandIcon name="whatsapp" label="WhatsApp" size={18} className="h-4 w-4" /> WhatsApp
              </a>
            </Tooltip>
            <Tooltip label="View cart">
              <Link href="/cart" className="relative rounded-md border border-slate-300 p-2.5 hover:bg-slate-50" aria-label={`Cart${cartQuantity ? ` with ${cartQuantity} items` : ""}`}>
                <ShoppingCart className="h-5 w-5" />
                {cartQuantity > 0 ? (
                  <span className="absolute -right-2 -top-2 grid min-h-5 min-w-5 place-items-center rounded-full bg-signal px-1.5 text-[11px] font-black leading-none text-white shadow">
                    {cartQuantity > 99 ? "99+" : cartQuantity}
                  </span>
                ) : null}
              </Link>
            </Tooltip>
            <AuthMenu />
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 pb-3 sm:hidden">
        <form className="relative block" onSubmit={submitSearch}>
          {searchInput("h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-24 text-sm font-medium text-slate-950 placeholder:text-slate-500 outline-none focus:border-signal focus:ring-2 focus:ring-teal-100")}
        </form>
      </div>
      <Suspense fallback={null}>
        <Sidebar categories={categories} brands={brands} mobileOpen={open} onClose={() => setOpen(false)} drawerOnly />
      </Suspense>
    </header>
  );
}
