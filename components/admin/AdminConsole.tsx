"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Archive,
  Boxes,
  Building2,
  ChevronRight,
  CreditCard,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Home,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Pencil,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tags,
  Trash2,
  UploadCloud,
  Users,
  X
} from "lucide-react";
import { toast } from "sonner";
import { signOutAction } from "@/app/actions";
import { bulkProductAction, saveInventoryMatrixAction, updateQuoteStatusAction, type InventoryMatrixEdit } from "@/app/admin/actions";
import { ExcelImportPanel } from "@/app/admin/ExcelImportPanel";
import { formatKes, formatNumber } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  mpn: string | null;
  sku: string | null;
  brand_id: string | null;
  brand: string;
  category_id: string | null;
  category: string;
  price_kes: number;
  cost_price_kes: number | null;
  stock_quantity: number;
  stock_status: string;
  condition: string;
  reorder_level: number;
  reorder_quantity: number;
  supplier_name: string | null;
  images: string[];
  specs: string;
  is_featured: boolean;
  is_published: boolean;
  archived_at: string | null;
  updated_at: string;
};

type QuoteRow = {
  id: string;
  ref: string;
  client: string;
  need: string;
  status: string;
  owner: string;
  value: number;
  createdAt: string;
  followUpAt: string | null;
};

type OrderRow = {
  id: string;
  ref: string;
  client: string;
  status: string;
  total: number;
  lines: number;
  needsSerials: boolean;
  createdAt: string;
};

type MovementRow = {
  id: string;
  product: string;
  delta: number;
  reason: string;
  reference: string | null;
  user: string;
  createdAt: string;
};

type Props = {
  session: { role: "ADMIN"; name: string | null; email: string | null };
  products: ProductRow[];
  quotes: QuoteRow[];
  orders: OrderRow[];
  movements: MovementRow[];
  vatRate: number;
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
};

type Section =
  | "dashboard"
  | "products"
  | "categories"
  | "brands"
  | "imports"
  | "pricing"
  | "inventory"
  | "orders"
  | "quotes"
  | "customers"
  | "payments"
  | "banners"
  | "reports"
  | "settings"
  | "users";

type DirtyCell = {
  id: string;
  field: "stock_quantity" | "price_kes" | "cost_price_kes" | "mpn";
  value: string | number | null;
  original: string | number | null;
  updatedAt: string;
};

const navGroups: Array<{ label: string; items: Array<{ key: Section; label: string; icon: React.ComponentType<{ className?: string }> }> }> = [
  { label: "Overview", items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    label: "Catalogue",
    items: [
      { key: "products", label: "Products", icon: Package },
      { key: "categories", label: "Categories", icon: Tags },
      { key: "brands", label: "Brands", icon: Building2 },
      { key: "imports", label: "Import Centre", icon: UploadCloud }
    ]
  },
  {
    label: "Operations",
    items: [
      { key: "pricing", label: "Pricing & Cost", icon: FileSpreadsheet },
      { key: "inventory", label: "Inventory", icon: Boxes }
    ]
  },
  {
    label: "Sales",
    items: [
      { key: "orders", label: "Orders", icon: ShoppingBag },
      { key: "quotes", label: "Quotes & Tenders", icon: FileText },
      { key: "customers", label: "Customers", icon: Users },
      { key: "payments", label: "Payments", icon: CreditCard }
    ]
  },
  {
    label: "Store",
    items: [
      { key: "banners", label: "Banners & Storefront", icon: ImageIcon },
      { key: "reports", label: "Reports", icon: FileBarChart },
      { key: "settings", label: "Store Settings", icon: Settings },
      { key: "users", label: "Users & Roles", icon: ShieldCheck }
    ]
  }
];

