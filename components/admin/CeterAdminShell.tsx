"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Boxes,
  Building2,
  ChevronRight,
  CreditCard,
  FileArchive,
  FileBarChart,
  Home,
  Landmark,
  LogOut,
  Menu,
  PackagePlus,
  Paintbrush,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  UserRoundCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { adminModules } from "@/lib/admin/modules";

type CeterAdminShellProps = {
  children: React.ReactNode;
  session: { name: string | null; email: string | null };
};

const icons: Record<string, LucideIcon> = {
  dashboard: Home,
  inventory: Boxes,
  sales: ShoppingCart,
  customers: Users,
  transactions: CreditCard,
  purchases: Truck,
  expenses: Receipt,
  accounting: Landmark,
  reports: FileBarChart,
  users: ShieldCheck,
  "sales-people": UserRoundCog,
  branches: Building2,
  customization: Paintbrush,
  billing: WalletCards,
  settings: Settings,
  etims: BookOpen,
  storefront: Store,
  documents: FileArchive
};

export function CeterAdminShell({ children, session }: CeterAdminShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = useMemo(() => {
    return adminModules.reduce<Array<{ label: string; items: typeof adminModules }>>((acc, item) => {
      const group = acc.find((entry) => entry.label === item.group);
      if (group) group.items.push(item);
      else acc.push({ label: item.group, items: [item] });
      return acc;
    }, []);
  }, []);

  return (
    <div className="ceter-admin">
      <header className="ceter-admin-header">
        <div className="ceter-admin-header-brand">
          <button className="ceter-admin-icon-button ceter-admin-mobile-trigger" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <Link href="/admin" className="ceter-admin-logo" aria-label="Ceter Technologies admin">
            <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies" width={190} height={39} priority />
          </Link>
        </div>
        <form action="/admin/products" className="ceter-admin-search">
          <Search size={17} />
          <label className="sr-only" htmlFor="ceter-admin-search">Search products</label>
          <input id="ceter-admin-search" name="q" type="search" placeholder="Search products, SKU, MPN, customer or document" autoComplete="off" />
        </form>
        <div className="ceter-admin-header-actions">
          <Link className="ceter-admin-top-action" href="/admin/business?tab=sales">
            <PackagePlus size={16} />
            Create
          </Link>
          <button className="ceter-admin-bell" type="button" aria-label="Notifications" disabled>
            <Bell size={18} />
            <span>0</span>
          </button>
          <Link href="/" className="ceter-admin-company">
            <span>{initials(session.name ?? session.email ?? "Admin")}</span>
            <strong>{session.name ?? "Ceter Admin"}</strong>
          </Link>
        </div>
      </header>

      {mobileOpen ? <button className="ceter-admin-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`ceter-admin-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="ceter-admin-sidebar-top">
          <Image src="/ceter-logo-pack/icon/ceter-icon.svg" alt="" width={34} height={34} />
          <button className="ceter-admin-icon-button ceter-admin-close" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav aria-label="Ceter admin modules">
          {groups.map((group) => (
            <section key={group.label} className="ceter-admin-nav-group">
              <div className="ceter-admin-nav-heading">{group.label}</div>
              {group.items.map((item) => {
                const Icon = icons[item.module] ?? BarChart3;
                const active = isActive(pathname, searchParams.toString(), item.href);
                return (
                  <Link key={item.href} href={item.href} className={`ceter-admin-nav-link ${active ? "active" : ""}`} onClick={() => setMobileOpen(false)}>
                    <Icon size={18} />
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.summary}</small>
                    </span>
                    <ChevronRight className="ceter-admin-nav-arrow" size={15} />
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        <form action={signOutAction} className="ceter-admin-signout">
          <button type="submit">
            <LogOut size={17} />
            Sign out
          </button>
        </form>
      </aside>

      <main className="ceter-admin-main">
        {children}
      </main>
    </div>
  );
}

function isActive(pathname: string, query: string, href: string) {
  const [targetPath, targetQuery] = href.split("?");
  if (targetPath === "/admin") return pathname === "/admin";
  if (targetQuery) return pathname === targetPath && query.includes(targetQuery);
  return pathname.startsWith(targetPath);
}

function initials(value: string) {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CA";
}
