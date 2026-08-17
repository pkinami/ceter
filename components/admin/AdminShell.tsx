"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Boxes,
  Building2,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Home,
  ImageIcon,
  ListTodo,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Tags,
  UploadCloud,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOutAction } from "@/app/actions";

type AdminShellProps = {
  children: React.ReactNode;
  session: { name: string | null; email: string | null };
};

const navGroups: Array<{ label: string; items: Array<{ href: string; label: string; icon: LucideIcon }> }> = [
  { label: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/products", label: "Products", icon: Package },
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/brands", label: "Brands", icon: Building2 },
      { href: "/admin/import", label: "Import Centre", icon: UploadCloud }
    ]
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/pricing", label: "Pricing & Cost", icon: FileSpreadsheet },
      { href: "/admin/inventory", label: "Inventory", icon: Boxes }
    ]
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
      { href: "/admin/quotes", label: "Quotes & Tenders", icon: FileText },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/payments", label: "Payments", icon: CreditCard }
    ]
  },
  {
    label: "Store",
    items: [
      { href: "/admin/banners", label: "Banners & Storefront", icon: ImageIcon },
      { href: "/admin/homepage", label: "Homepage", icon: Home },
      { href: "/admin/services", label: "Services", icon: ListTodo },
      { href: "/admin/reports", label: "Reports", icon: FileBarChart },
      { href: "/admin/settings", label: "Store Settings", icon: Settings },
      { href: "/admin/users", label: "Users & Roles", icon: ShieldCheck }
    ]
  }
];

export function AdminShell({ children, session }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [autoCollapse, setAutoCollapse] = useState(true);

  return (
    <div className={`admin-ui ${autoCollapse ? "admin-auto-collapse" : "admin-pinned"}`}>
      {mobileOpen ? <button className="admin-mobile-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <header className="admin-topbar">
        <div className="admin-logo-zone">
          <button className="admin-btn admin-icon-btn admin-mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation">
            <Menu className="h-4 w-4" />
          </button>
          <Link href="/admin" className="admin-logo-link" aria-label="Ceter admin dashboard">
            <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal-reversed.svg" alt="Ceter Technologies" width={210} height={43} priority />
          </Link>
        </div>
        <div className="admin-global-zone">
          <form action="/admin/products" className="admin-global-search">
            <Search className="admin-search-symbol" />
            <input name="q" placeholder="Search products, SKU, MPN, brand or category" />
          </form>
          <div className="admin-top-spacer" />
          <label className="admin-collapse-option" title="Auto-collapse sidebar">
            <input type="checkbox" checked={autoCollapse} onChange={(event) => setAutoCollapse(event.target.checked)} />
            <span className={`admin-toggle ${autoCollapse ? "on" : ""}`} />
            Auto-collapse
          </label>
          <Link href="/" className="admin-top-chip admin-store-link">
            <Home className="h-3.5 w-3.5" />
            Storefront
          </Link>
          <div className="admin-top-account" title={session.email ?? "Admin"}>
            <div className="admin-top-avatar">{initials(session.name ?? session.email ?? "Admin")}</div>
            <span>{session.name ?? "Admin"}</span>
          </div>
        </div>
      </header>
      <aside className={`admin-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <nav className="admin-sidebar-scroll">
          {navGroups.map((group) => (
            <div key={group.label} className="admin-nav-group">
              <div className="admin-nav-group-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} title={item.label} className={`admin-nav-item ${active ? "active" : ""}`}>
                    <span className="admin-nav-icon"><Icon /></span>
                    <span className="admin-nav-label">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
          <form action={signOutAction} className="admin-nav-logout">
            <button className="admin-nav-item danger">
              <span className="admin-nav-icon"><LogOut /></span>
              <span className="admin-nav-label">Logout</span>
            </button>
          </form>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-page">{children}</div>
      </main>
    </div>
  );
}

function initials(value: string) {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "A";
}