export function AdminConsole({ session, products, quotes, orders, movements, vatRate, categories, brands }: Props) {
  const [section, setSection] = useState<Section>("dashboard");
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [autoCollapse, setAutoCollapse] = useState(true);
  const [drawerProduct, setDrawerProduct] = useState<ProductRow | null>(null);
  const [rows, setRows] = useState(products);
  const [selected, setSelected] = useState<string[]>([]);
  const [dirty, setDirty] = useState<Record<string, DirtyCell>>({});
  const [pending, startTransition] = useTransition();

  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.archived_at && section !== "products") return false;
      if (!term) return true;
      return [row.name, row.sku, row.mpn, row.slug, row.brand, row.category].some((value) => String(value ?? "").toLowerCase().includes(term));
    });
  }, [query, rows, section]);

  const stats = useMemo(() => buildStats(rows, orders, quotes), [orders, quotes, rows]);
  const expanded = mobileOpen || !autoCollapse || hovered;

  function navigate(next: Section) {
    setSection(next);
    setMobileOpen(false);
    setSelected([]);
  }

  function updateCell(row: ProductRow, field: DirtyCell["field"], raw: string) {
    const value = field === "mpn" ? raw.trim() || null : raw === "" && field === "cost_price_kes" ? null : Number(raw.replace(/,/g, ""));
    if (typeof value === "number" && !Number.isFinite(value)) return;
    const key = `${row.id}:${field}`;
    const original = row[field] as string | number | null;
    setDirty((current) => {
      const next = { ...current };
      if (value === original) delete next[key];
      else next[key] = { id: row.id, field, value, original, updatedAt: row.updated_at };
      return next;
    });
    setRows((current) => current.map((item) => (item.id === row.id ? { ...item, [field]: value } : item)));
  }

  function saveMatrix() {
    const grouped = new Map<string, InventoryMatrixEdit>();
    for (const cell of Object.values(dirty)) {
      const edit = grouped.get(cell.id) ?? { id: cell.id, updatedAt: cell.updatedAt, note: section === "pricing" ? "Pricing workspace" : "Inventory workspace" };
      edit[cell.field] = cell.value as never;
      grouped.set(cell.id, edit);
    }
    const edits = [...grouped.values()];
    if (!edits.length) return;
    startTransition(async () => {
      try {
        const result = await saveInventoryMatrixAction(edits);
        setDirty({});
        setRows((current) => current.map((row) => {
          const saved = result.ok.find((item) => item.id === row.id);
          return saved ? { ...row, ...saved, updated_at: saved.updatedAt } : row;
        }));
        if (result.failed.length) toast.error(`Saved ${result.ok.length} of ${edits.length}`, { description: result.failed.map((item) => item.reason).join("; ") });
        else toast.success(`Saved ${result.ok.length} catalogue update${result.ok.length === 1 ? "" : "s"}`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Save failed.");
      }
    });
  }

  function runBulk(action: "publish" | "unpublish" | "delete") {
    if (!selected.length) return;
    const label = action === "publish" ? "publish" : action === "unpublish" ? "unpublish" : "archive/delete";
    if (!window.confirm(`Confirm ${label} for ${selected.length} selected product(s).`)) return;
    startTransition(async () => {
      try {
        const result = await bulkProductAction(selected, action);
        if (action === "delete") {
          const ids = new Set(selected);
          setRows((current) => current.filter((row) => !ids.has(row.id)));
        } else {
          const is_published = action === "publish";
          const ids = new Set(selected);
          setRows((current) => current.map((row) => (ids.has(row.id) ? { ...row, is_published, archived_at: is_published ? null : row.archived_at } : row)));
        }
        setSelected([]);
        toast.success(`Updated ${result.updated + result.archived + result.deleted} product(s)`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Bulk action failed.");
      }
    });
  }

  return (
    <div className={`admin-ui ${autoCollapse ? "admin-auto-collapse" : "admin-pinned"}`}>
      <Topbar session={session} query={query} setQuery={setQuery} onMenu={() => setMobileOpen(true)} stats={stats} autoCollapse={autoCollapse} setAutoCollapse={setAutoCollapse} />
      {mobileOpen ? <button className="admin-mobile-overlay" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}
      <Sidebar expanded={expanded} active={section} onNavigate={navigate} onHover={setHovered} mobileOpen={mobileOpen} autoCollapse={autoCollapse} />
      <main className="admin-main">
        <div className="admin-page">
          {section === "dashboard" ? <Dashboard stats={stats} products={rows} orders={orders} quotes={quotes} movements={movements} go={navigate} /> : null}
          {section === "products" ? <ProductsPage rows={filteredProducts} selected={selected} setSelected={setSelected} open={setDrawerProduct} pending={pending} runBulk={runBulk} /> : null}
          {section === "categories" ? <CategoriesPage rows={rows} categories={categories} /> : null}
          {section === "brands" ? <BrandsPage rows={rows} brands={brands} openProducts={(brand) => { setQuery(brand); setSection("products"); }} /> : null}
          {section === "imports" ? <ImportCentre /> : null}
          {section === "pricing" ? <PricingPage rows={filteredProducts} dirty={dirty} updateCell={updateCell} save={saveMatrix} pending={pending} /> : null}
          {section === "inventory" ? <InventoryPage rows={filteredProducts} dirty={dirty} updateCell={updateCell} save={saveMatrix} pending={pending} /> : null}
          {section === "orders" ? <OrdersPage orders={orders} /> : null}
          {section === "quotes" ? <QuotesPage quotes={quotes} /> : null}
          {section === "customers" ? <CustomersPage orders={orders} quotes={quotes} /> : null}
          {section === "payments" ? <PaymentsPage orders={orders} /> : null}
          {section === "banners" ? <BannersPage /> : null}
          {section === "reports" ? <ReportsPage stats={stats} rows={rows} vatRate={vatRate} /> : null}
          {section === "settings" ? <SettingsPage /> : null}
          {section === "users" ? <UsersPage session={session} /> : null}
        </div>
      </main>
      <ProductDrawer product={drawerProduct} categories={categories} brands={brands} onClose={() => setDrawerProduct(null)} />
    </div>
  );
}

function Topbar({ session, query, setQuery, onMenu, stats, autoCollapse, setAutoCollapse }: { session: Props["session"]; query: string; setQuery: (value: string) => void; onMenu: () => void; stats: ReturnType<typeof buildStats>; autoCollapse: boolean; setAutoCollapse: (value: boolean) => void }) {
  return (
    <header className="admin-topbar">
      <div className="admin-logo-zone">
        <button className="admin-btn admin-icon-btn admin-mobile-menu" onClick={onMenu} aria-label="Open admin navigation"><Menu className="h-4 w-4" /></button>
        <Link href="/admin" className="admin-logo-link">
          <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal-reversed.svg" alt="Ceter Technologies" width={210} height={48} priority />
        </Link>
      </div>
      <div className="admin-global-zone">
        <div className="admin-global-search">
          <Search className="admin-search-symbol" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, SKU, MPN, brands..." />
        </div>
        <div className="admin-top-spacer" />
        <label className="admin-collapse-option" title="Auto hide/collapse sidebar on hover">
          <span>Auto collapse</span>
          <input type="checkbox" checked={autoCollapse} onChange={(event) => setAutoCollapse(event.target.checked)} />
          <span className={`admin-toggle ${autoCollapse ? "on" : ""}`} />
        </label>
        <div className="admin-top-chip">{formatNumber(stats.backorder)} backorder</div>
        <div className="admin-top-chip">{formatNumber(stats.published)} published</div>
        <Link href="/" className="admin-top-chip admin-store-link"><Home className="h-3.5 w-3.5" /> Storefront</Link>
        <div className="admin-top-account" title={session.email ?? "Admin"}><div className="admin-top-avatar">{initials(session.name ?? session.email ?? "Admin")}</div><span>{session.name ?? "Admin"}</span></div>
      </div>
    </header>
  );
}

function Sidebar({ expanded, active, onNavigate, onHover, mobileOpen, autoCollapse }: { expanded: boolean; active: Section; onNavigate: (section: Section) => void; onHover: (value: boolean) => void; mobileOpen: boolean; autoCollapse: boolean }) {
  return (
    <aside onMouseEnter={() => autoCollapse && onHover(true)} onMouseLeave={() => autoCollapse && onHover(false)} className={`admin-sidebar ${expanded ? "expanded" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <nav className="admin-sidebar-scroll">
        {navGroups.map((group) => (
          <div key={group.label} className="admin-nav-group">
            <div className="admin-nav-group-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const current = active === item.key;
              return (
                <button key={item.key} onClick={() => onNavigate(item.key)} title={expanded ? undefined : item.label} className={`admin-nav-item ${current ? "active" : ""}`}>
                  <span className="admin-nav-icon"><Icon /></span>
                  <span className="admin-nav-label">{item.label}</span>
                </button>
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
  );
}

function Dashboard({ stats, products, orders, quotes, movements, go }: { stats: ReturnType<typeof buildStats>; products: ProductRow[]; orders: OrderRow[]; quotes: QuoteRow[]; movements: MovementRow[]; go: (section: Section) => void }) {
  const gaps = products.filter((row) => !row.mpn || !row.cost_price_kes || !row.images.length || row.stock_quantity <= row.reorder_level);
  return (
    <>
      <PageHeader title="Dashboard" copy="Upload, verify, publish, then maintain price, stock and sales operations." />
      <MetricGrid>
        <MetricCard label="Products" value={formatNumber(stats.products)} note={`${formatNumber(stats.published)} published`} />
        <MetricCard label="Stock Value" value={formatKes(stats.sellingValue)} note={`${formatKes(stats.costValue)} cost basis`} />
        <MetricCard label="Potential Margin" value={formatKes(stats.marginValue)} note={`${stats.marginPercent}% blended`} />
        <MetricCard label="Action Queue" value={formatNumber(gaps.length)} note="Catalogue records needing review" />
      </MetricGrid>
      <div className="admin-grid-2">
        <Card title="Primary Admin Flow">
          <div className="admin-quick-grid">
            {[
              ["Upload", "Import Centre", "imports"],
              ["Verify", "Products", "products"],
              ["Publish", "Products", "products"],
              ["Maintain", "Pricing & Inventory", "pricing"]
            ].map(([title, label, target]) => (
              <button key={title} onClick={() => go(target as Section)} className="admin-quick-action">
                <strong>{title}</strong>
                <span>{label}<ChevronRight className="h-3 w-3" /></span>
              </button>
            ))}
          </div>
        </Card>
        <Card title="Operations Snapshot">
          <div className="divide-y divide-[#edf1f6]">
            <ListRow title="Orders to process" value={orders.filter((order) => ["paid", "processing"].includes(order.status)).length} />
            <ListRow title="Open quotes" value={quotes.filter((quote) => quote.status !== "closed").length} />
            <ListRow title="Low stock" value={stats.lowStock} />
            <ListRow title="Backorders" value={stats.backorder} />
          </div>
        </Card>
      </div>
      <Card title="Recent Stock Activity">
        {movements.length ? <DataTable headers={["Product", "Change", "Reason", "User", "Time"]} rows={movements.map((item) => [item.product, item.delta > 0 ? `+${item.delta}` : String(item.delta), item.reason, item.user, item.createdAt])} /> : <EmptyState title="No stock movements yet" copy="Stock changes will appear here after imports and inventory edits." />}
      </Card>
    </>
  );
}

function ProductsPage({ rows, selected, setSelected, open, pending, runBulk }: { rows: ProductRow[]; selected: string[]; setSelected: (ids: string[]) => void; open: (row: ProductRow) => void; pending: boolean; runBulk: (action: "publish" | "unpublish" | "delete") => void }) {
  return (
    <>
      <PageHeader title="Products" copy="Independent listings. Publish only requires complete product information, not accessory or compatibility records." actions={<Link href="#new-product" className="btn-dark"><Package className="h-4 w-4" /> New product</Link>} />
      <FilterBar resultCount={rows.length} />
      {selected.length ? <BulkBar count={selected.length} pending={pending} publish={() => runBulk("publish")} unpublish={() => runBulk("unpublish")} remove={() => runBulk("delete")} clear={() => setSelected([])} /> : null}
      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="w-full min-w-[1080px] text-left text-[13px]">
            <thead><tr><Th><input type="checkbox" checked={rows.length > 0 && selected.length === rows.length} onChange={(event) => setSelected(event.target.checked ? rows.map((row) => row.id) : [])} /></Th><Th>Product</Th><Th>SKU / MPN</Th><Th>Category</Th><Th>Brand</Th><Th right>Cost</Th><Th right>Selling Price</Th><Th right>Margin</Th><Th right>Stock</Th><Th>Status</Th><Th /></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[#edf1f6] hover:bg-[#f8fcfc]">
              <Td><input type="checkbox" checked={selected.includes(row.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, row.id] : selected.filter((id) => id !== row.id))} /></Td>
              <Td><button onClick={() => open(row)} className="max-w-[320px] text-left font-semibold text-[#0b1e39] hover:text-[#0f766e]">{row.name}<span className="block truncate text-xs font-normal text-[#60748a]">{row.slug}</span></button></Td>
              <Td mono>{row.sku || "-"}<span className="block text-xs text-[#60748a]">{row.mpn || "-"}</span></Td>
              <Td>{row.category}</Td><Td>{row.brand}</Td><Td right mono>{row.cost_price_kes ? formatNumber(row.cost_price_kes) : "-"}</Td><Td right mono>{formatNumber(row.price_kes)}</Td><Td right mono>{marginPercent(row)}%</Td><Td right mono>{formatNumber(row.stock_quantity)}</Td><Td><StatusBadge row={row} /></Td><Td right><button onClick={() => open(row)} className="btn-lite min-h-8 px-2 text-xs"><Pencil className="h-3.5 w-3.5" /> Edit</button></Td>
            </tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function CategoriesPage({ rows, categories }: { rows: ProductRow[]; categories: Props["categories"] }) {
  const metrics = categories.map((category) => {
    const products = rows.filter((row) => row.category_id === category.id || row.category === category.name);
    return { ...category, products };
  });
  return <><PageHeader title="Categories" copy="Three-level Ceter hierarchy with live product, published and stock counts." /><div className="admin-entity-grid">{metrics.map((category) => <Card key={category.id} title={category.name} tag={category.slug}><div className="admin-list-metric-grid"><ListMetric label="Products" value={category.products.length} /><ListMetric label="Published" value={category.products.filter((row) => row.is_published).length} /><ListMetric label="Stock units" value={category.products.reduce((sum, row) => sum + row.stock_quantity, 0)} /><ListMetric label="Stock value" value={formatKes(category.products.reduce((sum, row) => sum + row.stock_quantity * (row.cost_price_kes ?? 0), 0))} /></div></Card>)}</div></>;
}

function BrandsPage({ rows, brands, openProducts }: { rows: ProductRow[]; brands: Props["brands"]; openProducts: (brand: string) => void }) {
  return <><PageHeader title="Brands" copy="Brand-level stock, backorder and inventory value visibility." /><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{brands.map((brand) => {
    const products = rows.filter((row) => row.brand_id === brand.id || row.brand === brand.name);
    return <button key={brand.id} onClick={() => openProducts(brand.name)} className="admin-entity-card admin-card"><div className="flex items-center justify-between gap-3"><strong>{brand.name}</strong><span className="admin-pill teal">{products.length} products</span></div><div className="admin-list-metric-grid mt-3"><ListMetric label="In stock" value={products.filter((row) => row.stock_status === "in_stock").length} /><ListMetric label="Backorder" value={products.filter((row) => row.stock_status === "backorder").length} /><ListMetric label="Stock units" value={products.reduce((sum, row) => sum + row.stock_quantity, 0)} /><ListMetric label="Inventory value" value={formatKes(products.reduce((sum, row) => sum + row.stock_quantity * (row.cost_price_kes ?? 0), 0))} /></div></button>;
  })}</div></>;
}

function ImportCentre() {
  return <><PageHeader title="Import Centre" copy="Choose XLSX, parse, validate, preview, confirm, import, store images and publish." /><ExcelImportPanel /></>;
}

function PricingPage({ rows, dirty, updateCell, save, pending }: MatrixProps) {
  return <MatrixPage title="Pricing & Cost" copy="Spreadsheet-style cost, price and margin maintenance." rows={rows} dirty={dirty} updateCell={updateCell} save={save} pending={pending} fields={["cost_price_kes", "price_kes"]} />;
}

function InventoryPage({ rows, dirty, updateCell, save, pending }: MatrixProps) {
  return <MatrixPage title="Inventory" copy="Practical stock workspace for quantities, reorder thresholds and backorders." rows={rows} dirty={dirty} updateCell={updateCell} save={save} pending={pending} fields={["stock_quantity", "mpn"]} />;
}

type MatrixProps = { rows: ProductRow[]; dirty: Record<string, DirtyCell>; updateCell: (row: ProductRow, field: DirtyCell["field"], raw: string) => void; save: () => void; pending: boolean };

function MatrixPage({ title, copy, rows, dirty, updateCell, save, pending, fields }: MatrixProps & { title: string; copy: string; fields: Array<DirtyCell["field"]> }) {
  return (
    <>
      <PageHeader title={title} copy={copy} actions={<button disabled={!Object.keys(dirty).length || pending} onClick={save} className="btn-dark">{pending ? "Saving..." : `Save ${Object.keys(dirty).length} changes`}</button>} />
      <div className="admin-card">
        <div className="admin-table-wrap">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead><tr><Th>Product</Th><Th>SKU / MPN</Th><Th>Brand</Th><Th right>Cost Price</Th><Th right>Selling Price</Th><Th right>Margin</Th><Th right>Stock</Th><Th>Status</Th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[#edf1f6] hover:bg-[#f8fcfc]"><Td><strong>{row.name}</strong><span className="block text-xs text-[#60748a]">{row.category}</span></Td><Td mono>{row.sku || "-"}{fields.includes("mpn") ? <input className={inputClass(dirty[`${row.id}:mpn`])} value={row.mpn ?? ""} onChange={(event) => updateCell(row, "mpn", event.target.value)} /> : <span className="block text-xs text-[#60748a]">{row.mpn || "-"}</span>}</Td><Td>{row.brand}</Td><Td right>{fields.includes("cost_price_kes") ? <EditInput row={row} field="cost_price_kes" dirty={dirty} updateCell={updateCell} /> : formatNumber(row.cost_price_kes ?? 0)}</Td><Td right>{fields.includes("price_kes") ? <EditInput row={row} field="price_kes" dirty={dirty} updateCell={updateCell} /> : formatNumber(row.price_kes)}</Td><Td right mono>{marginPercent(row)}%</Td><Td right>{fields.includes("stock_quantity") ? <EditInput row={row} field="stock_quantity" dirty={dirty} updateCell={updateCell} /> : formatNumber(row.stock_quantity)}</Td><Td><StatusBadge row={row} /></Td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function OrdersPage({ orders }: { orders: OrderRow[] }) {
  return <><PageHeader title="Orders" copy="Simple fulfilment queue: New, Paid, Processing, Ready, Dispatched, Completed or Cancelled." /><DataTable headers={["Order", "Customer", "Lines", "Total", "Status", "Created"]} rows={orders.map((order) => [order.ref, order.client, order.lines, formatKes(order.total), order.status, new Date(order.createdAt).toLocaleDateString("en-KE")])} empty="No real orders yet." /></>;
}

function QuotesPage({ quotes }: { quotes: QuoteRow[] }) {
  const [pendingId, setPendingId] = useState("");
  function update(quote: QuoteRow, status: string) {
    const formData = new FormData();
    formData.set("id", quote.id);
    formData.set("status", status);
    setPendingId(quote.id);
    updateQuoteStatusAction(formData).then(() => toast.success("Quote status updated")).catch((error) => toast.error(error instanceof Error ? error.message : "Quote update failed.")).finally(() => setPendingId(""));
  }
  return <><PageHeader title="Quotes & Tenders" copy="Pipeline from New to Contacted, Quoted, Won and Closed." /><div className="overflow-hidden rounded-md border border-[#dde8ee] bg-white"><table className="w-full min-w-[820px] text-left text-[13px]"><thead><tr><Th>Quote</Th><Th>Customer</Th><Th>Need</Th><Th right>Value</Th><Th>Status</Th><Th /></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id} className="border-t border-[#edf1f6]"><Td mono>{quote.ref}</Td><Td>{quote.client}</Td><Td>{quote.need}</Td><Td right mono>{quote.value ? formatKes(quote.value) : "-"}</Td><Td><Badge>{quote.status}</Badge></Td><Td right><button disabled={pendingId === quote.id} className="btn-lite min-h-8 text-xs" onClick={() => update(quote, nextQuoteStatus(quote.status))}>{pendingId === quote.id ? "Saving..." : `Mark ${nextQuoteStatus(quote.status)}`}</button></Td></tr>)}</tbody></table></div></>;
}

function CustomersPage({ orders, quotes }: { orders: OrderRow[]; quotes: QuoteRow[] }) {
  const names = [...new Set([...orders.map((order) => order.client), ...quotes.map((quote) => quote.client)].filter(Boolean))];
  return <><PageHeader title="Customers" copy="Directory built only from real order and quote activity currently available." /><DataTable headers={["Customer", "Orders", "Quotes", "Recorded spend"]} rows={names.map((name) => [name, orders.filter((order) => order.client === name).length, quotes.filter((quote) => quote.client === name).length, formatKes(orders.filter((order) => order.client === name).reduce((sum, order) => sum + order.total, 0))])} empty="No real customer activity yet." /></>;
}

function PaymentsPage({ orders }: { orders: OrderRow[] }) {
  const paid = orders.filter((order) => order.status !== "pending");
  return <><PageHeader title="Payments" copy="Payment reconciliation stays server-side and never exposes provider secrets." /><DataTable headers={["Order", "Customer", "Provider", "Amount", "Status"]} rows={paid.map((order) => [order.ref, order.client, "Configured gateway", formatKes(order.total), order.status === "paid" ? "paid" : "processing"])} empty="No payment transactions to reconcile yet." /></>;
}

function BannersPage() {
  return <><PageHeader title="Banners & Storefront" copy="Simple CMS-style management for images, title, copy, CTA, active state and display order." /><EmptyState title="Static banner assets retained" copy="The current storefront banner system is preserved. Database-backed editing can be enabled once final banner records are approved." action={<Link href="/" className="btn-lite"><Store className="h-4 w-4" /> View storefront</Link>} /></>;
}

function ReportsPage({ stats, rows, vatRate }: { stats: ReturnType<typeof buildStats>; rows: ProductRow[]; vatRate: number }) {
  return <><PageHeader title="Reports" copy="Operational reports only. No invented business financial data." /><MetricGrid><MetricCard label="Products by brand" value={formatNumber(new Set(rows.map((row) => row.brand)).size)} note="Active brand count" /><MetricCard label="Stock by status" value={`${stats.inStock}/${stats.backorder}`} note="In stock / backorder products" /><MetricCard label="Inventory cost value" value={formatKes(stats.costValue)} note="Based on recorded cost only" /><MetricCard label="VAT Rate" value={`${Math.round(vatRate * 100)}%`} note="Checkout estimate" /></MetricGrid></>;
}

function SettingsPage() {
  return <><PageHeader title="Store Settings" copy="Environment-backed deployment settings and payment configuration." /><div className="grid gap-3 md:grid-cols-2"><Card title="Configuration"><div className="p-3 text-sm text-[#60748a]">Supabase, Prisma pooler, storage bucket and payment credentials are configured via environment variables only.</div></Card><Card title="Security"><div className="p-3 text-sm text-[#60748a]">Admin access remains role-gated through Supabase Auth and `profiles.role`.</div></Card></div></>;
}

function UsersPage({ session }: { session: Props["session"] }) {
  return <><PageHeader title="Users & Roles" copy="Admin access is separate from customer accounts." /><DataTable headers={["Name", "Email", "Role", "Status"]} rows={[[session.name ?? "Current admin", session.email ?? "-", session.role, "Active"]]} /></>;
}

function ProductDrawer({ product, categories, brands, onClose }: { product: ProductRow | null; categories: Props["categories"]; brands: Props["brands"]; onClose: () => void }) {
  if (!product) return null;
  return (
    <>
      <button className="fixed inset-0 z-[70] bg-[#071426]/35" aria-label="Close drawer" onClick={onClose} />
      <aside className="fixed bottom-0 right-0 top-0 z-[80] flex w-[500px] max-w-[94vw] flex-col bg-white shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-[#dde8ee] px-4"><strong>Edit product</strong><button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mb-4 grid h-44 place-items-center rounded-md border border-[#dde8ee] bg-[#f4f7fa]">{product.images[0] ? <Image src={product.images[0]} alt={product.name} width={220} height={160} className="max-h-40 w-auto object-contain" /> : <Package className="h-12 w-12 text-[#60748a]" />}</div>
          <div className="grid gap-3">
            <ReadonlyField label="Product" value={product.name} />
            <ReadonlyField label="SKU / MPN" value={`${product.sku || "-"} / ${product.mpn || "-"}`} />
            <ReadonlyField label="Category" value={categories.find((item) => item.id === product.category_id)?.name ?? product.category} />
            <ReadonlyField label="Brand" value={brands.find((item) => item.id === product.brand_id)?.name ?? product.brand} />
            <ReadonlyField label="Price" value={formatKes(product.price_kes)} />
            <ReadonlyField label="Stock" value={`${product.stock_quantity} units, ${product.stock_status}`} />
            <ReadonlyField label="Published" value={product.is_published ? "Yes" : "No"} />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#dde8ee] p-4"><button onClick={onClose} className="btn-lite">Close</button><Link href={`/product/${product.slug}`} className="btn-dark">Open storefront page</Link></div>
      </aside>
    </>
  );
}

function PageHeader({ title, copy, actions }: { title: string; copy: string; actions?: React.ReactNode }) {
  return <div className="admin-page-head"><div className="admin-page-title"><h1>{title}</h1><p>{copy}</p></div><div className="admin-actions">{actions}</div></div>;
}

function FilterBar({ resultCount }: { resultCount: number }) {
  return <div className="admin-toolbar"><Search className="h-4 w-4" /><span>{formatNumber(resultCount)} matching products</span><span className="ml-auto text-xs">Use the top search to filter product, SKU, MPN, category or brand.</span></div>;
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="admin-kpi-grid">{children}</div>;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="admin-card admin-kpi"><div className="admin-kpi-label">{label}</div><div className="admin-kpi-value">{value}</div><div className="admin-kpi-sub">{note}</div></div>;
}

function Card({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) {
  return <section className="admin-card admin-section-card"><div className="admin-card-head">{title}{tag ? <span className="admin-pill teal">{tag}</span> : null}</div>{children}</section>;
}

function DataTable({ headers, rows, empty }: { headers: string[]; rows: Array<Array<React.ReactNode>>; empty?: string }) {
  if (!rows.length) return <EmptyState title={empty ?? "No records"} copy="Records will appear here once the workflow creates real data." />;
  return <div className="admin-card"><div className="admin-table-wrap"><table className="min-w-[760px]"><thead><tr>{headers.map((header) => <Th key={header}>{header}</Th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <Td key={cellIndex}>{cell}</Td>)}</tr>)}</tbody></table></div></div>;
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <div className="admin-card admin-empty"><strong>{title}</strong><p>{copy}</p>{action ? <div className="mt-4">{action}</div> : null}</div>;
}

function BulkBar({ count, pending, publish, unpublish, remove, clear }: { count: number; pending: boolean; publish: () => void; unpublish: () => void; remove: () => void; clear: () => void }) {
  return <div className="sticky top-[84px] z-20 mb-3 flex flex-wrap items-center gap-2 rounded-md border border-[#223654] bg-[#0b1e39] px-3 py-2 text-sm text-white shadow-lg"><strong>{count} selected</strong><button disabled={pending} onClick={publish} className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">Publish</button><button disabled={pending} onClick={unpublish} className="rounded-md border border-white/25 px-2 py-1 hover:bg-white/10"><Archive className="mr-1 inline h-3.5 w-3.5" />Unpublish</button><button disabled={pending} onClick={remove} className="rounded-md border border-red-300/70 bg-red-500/15 px-2 py-1 hover:bg-red-500/25"><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete</button><button disabled={pending} onClick={clear} className="ml-auto rounded-md border border-white/25 px-2 py-1 hover:bg-white/10">Clear</button></div>;
}

function EditInput({ row, field, dirty, updateCell }: { row: ProductRow; field: DirtyCell["field"]; dirty: Record<string, DirtyCell>; updateCell: (row: ProductRow, field: DirtyCell["field"], raw: string) => void }) {
  return <input className={inputClass(dirty[`${row.id}:${field}`])} value={String(row[field] ?? "")} onChange={(event) => updateCell(row, field, event.target.value)} inputMode="numeric" />;
}

function inputClass(dirty?: DirtyCell) {
  return `admin-edit-cell ${dirty ? "dirty" : ""}`;
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return <th className={right ? "text-right" : "text-left"}>{children}</th>;
}

function Td({ children, right, mono }: { children?: React.ReactNode; right?: boolean; mono?: boolean }) {
  return <td className={`${right ? "text-right" : ""} ${mono ? "font-mono tabular-nums" : ""}`}>{children}</td>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="admin-pill teal">{children}</span>;
}

function StatusBadge({ row }: { row: ProductRow }) {
  const text = row.archived_at ? "Archived" : !row.is_published ? "Unpublished" : row.stock_quantity <= 0 ? "Out of stock" : row.stock_status === "backorder" ? "Backorder" : "Published";
  const color = row.archived_at || !row.is_published ? "border-slate-200 bg-slate-100 text-slate-600" : row.stock_quantity <= 0 ? "border-red-100 bg-red-50 text-red-700" : row.stock_status === "backorder" ? "border-amber-100 bg-amber-50 text-amber-700" : "border-green-100 bg-green-50 text-green-700";
  return <span className={`admin-pill ${color.includes("red") ? "red" : color.includes("amber") ? "amber" : color.includes("green") ? "green" : "gray"}`}>{text}</span>;
}

function ListRow({ title, value }: { title: string; value: number }) {
  return <div className="admin-list-row"><span>{title}</span><strong className="font-mono">{formatNumber(value)}</strong></div>;
}

function ListMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="admin-list-metric"><div className="font-mono font-black">{value}</div><div>{label}</div></div>;
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return <label className="block text-xs font-bold uppercase text-[#60748a]"><span>{label}</span><input value={value} readOnly className="mt-1 h-10 w-full rounded-md border border-[#dde8ee] bg-[#f8fafc] px-3 text-sm normal-case text-[#0b1e39]" /></label>;
}

function buildStats(products: ProductRow[], orders: OrderRow[], quotes: QuoteRow[]) {
  const active = products.filter((row) => !row.archived_at);
  const costValue = active.reduce((sum, row) => sum + row.stock_quantity * (row.cost_price_kes ?? 0), 0);
  const sellingValue = active.reduce((sum, row) => sum + row.stock_quantity * row.price_kes, 0);
  const marginValue = sellingValue - costValue;
  return {
    products: active.length,
    published: active.filter((row) => row.is_published).length,
    inStock: active.filter((row) => row.stock_status === "in_stock").length,
    backorder: active.filter((row) => row.stock_status === "backorder").length,
    lowStock: active.filter((row) => row.reorder_level > 0 && row.stock_quantity <= row.reorder_level).length,
    costValue,
    sellingValue,
    marginValue,
    marginPercent: sellingValue > 0 ? Math.round((marginValue / sellingValue) * 1000) / 10 : 0,
    orderCount: orders.length,
    quoteCount: quotes.length
  };
}

function marginPercent(row: ProductRow) {
  return row.price_kes > 0 && row.cost_price_kes != null ? Math.round(((row.price_kes - row.cost_price_kes) / row.price_kes) * 1000) / 10 : 0;
}

function nextQuoteStatus(status: string) {
  if (status === "new") return "contacted";
  if (status === "contacted") return "quoted";
  if (status === "quoted") return "won";
  return "closed";
}

function initials(value: string) {
  return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD";
}
