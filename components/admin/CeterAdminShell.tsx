"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Boxes,
  Building2,
  Calculator,
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileArchive,
  FileBarChart,
  FileText,
  Home,
  Landmark,
  LifeBuoy,
  LogOut,
  Menu,
  NotebookText,
  Palette,
  Percent,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  WalletCards,
  X
} from "lucide-react";
import { AdminNotificationBell } from "@/components/admin/AdminNotificationBell";
import { AdminInstallHelp } from "@/components/admin/AdminInstallHelp";
import type { LucideIcon } from "lucide-react";
import { signOutAction } from "@/app/actions";
import { AdminQuickActions } from "@/components/admin/AdminQuickActions";
import { adminModules, type AdminNavChild } from "@/lib/admin/modules";
import type { PermissionKey } from "@/lib/admin/roles";

type CeterAdminShellProps = {
  children: React.ReactNode;
  session: { name: string | null; email: string | null; permissions: PermissionKey[] };
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
  "sales-people": UserCog,
  branches: Building2,
  customization: Palette,
  billing: WalletCards,
  settings: Settings,
  categories: Tags,
  help: LifeBuoy
};

const childIcons: Array<[RegExp, LucideIcon]> = [
  [/dashboard|overview/i, BarChart3],
  [/products|services|inventory products|item/i, Boxes],
  [/stock|transfer|takes|movements/i, ClipboardCheck],
  [/sale|invoice|deliveries|quotation|credit note/i, ShoppingCart],
  [/customer|debtors|collections/i, Users],
  [/transaction|payment|receipt|billing history/i, CreditCard],
  [/purchase|supplier|debit note|creditors/i, Truck],
  [/expense|recurring expense/i, Receipt],
  [/chart|ledger|journal|trial|balance|cashflow|profit|loss/i, Calculator],
  [/asset/i, FileArchive],
  [/report|commission/i, FileBarChart],
  [/user|security|sales team/i, UserCog],
  [/branch/i, Building2],
  [/onboard|profile|business profile|custom/i, Store],
  [/terms|notices|activity|logs/i, NotebookText],
  [/tax|etims/i, Percent],
  [/integration|methods|sms/i, SlidersHorizontal],
  [/renew|pay|wallet/i, WalletCards],
  [/recurring/i, CalendarClock],
  [/support|help/i, LifeBuoy]
];

