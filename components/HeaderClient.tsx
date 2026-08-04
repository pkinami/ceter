"use client";

import Link from "next/link";
import { Menu, Search, ShoppingCart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { TopBar } from "@/components/TopBar";
import { Tooltip } from "@/components/Tooltip";
import { Sidebar } from "@/components/Sidebar";
import { AuthMenu } from "@/components/AuthMenu";

export function HeaderClient({ categories, brands }: { categories: string[]; brands: string[] }) {
  const [open, setOpen] = useState(false);

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
          <Link href="/" className="leading-tight">
            <span className="block text-lg font-black tracking-normal text-ink">Ceter Technologies</span>
            <span className="hidden text-xs font-semibold uppercase text-slate-500 sm:block">Limited</span>
          </Link>
        </div>
        <label className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-950 placeholder:text-slate-500 outline-none focus:border-signal focus:ring-2 focus:ring-teal-100"
            placeholder="Search toners, models, parts..."
          />
        </label>
        <div className="flex items-center justify-end gap-4">
          <nav className="hidden items-center gap-4 text-sm font-bold text-slate-600 lg:flex">
            <Link href="/category" className="hover:text-signal">Catalog</Link>
            <Link href="/quote" className="hover:text-signal">Service Quote</Link>
            <Link href="/about" className="hover:text-signal">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Tooltip label="WhatsApp Ceter Technologies">
              <a href="https://wa.me/254707143322" className="hidden h-11 items-center gap-2 rounded-md bg-green-600 px-4 text-sm font-bold text-white hover:bg-green-700 md:inline-flex">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Tooltip>
            <Tooltip label="View cart">
              <Link href="/cart" className="rounded-md border border-slate-300 p-2.5 hover:bg-slate-50" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
              </Link>
            </Tooltip>
            <AuthMenu />
          </div>
        </div>
      </div>
      <div className="border-t border-line px-4 pb-3 sm:hidden">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-4 text-sm font-medium text-slate-950 placeholder:text-slate-500 outline-none focus:border-signal focus:ring-2 focus:ring-teal-100" placeholder="Search toners, models, parts..." />
        </label>
      </div>
      <Sidebar categories={categories} brands={brands} mobileOpen={open} onClose={() => setOpen(false)} drawerOnly />
    </header>
  );
}