export function CeterAdminShell({ children, session }: CeterAdminShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [miniDrawer, setMiniDrawer] = useState(false);
  const [openModule, setOpenModule] = useState<string | null>(null);
  const query = searchParams.toString();
  const announcedAction = useRef("");
  const visibleModules = adminModules
    .map((item) => ({ ...item, children: filterChildren(item.children, session.permissions) }))
    .filter((item) => canAccessHref(item.href, session.permissions) || Boolean(item.children?.length));
  const menuModules = visibleModules.filter((item) => !["help", "branches"].includes(item.module));
  const helpModule = visibleModules.find((item) => item.module === "help");

  useEffect(() => {
    const params = new URLSearchParams(query);
    const success = params.get("success");
    const error = params.get("error");
    const key = `${pathname}?${query}`;
    if ((!success && !error) || announcedAction.current === key) return;
    announcedAction.current = key;
    if (error) toast.error(error, { duration: 7000 });
    else if (success) toast.success(success, { duration: 7000 });
  }, [pathname, query]);

  useLayoutEffect(() => {
    const stored = window.localStorage.getItem("ceter-admin-mini-drawer");
    setMiniDrawer(stored === null ? false : stored === "true");
  }, []);

  function toggleMiniDrawer() {
    setMiniDrawer((value) => {
      const next = !value;
      window.localStorage.setItem("ceter-admin-mini-drawer", String(next));
      return next;
    });
    setOpenModule(null);
  }

  function positionMiniFlyout(event: React.MouseEvent<HTMLDivElement>) {
    if (!miniDrawer) return;
    const viewportPadding = 14;
    const triggerRect = event.currentTarget.getBoundingClientRect();
    const flyout = event.currentTarget.querySelector<HTMLElement>(".ceter-admin-nav-flyout");
    const flyoutHeight = flyout ? Math.min(flyout.scrollHeight, window.innerHeight - viewportPadding * 2) : 0;
    const opensPastBottom = triggerRect.top + flyoutHeight > window.innerHeight - viewportPadding;
    const top = opensPastBottom
      ? Math.max(viewportPadding, triggerRect.bottom - flyoutHeight)
      : Math.max(viewportPadding, triggerRect.top);
    event.currentTarget.style.setProperty("--flyout-top", `${top}px`);
    event.currentTarget.style.setProperty("--flyout-max-height", `${Math.max(160, window.innerHeight - viewportPadding * 2)}px`);
  }

  return (
    <div className={`ceter-admin ${miniDrawer ? "mini-drawer" : ""}`}>
      <header className="ceter-admin-header">
        <div className="ceter-admin-header-brand">
          <button className="ceter-admin-icon-button ceter-admin-mobile-trigger" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <Link href="/admin" className="ceter-admin-mobile-logo" aria-label="Ceter Technologies admin home">
            <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies" width={118} height={24} priority />
          </Link>
          <button
            className="ceter-admin-icon-button ceter-admin-desktop-menu"
            type="button"
            aria-label={miniDrawer ? "Expand navigation" : "Collapse navigation"}
            aria-pressed={miniDrawer}
            onClick={toggleMiniDrawer}
          >
            <Menu size={20} />
          </button>
          <strong className="ceter-admin-header-message">Good evening, {firstName(session.name ?? session.email ?? "Admin")} - Ceter records keep the business picture accurate.</strong>
        </div>
        <div className="ceter-admin-header-actions">
          <AdminInstallHelp />
          <AdminNotificationBell />
          <Link href="/" className="ceter-admin-company">
            <span>{initials(session.name ?? session.email ?? "Admin")}</span>
            <strong>{session.name ?? "Ceter Admin"}</strong>
          </Link>
        </div>
      </header>
      {mobileOpen ? <button className="ceter-admin-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`ceter-admin-sidebar ${mobileOpen ? "open" : ""}`} aria-label="Admin navigation">
        <div className="ceter-admin-sidebar-top">
          <Link href="/admin" className="ceter-admin-sidebar-brand" aria-label="Ceter Technologies admin home">
            <Image className="ceter-admin-sidebar-wordmark" src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies" width={150} height={31} />
            <Image className="ceter-admin-sidebar-mark" src="/ceter-logo-pack/icon/ceter-icon.svg" alt="" width={38} height={38} aria-hidden="true" />
          </Link>
          <button className="ceter-admin-icon-button ceter-admin-close" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="ceter-admin-sidebar-menu" aria-label="Ceter admin modules">
          <section className="ceter-admin-nav-group">
            {menuModules.map((item) => {
              const Icon = icons[item.module] ?? BarChart3;
              const active = isModuleActive(pathname, query, item);
              const expanded = openModule === item.module;
              const hasChildren = Boolean(item.children?.length);
              return (
                <div
                  key={item.href}
                  className={`ceter-admin-nav-item ${active ? "active" : ""} ${expanded ? "expanded" : ""}`}
                  onMouseEnter={positionMiniFlyout}
                >
                  {hasChildren ? (
                    <button
                      type="button"
                      className="ceter-admin-nav-link"
                      aria-label={item.label}
                      aria-expanded={expanded}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setOpenModule(expanded ? null : item.module)}
                    >
                      <Icon size={21} />
                      <span className="ceter-admin-rail-label">{item.label}</span>
                      {item.badge ? <span className="ceter-admin-rail-badge">{item.badge}</span> : null}
                      <ChevronRight size={15} className="ceter-admin-parent-chevron" />
                    </button>
                  ) : (
                    <Link href={item.href} className="ceter-admin-nav-link" onClick={() => setMobileOpen(false)} aria-label={item.label} aria-current={active ? "page" : undefined}>
                      <Icon size={21} />
                      <span className="ceter-admin-rail-label">{item.label}</span>
                      {item.badge ? <span className="ceter-admin-rail-badge">{item.badge}</span> : null}
                    </Link>
                  )}
                  {hasChildren ? (
                    <div className="ceter-admin-nav-flyout">
                      <strong className="ceter-admin-flyout-title">{item.label}</strong>
                      <div className="ceter-admin-flyout-links">
                        <FlyoutList childrenItems={item.children ?? []} pathname={pathname} query={query} closeMobile={() => setMobileOpen(false)} />
                        {item.label === "Integrations" ? (
                          <form action={signOutAction} className="ceter-admin-flyout-signout">
                            <button type="submit">
                              <LogOut size={17} />
                              <span>Sign out</span>
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        </nav>
        {helpModule ? (
          <div className="ceter-admin-sidebar-help">
            <Link
              href={helpModule.href}
              className={`ceter-admin-nav-link ${isModuleActive(pathname, query, helpModule) ? "active" : ""}`}
              onClick={() => setMobileOpen(false)}
              aria-label={helpModule.label}
              aria-current={isModuleActive(pathname, query, helpModule) ? "page" : undefined}
            >
              <LifeBuoy size={21} />
              <span className="ceter-admin-rail-label">{helpModule.label}</span>
            </Link>
          </div>
        ) : null}
      </aside>

      <main className="ceter-admin-main">
        <div className="ceter-admin-quick-actions-shell">
          <AdminQuickActions permissions={session.permissions} />
        </div>
        <div className="ceter-admin-content">
          {children}
        </div>
      </main>
    </div>
  );
}

function filterChildren(children: AdminNavChild[] | undefined, permissions: PermissionKey[]): AdminNavChild[] | undefined {
  const visible = children
    ?.map((child) => ({ ...child, children: filterChildren(child.children, permissions) }))
    .filter((child) => canAccessHref(child.href, permissions) || Boolean(child.children?.length));
  return visible?.length ? visible : undefined;
}

function canAccessHref(href: string | undefined, permissions: PermissionKey[]) {
  if (!href) return false;
  const path = href.split("?")[0];
  if (path === "/admin") return permissions.includes("dashboard.view");
  if (path === "/admin/payments/mpesa-reconciliation") return permissions.includes("payments.mpesa.reconcile");
  if (path.startsWith("/admin/users")) return permissions.includes("users.view");
  if (path.startsWith("/admin/roles")) return permissions.includes("roles.view");
  if (path.startsWith("/admin/activity")) return permissions.includes("audit.view");
  if (path.startsWith("/admin/products")) return permissions.includes("products.view");
  if (path.startsWith("/admin/categories")) return permissions.includes("categories.view");
  if (path.startsWith("/admin/brands")) return permissions.includes("brands.view");
  if (path.startsWith("/admin/import")) return permissions.includes("products.import");
  if (path.startsWith("/admin/storefront/banners")) return permissions.includes("storefront.banners.manage");
  if (path.startsWith("/admin/storefront/homepage")) return permissions.includes("storefront.homepage.manage");
  if (path.startsWith("/admin/storefront/featured")) return permissions.includes("storefront.featured.manage");
  if (path.startsWith("/admin/storefront/visibility")) return permissions.includes("storefront.visibility.manage");
  if (path.startsWith("/admin/inventory")) return permissions.includes("inventory.view");
  if (/^\/admin\/(sales|orders|quotes|quote-requests|payments|deliveries|delivery-notes|order-tracking)/.test(path)) return permissions.includes("sales.view");
  if (/^\/admin\/(invoices|receipts|credit-notes|debit-notes|recurring-invoices|fiscalization|documents)/.test(path)) return permissions.includes("fiscalization.view");
  if (/^\/admin\/(customers|customer-categories|customer-equipment|customer-statements|contracts)/.test(path)) return permissions.includes("customers.view");
  if (path.startsWith("/admin/service")) return permissions.includes("service.view");
  if (path.startsWith("/admin/transactions")) return permissions.includes("accounting.view");
  if (/^\/admin\/(purchases|suppliers)/.test(path)) return permissions.includes("purchases.view");
  if (/^\/admin\/(expenses|expense-categories)/.test(path)) return permissions.includes("accounting.view");
  if (path.startsWith("/admin/accounting")) return permissions.includes("accounting.view");
  if (path.startsWith("/admin/reports")) return permissions.includes("accounting.reports.view");
  if (path.startsWith("/admin/branches")) return permissions.includes("branches.view");
  if (path.startsWith("/admin/compliance")) return permissions.includes("compliance.view");
  if (path.startsWith("/admin/notices")) return permissions.includes("notices.view");
  if (path.startsWith("/admin/sales-team")) return permissions.includes("sales_team.view");
  if (path.startsWith("/admin/settings/business")) return permissions.includes("settings.business.manage");
  if (path.startsWith("/admin/settings/branding")) return permissions.includes("settings.branding.manage");
  if (path.startsWith("/admin/settings/payment-methods")) return permissions.includes("settings.payments.manage");
  if (path.startsWith("/admin/settings/tax")) return permissions.includes("settings.tax.manage");
  if (path.startsWith("/admin/settings/sms")) return permissions.includes("settings.sms.manage");
  if (path.startsWith("/admin/settings/integrations")) return ["settings.integrations.manage", "settings.etims.manage", "settings.mpesa.manage", "settings.sms.manage", "settings.signing.manage", "settings.notifications.manage"].some((permission) => permissions.includes(permission as PermissionKey));
  if (path.startsWith("/admin/settings/mpesa")) return permissions.includes("settings.mpesa.manage");
  if (path.startsWith("/admin/settings/etims")) return permissions.includes("settings.etims.manage");
  if (path.startsWith("/admin/settings/signing")) return permissions.includes("settings.signing.manage");
  if (path.startsWith("/admin/settings/security")) return permissions.includes("settings.security.manage");
  if (path.startsWith("/admin/settings/notifications")) return permissions.includes("settings.notifications.manage");
  if (path.startsWith("/admin/settings/templates")) return permissions.includes("settings.templates.manage");
  if (path.startsWith("/admin/settings/legal")) return permissions.includes("settings.legal.manage");
  if (path.startsWith("/admin/settings")) return permissions.includes("settings.view");
  if (path.startsWith("/admin/help")) return permissions.includes("help.view");
  if (path.startsWith("/admin/business")) return permissions.some((permission) => ["sales.view", "accounting.view", "purchases.view"].includes(permission));
  return false;
}

function FlyoutList({ childrenItems, pathname, query, closeMobile }: { childrenItems: AdminNavChild[]; pathname: string; query: string; closeMobile: () => void }) {
  const [openChild, setOpenChild] = useState<string | null>(null);
  const [hoverChild, setHoverChild] = useState<string | null>(null);

  return (
    <>
      {childrenItems.map((child) => (
        <FlyoutItem
          key={child.label}
          child={child}
          pathname={pathname}
          query={query}
          closeMobile={closeMobile}
          expanded={openChild === child.label || hoverChild === child.label}
          onToggle={() => {
            setHoverChild(null);
            setOpenChild((value) => (value === child.label ? null : child.label));
          }}
          onPreview={() => {
            if (openChild === child.label) return;
            setOpenChild(null);
            setHoverChild(child.label);
          }}
          onClosePreview={() => setHoverChild((value) => (value === child.label ? null : value))}
        />
      ))}
    </>
  );
}

function FlyoutItem({
  child,
  pathname,
  query,
  closeMobile,
  expanded,
  onToggle,
  onPreview,
  onClosePreview
}: {
  child: AdminNavChild;
  pathname: string;
  query: string;
  closeMobile: () => void;
  expanded: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onClosePreview: () => void;
}) {
  const childActive = child.href ? isActive(pathname, query, child.href) : Boolean(child.children?.some((item) => item.href && isActive(pathname, query, item.href)));
  const hasChildren = Boolean(child.children?.length);
  const ChildIcon = iconForChild(child.label);
  const content = (
    <>
      <ChildIcon size={17} />
      <span>{child.label}</span>
      {hasChildren ? <ChevronRight size={15} className="ceter-admin-nested-chevron" /> : null}
    </>
  );

  function positionNestedFlyout(event: React.MouseEvent<HTMLDivElement>) {
    const viewportPadding = 14;
    const nestedFlyout = event.currentTarget.querySelector<HTMLElement>(".ceter-admin-nested-flyout");
    if (!nestedFlyout) return;
    const rowRect = event.currentTarget.getBoundingClientRect();
    const nestedHeight = Math.min(nestedFlyout.scrollHeight, window.innerHeight - viewportPadding * 2);
    let top = 0;

    if (rowRect.top + nestedHeight > window.innerHeight - viewportPadding) {
      top = window.innerHeight - viewportPadding - nestedHeight - rowRect.top;
    }

    if (rowRect.top + top < viewportPadding) {
      top = viewportPadding - rowRect.top;
    }

    event.currentTarget.style.setProperty("--nested-top", `${top}px`);
    event.currentTarget.style.setProperty("--nested-max-height", `${Math.max(160, window.innerHeight - viewportPadding * 2)}px`);
  }

  return (
    <div
      className={`ceter-admin-flyout-row ${childActive ? "active" : ""} ${hasChildren ? "has-children" : ""} ${expanded ? "expanded" : ""}`}
      onMouseEnter={hasChildren ? (event) => {
        positionNestedFlyout(event);
        onPreview();
      } : undefined}
      onMouseLeave={hasChildren ? onClosePreview : undefined}
    >
      {child.href ? (
        <Link href={child.href} onClick={closeMobile} aria-current={childActive ? "page" : undefined}>
          {content}
        </Link>
      ) : (
        <button type="button" aria-expanded={expanded} onClick={onToggle}>
          {content}
        </button>
      )}
      {hasChildren ? (
        <div className="ceter-admin-nested-flyout">
          <div className="ceter-admin-flyout-links">
            {child.children?.map((nested) => {
              const NestedIcon = iconForChild(nested.label);
              const nestedActive = isChildActive(pathname, query, nested);
              return (
                <div key={`${child.label}-${nested.label}`} className={`ceter-admin-flyout-row ${nestedActive ? "active" : ""}`}>
                  {nested.href ? (
                    <Link href={nested.href} onClick={closeMobile} aria-current={nestedActive ? "page" : undefined}>
                      <NestedIcon size={17} />
                      <span>{nested.label}</span>
                    </Link>
                  ) : (
                    <button type="button">
                      <NestedIcon size={17} />
                      <span>{nested.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function isModuleActive(pathname: string, query: string, item: (typeof adminModules)[number]) {
  return isActive(pathname, query, item.href) || Boolean(item.children?.some((child) => isChildActive(pathname, query, child)));
}

function isChildActive(pathname: string, query: string, child: AdminNavChild): boolean {
  return isActive(pathname, query, child.href) || Boolean(child.children?.some((item) => isChildActive(pathname, query, item)));
}

function isActive(pathname: string, query: string, href?: string) {
  if (!href) return false;
  const [targetPath, targetQuery] = href.split("?");
  if (targetPath === "/admin") return pathname === "/admin";
  if (targetQuery) return pathname === targetPath && query.includes(targetQuery);
  return pathname.startsWith(targetPath);
}

function iconForChild(label: string) {
  return childIcons.find(([pattern]) => pattern.test(label))?.[1] ?? FileText;
}

function initials(value: string) {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "CA";
}

function firstName(value: string) {
  return value.split(/\s|@/).filter(Boolean)[0]?.toUpperCase() || "ADMIN";
}
