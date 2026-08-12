"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Archive, BarChart3, Boxes, Check, FileText, LogOut, Menu, PackageSearch, Search, Settings, ShoppingBag, Store, Trash2, UserCircle, X } from "lucide-react";
import { toast } from "sonner";
import { signOutAction } from "@/app/actions";
import { ExcelImportPanel } from "@/app/admin/ExcelImportPanel";
import { bulkProductAction, deleteCompatibilityAction, saveInventoryMatrixAction, updateQuoteStatusAction, upsertCompatibilityAction, upsertProductAction, type InventoryMatrixEdit } from "@/app/admin/actions";
import { AdminProgress, ProgressButton, type AdminProgressState } from "@/components/admin/AdminProgress";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { formatKes, formatNumber } from "@/lib/utils";

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  mpn: string | null;
  sku: string | null;
  brand: string;
  category: string;
  price_kes: number;
  cost_price_kes: number | null;
  stock_quantity: number;
  stock_status: string;
  reorder_level: number;
  reorder_quantity: number;
  supplier_name: string | null;
  images: string[];
  is_published: boolean;
  archived_at: string | null;
  updated_at: string;
  enriched_at: string | null;
  latestEnrichmentJob: { status: string; error: string | null } | null;
  compatibleCount: number;
  consumableCount: number;
  compatibilities: CompatibilityRow[];
};

type CompatibilityRow = {
  id: string;
  relationType: "TONER" | "DRUM" | "INKJET" | "SPARE_PART" | "ACCESSORY";
  direction: "printer" | "consumable";
  product: { id: string; name: string; slug: string; mpn: string | null; sku: string | null; brand: string; category: string; stock_quantity: number };
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
  icecatEnabled: boolean;
  categories: Array<{ id: string; name: string; slug: string }>;
  brands: Array<{ id: string; name: string; slug: string }>;
};

type View = "dashboard" | "catalogue" | "inventory" | "quotes" | "orders";
type DirtyCell = { id: string; field: "mpn" | "stock_quantity" | "price_kes" | "cost_price_kes"; value: string | number | null; original: string | number | null; updatedAt: string };

const nav = [
  { view: "dashboard" as const, label: "Dashboard", icon: BarChart3 },
  { view: "catalogue" as const, label: "Catalogue", icon: PackageSearch },
  { view: "inventory" as const, label: "Inventory", icon: Boxes },
  { view: "quotes" as const, label: "Quotes & tenders", icon: FileText },
  { view: "orders" as const, label: "Orders", icon: ShoppingBag }
];

const viewCopy: Record<View, string> = {
  dashboard: "Overview",
  catalogue: "Product operations",
  inventory: "Stock matrix",
  quotes: "Sales pipeline",
  orders: "Fulfilment"
};

export function AdminConsole({ session, products, quotes, orders, movements, vatRate, icecatEnabled, categories, brands }: Props) {
  const [view, setView] = useState<View>("dashboard");
  const [drawer, setDrawer] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [rows, setRows] = useState(products);
  const [selected, setSelected] = useState(products[0]?.id ?? "");
  const [dirty, setDirty] = useState<Record<string, DirtyCell>>({});
  const [status, setStatus] = useState<Record<string, "ok" | "err">>({});
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [catalogueSelectedRows, setCatalogueSelectedRows] = useState<string[]>([]);
  const [catalogueSelectAllMatching, setCatalogueSelectAllMatching] = useState(false);
  const [catalogueLastSelectedId, setCatalogueLastSelectedId] = useState<string | null>(null);
  const [inventorySelectedRows, setInventorySelectedRows] = useState<string[]>([]);
  const [inventorySelectAllMatching, setInventorySelectAllMatching] = useState(false);
  const [inventoryLastSelectedId, setInventoryLastSelectedId] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<AdminProgressState | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedProduct = rows.find((row) => row.id === selected) ?? rows[0] ?? null;
  const sidebarOpen = drawer || sidebarExpanded;

  const lowStock = rows.filter((row) => row.reorder_level > 0 && row.stock_quantity <= row.reorder_level);
  const quotesWaiting = quotes.filter((quote) => quote.status === "new" || quote.status === "contacted");
  const fulfilOrders = orders.filter((order) => order.status === "paid" || order.status === "processing");
  const gaps = rows.filter((row) => row.images.length === 0 || row.cost_price_kes == null || row.compatibleCount === 0);
  const filteredRows = useMemo(() => {
    const scoped = filter === "low" ? lowStock : filter === "out" ? rows.filter((row) => row.stock_quantity === 0) : filter === "zero-cost" ? rows.filter((row) => row.cost_price_kes == null || row.cost_price_kes === 0) : filter === "missing-images" ? rows.filter((row) => row.images.length === 0) : filter === "missing-mpn" ? rows.filter((row) => !row.mpn) : filter === "unmapped" ? rows.filter((row) => row.compatibleCount === 0) : filter === "archived" ? rows.filter((row) => row.archived_at) : rows.filter((row) => !row.archived_at);
    return query.trim() ? scoped.filter((row) => [row.name, row.brand, row.category, row.mpn, row.sku, row.slug].some((value) => String(value ?? "").toLowerCase().includes(query.trim().toLowerCase()))) : scoped;
  }, [filter, lowStock, query, rows]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (drawer) setDrawer(false);
        if (view === "catalogue" && catalogueSelectedRows.length) {
          setCatalogueSelectedRows([]);
          setCatalogueSelectAllMatching(false);
        }
        if (view === "inventory" && inventorySelectedRows.length) {
          setInventorySelectedRows([]);
          setInventorySelectAllMatching(false);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [catalogueSelectedRows.length, drawer, inventorySelectedRows.length, view]);

  useEffect(() => {
    setCatalogueSelectedRows([]);
    setCatalogueSelectAllMatching(false);
    setCatalogueLastSelectedId(null);
    setInventorySelectedRows([]);
    setInventorySelectAllMatching(false);
    setInventoryLastSelectedId(null);
  }, [filter, query]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (Object.keys(dirty).length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function go(next: View, nextFilter = "") {
    if (Object.keys(dirty).length > 0 && !window.confirm("You have unsaved inventory changes. Leave without saving?")) return;
    setView(next);
    setFilter(nextFilter);
    setDrawer(false);
  }

  function updateCell(row: ProductRow, field: DirtyCell["field"], raw: string) {
    const value = field === "mpn" ? raw.trim() || null : raw === "" && field === "cost_price_kes" ? null : Number(raw);
    const original = row[field] as string | number | null;
    const key = `${row.id}:${field}`;
    setDirty((current) => {
      const next = { ...current };
      if (value === original || (typeof value === "number" && Number.isNaN(value))) delete next[key];
      else next[key] = { id: row.id, field, value, original, updatedAt: row.updated_at };
      return next;
    });
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, [field]: typeof value === "number" && Number.isNaN(value) ? original : value } : item));
    setStatus((current) => ({ ...current, [row.id]: undefined as never }));
  }

  function discard() {
    setRows(products);
    setDirty({});
    setStatus({});
    toast.warning("Changes discarded", { description: "The table is back to the saved values." });
  }

  function save() {
    if (isPending) return;
    const grouped = new Map<string, InventoryMatrixEdit>();
    for (const cell of Object.values(dirty)) {
      const edit = grouped.get(cell.id) ?? { id: cell.id, updatedAt: cell.updatedAt, note: "Inventory matrix" };
      edit[cell.field] = cell.value as never;
      grouped.set(cell.id, edit);
    }
    const edits = [...grouped.values()];
    setSaveProgress({ label: "Saving...", stage: "Saving inventory changes", status: "running" });
    startTransition(async () => {
      try {
        const result = await saveInventoryMatrixAction(edits);
        setStatus(Object.fromEntries([...result.ok.map((item) => [item.id, "ok"] as const), ...result.failed.map((item) => [item.id, "err"] as const)]));
        setRows((current) => current.map((row) => {
          const saved = result.ok.find((item) => item.id === row.id);
          return saved ? { ...row, ...saved, updated_at: saved.updatedAt } : products.find((item) => item.id === row.id) ?? row;
        }));
        setDirty((current) => Object.fromEntries(Object.entries(current).filter(([, cell]) => result.failed.some((item) => item.id === cell.id))));
        if (result.failed.length) {
          setSaveProgress({ label: `Saved ${result.ok.length} of ${edits.length}`, stage: "Some rows failed", status: "error" });
          toast.error(`Saved ${result.ok.length} of ${edits.length} changes`, { description: result.failed.map((item) => `${productCode(rows.find((row) => row.id === item.id))}: ${item.reason}`).join("; ") });
        } else {
          setSaveProgress({ label: `Saved ${result.ok.length} change${result.ok.length === 1 ? "" : "s"}`, stage: "Complete", percent: 100, status: "success" });
          toast.success(`Saved ${result.ok.length} change${result.ok.length === 1 ? "" : "s"}`, { description: "Stock movements, price history and audit entries were recorded." });
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : "Inventory save failed.";
        setSaveProgress({ label: "Save failed", stage: text, status: "error" });
        toast.error(text);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-ink">
      <header className="sticky top-0 z-40 flex h-[58px] items-center gap-3 border-b border-[#DDE8EE] bg-white/95 px-3 shadow-[0_1px_0_rgba(20,184,166,0.08)] backdrop-blur lg:px-5">
        <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line text-[#33445A] hover:border-[#BFDAD8] hover:bg-[#ECFAF8] min-[860px]:hidden" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-4 w-4" /></button>
        <Link href="/admin" aria-label="Ceter admin dashboard" className="inline-flex shrink-0 items-center rounded-md focus:outline-none focus:ring-2 focus:ring-accent/25">
          <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={172} height={42} className="h-9 w-auto" priority />
        </Link>
        <div className="hidden min-w-0 text-sm text-slate-500 md:block">
          <button onClick={() => go("dashboard")} className="font-medium text-slate-600 hover:text-ink">Admin</button>
          <span className="px-2 text-slate-300">/</span>
          <span className="font-medium text-ink">{viewCopy[view]}</span>
        </div>
        <label className="relative max-w-[440px] flex-1 md:ml-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4E6478]/60" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 w-full rounded-md border border-[#CAD8E3] bg-[#F7FAFB] pl-9 pr-3 text-[13px] focus:border-[#14B8A6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/15" placeholder="Search products, MPN, brand..." onKeyDown={(event) => { if (event.key === "Enter") go("catalogue"); }} />
        </label>
        <div className="ml-auto hidden gap-1.5 sm:flex">
          <TopIndicator count={lowStock.length} label="low stock" onClick={() => go("inventory", "low")} tone="crit" />
          <TopIndicator count={quotesWaiting.length} label="quotes" onClick={() => go("quotes")} tone="warn" />
          <TopIndicator count={fulfilOrders.length} label="fulfil" onClick={() => go("orders")} tone="mute" />
        </div>
        <div title={session.email ?? "Admin"} className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#BFDAD8] bg-[#F1FBF9] text-[11px] font-semibold text-ink">{initials(session.name ?? session.email ?? "Admin")}</div>
      </header>
      <div className="flex min-h-[calc(100vh-58px)]">
        {drawer ? <button className="fixed inset-0 z-40 bg-[#071426]/40 min-[860px]:hidden" aria-label="Close menu backdrop" onClick={() => setDrawer(false)} /> : null}
        <aside
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
          className={`fixed inset-y-0 left-0 z-50 flex w-[236px] flex-col border-r border-[#DDE8EE] bg-white text-[#33445A] shadow-xl shadow-slate-900/8 transition-[width,transform] duration-200 ease-out min-[860px]:sticky min-[860px]:top-[58px] min-[860px]:h-[calc(100vh-58px)] min-[860px]:translate-x-0 min-[860px]:shadow-none ${drawer ? "max-[859px]:translate-x-0" : "max-[859px]:-translate-x-full"} ${sidebarExpanded ? "min-[860px]:w-[236px]" : "min-[860px]:w-[64px]"}`}
        >
          <div className="flex h-[58px] items-center gap-2 border-b border-[#E7EEF3] px-3 min-[860px]:hidden">
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#33445A]">Admin workspace</span>
            <button className="ml-auto rounded-md p-2 text-slate-500 hover:bg-[#ECFAF8] focus:outline-none focus:ring-2 focus:ring-accent/25" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="h-4 w-4" /></button>
          </div>
          <nav className="flex-1 overflow-hidden px-2 py-3 hover:overflow-auto">
            <p className={`px-2 pb-2 text-[11px] font-medium text-slate-500 transition-opacity ${sidebarOpen ? "opacity-100" : "min-[860px]:opacity-0"}`}>Project</p>
            {nav.map((item) => {
              const Icon = item.icon;
              const active = view === item.view;
              const count = item.view === "catalogue" ? gaps.length : item.view === "inventory" ? lowStock.length : item.view === "quotes" ? quotesWaiting.length : item.view === "orders" ? fulfilOrders.length : null;
              return (
                <button key={item.view} onClick={() => go(item.view)} title={!sidebarOpen ? item.label : undefined} aria-label={item.label} aria-current={active ? "page" : undefined} className={`group relative mb-1 flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-accent/25 ${sidebarOpen ? "" : "min-[860px]:justify-center"} ${active ? "border border-[#BFE8E3] bg-[#EAF8F6] text-ink shadow-[inset_2px_0_0_#14B8A6]" : "border border-transparent text-[#4B5C70] hover:border-[#D5ECE9] hover:bg-[#F2FAF9] hover:text-ink"}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-[#0F766E]" : "text-[#60748A] group-hover:text-[#0F766E]"}`} /> {sidebarOpen ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
                  {count ? !sidebarOpen ? <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent ring-2 ring-white" /> : <span className="ml-auto rounded-full border border-[#CFE9E5] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#38625E]">{count > 99 ? "99+" : count}</span> : null}
                </button>
              );
            })}
          </nav>
          <div className="border-t border-[#E7EEF3] px-2 py-3">
            <SidebarAction collapsed={!sidebarOpen} icon={Store} label="View storefront" href="/" external />
            <SidebarAction collapsed={!sidebarOpen} icon={Settings} label="Settings" disabled />
            <SidebarAction collapsed={!sidebarOpen} icon={UserCircle} label={session.name ?? session.email ?? "Admin Account"} disabled />
            <form action={signOutAction}>
              <SidebarAction collapsed={!sidebarOpen} icon={LogOut} label="Logout" submit danger />
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <main className="w-full max-w-[1500px] px-3 py-4 pb-24 lg:px-5">
            {view === "dashboard" ? <Dashboard rows={rows} quotes={quotes} orders={orders} movements={movements} go={go} setSelected={setSelected} /> : null}
            {view === "catalogue" ? <Catalogue rows={filteredRows} allRows={rows} selected={selectedProduct} setSelected={setSelected} icecatEnabled={icecatEnabled} categories={categories} brands={brands} query={query} setQuery={setQuery} selectedRows={catalogueSelectedRows} setSelectedRows={setCatalogueSelectedRows} selectAllMatching={catalogueSelectAllMatching} setSelectAllMatching={setCatalogueSelectAllMatching} lastSelectedId={catalogueLastSelectedId} setLastSelectedId={setCatalogueLastSelectedId} /> : null}
            {view === "inventory" ? <Inventory rows={filteredRows} filter={filter} setFilter={setFilter} dirty={dirty} status={status} updateCell={updateCell} selectedRows={inventorySelectedRows} setSelectedRows={setInventorySelectedRows} selectAllMatching={inventorySelectAllMatching} setSelectAllMatching={setInventorySelectAllMatching} lastSelectedId={inventoryLastSelectedId} setLastSelectedId={setInventoryLastSelectedId} /> : null}
            {view === "quotes" ? <Quotes quotes={quotes} products={rows} vatRate={vatRate} /> : null}
            {view === "orders" ? <Orders orders={orders} /> : null}
          </main>
        </div>
      </div>

      <div className={`fixed bottom-5 z-50 rounded-lg border border-[#223654] bg-[#0B1E39] px-4 py-3 text-white shadow-2xl transition-transform left-4 right-4 min-[860px]:left-[80px] min-[860px]:right-5 ${Object.keys(dirty).length && view === "inventory" ? "translate-y-0" : "translate-y-40"}`} role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span><span className="font-mono font-semibold">{Object.keys(dirty).length}</span> unsaved changes</span>
          <span className="flex-1" />
          <button onClick={discard} disabled={isPending} className="min-h-9 rounded-lg border border-white/30 px-3 text-sm font-semibold disabled:opacity-60">Discard</button>
          <ProgressButton onClick={save} progress={isPending ? saveProgress : null} className="min-h-9 rounded-lg border border-[#14B8A6] bg-[#14B8A6] px-3 text-sm font-semibold text-[#04241f] disabled:opacity-60">Save changes</ProgressButton>
        </div>
        <div className="mt-2"><AdminProgress progress={saveProgress} compact /></div>
      </div>
    </div>
  );
}

function Dashboard({ rows, quotes, orders, movements, go, setSelected }: { rows: ProductRow[]; quotes: QuoteRow[]; orders: OrderRow[]; movements: MovementRow[]; go: (view: View, filter?: string) => void; setSelected: (id: string) => void }) {
  const restock = rows.filter((row) => row.reorder_level > 0 && row.stock_quantity <= row.reorder_level).sort((a, b) => (a.supplier_name ?? "Unassigned").localeCompare(b.supplier_name ?? "Unassigned"));
  const quoteQueue = quotes.filter((q) => q.status !== "closed");
  const fulfilQueue = orders.filter((order) => order.status === "paid" || order.status === "processing");
  const gaps = rows.filter((row) => row.images.length === 0 || row.cost_price_kes == null || row.compatibleCount === 0 || row.reorder_level <= 0 || !row.supplier_name || !row.mpn);
  return <><ViewHead title="Dashboard" copy="Operations first: restock, quotes, fulfilment, catalogue gaps, then sales." />
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Products monitored" value={formatNumber(rows.length)} />
        <Kpi label="Sales this month" value={formatKes(orders.reduce((sum, item) => sum + item.total, 0))} />
        <Kpi label="Quotes issued" value={String(quotes.length)} />
        <Kpi label="Average margin" value={margin(rows)} />
      </div>
      <div className="grid items-start gap-3 xl:grid-cols-2">
        <Card title="Restock list" tag={`${restock.length} lines`}>
          {restock.length ? restock.slice(0, 5).map((row) => <ListRow key={row.id} title={row.name} sub={`${row.supplier_name ?? "Supplier not set"} | ${formatNumber(row.stock_quantity)} in stock | reorder ${formatNumber(row.reorder_quantity || row.reorder_level)}`} action={!row.supplier_name ? <button onClick={() => { setSelected(row.id); go("catalogue"); }} className="btn-lite min-h-8 text-xs">Set reorder level</button> : undefined} />) : <Empty title="No restock needed" copy="Products above reorder level stay out of this list." action={<button onClick={() => go("inventory", "low")} className="btn-lite">Review inventory</button>} />}
        </Card>
        <Card title="Quotes waiting on us" tag={`${quoteQueue.length} open`}>
          {quoteQueue.length ? quoteQueue.slice(0, 5).map((quote) => <ListRow key={quote.id} title={quote.client} sub={quote.need} action={<Badge tone={quote.followUpAt && new Date(quote.followUpAt) < new Date() ? "crit" : "mute"}>{quote.followUpAt && new Date(quote.followUpAt) < new Date() ? "Overdue" : quote.status}</Badge>} />) : <Empty title="No quotes waiting" copy="New enquiries from the storefront appear here." action={<button onClick={() => go("quotes")} className="btn-dark">New quote</button>} />}
        </Card>
      </div>
      <div className="grid items-start gap-3 xl:grid-cols-3">
        <Card title="Orders to fulfil" tag={`${fulfilQueue.length} active`}>
          {fulfilQueue.length ? fulfilQueue.slice(0, 4).map((order) => <ListRow key={order.id} title={order.ref} sub={order.client} action={<button onClick={() => go("orders")} className="btn-lite min-h-8 text-xs">Open</button>} />) : <Empty title="No orders to fulfil" copy="Paid and processing orders appear here." action={<button onClick={() => go("orders")} className="btn-lite">View orders</button>} />}
        </Card>
        <Card title="Catalogue gaps" tag={`${gaps.length} issues`}>
          {gaps.length ? <>{gaps.slice(0, 4).map((row) => <ListRow key={row.id} title={row.name} sub={gapText(row)} action={<button onClick={() => { setSelected(row.id); go("catalogue"); }} className="btn-lite min-h-8 text-xs">Fix</button>} />)}{gaps.length > 4 ? <div className="border-t border-[#EDF1F6] px-4 py-2 text-right"><button onClick={() => go("catalogue")} className="text-xs font-semibold text-[#0F766E]">View all</button></div> : null}</> : <Empty title="No catalogue gaps" copy="Missing product data and configuration issues appear here." action={<button onClick={() => go("catalogue")} className="btn-lite">Open catalogue</button>} />}
        </Card>
        <Card title="Recent stock movements" tag="Latest">
          {movements.length ? movements.map((movement) => <ListRow key={movement.id} title={`${movement.product} | ${movement.delta > 0 ? "+" : ""}${movement.delta}`} sub={`${movement.reason} | ${movement.reference ?? "No reference"} | ${movement.user}`} action={<span className="font-mono text-xs text-[#5B6B80]">{movement.createdAt}</span>} />) : <Empty title="No movements yet" copy="Stock edits will appear here once the matrix is used." action={<button onClick={() => go("inventory")} className="btn-lite">Open matrix</button>} />}
        </Card>
      </div>
    </div>
  </>;
}

type LookupResult = {
  result: { lookupKey: string; title?: string; description?: string; brand?: string; mpn?: string; gtin?: string; category?: string; images: string[]; specs: Record<string, string> };
  duplicate: { id: string; name: string; slug: string } | null;
  categorySuggestion: { id: string; name: string; slug: string } | null;
  cached: boolean;
};

function Catalogue({ rows, allRows, selected, setSelected, icecatEnabled, categories, brands, query, setQuery, selectedRows, setSelectedRows, selectAllMatching, setSelectAllMatching, lastSelectedId, setLastSelectedId }: { rows: ProductRow[]; allRows: ProductRow[]; selected: ProductRow | null; setSelected: (id: string) => void; icecatEnabled: boolean; categories: Array<{ id: string; name: string; slug: string }>; brands: Array<{ id: string; name: string; slug: string }>; query: string; setQuery: (value: string) => void; selectedRows: string[]; setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>; selectAllMatching: boolean; setSelectAllMatching: (value: boolean) => void; lastSelectedId: string | null; setLastSelectedId: (value: string | null) => void }) {
  const [lookup, setLookup] = useState({ brand: selected?.brand === "Unbranded" ? "" : selected?.brand ?? "", mpn: selected?.mpn ?? selected?.sku ?? "", gtin: "" });
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupMessage, setLookupMessage] = useState("");
  const [commercial, setCommercial] = useState({ priceKes: "", costPriceKes: "", stockQuantity: "", supplierName: "", categoryId: "" });
  const [showImport, setShowImport] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [operationProgress, setOperationProgress] = useState<AdminProgressState | null>(null);
  const [finding, startFinding] = useTransition();
  const busy = finding || operationProgress?.status === "running";
  const visibleRows = rows;

  function findProduct() {
    if (busy) return;
    setLookupMessage("");
    setLookupResult(null);
    setOperationProgress({ label: "Finding...", stage: "Searching catalogue data", status: "running" });
    startFinding(async () => {
      try {
        const response = await fetch("/api/admin/enrichment/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(lookup) });
        const data = await response.json();
        if (!response.ok) {
          const text = data.error ?? "Icecat lookup failed.";
          setLookupMessage(text);
          setOperationProgress({ label: "Lookup failed", stage: text, status: "error" });
          return;
        }
        setLookupResult(data);
        setCommercial((current) => ({ ...current, categoryId: data.categorySuggestion?.id ?? current.categoryId }));
        setOperationProgress({ label: "Lookup complete", stage: "Complete", percent: 100, status: "success" });
      } catch (error) {
        const text = error instanceof Error ? error.message : "Icecat lookup failed.";
        setLookupMessage(text);
        setOperationProgress({ label: "Lookup failed", stage: text, status: "error" });
      }
    });
  }

  function createListing() {
    if (!lookupResult || busy) return;
    setOperationProgress({ label: "Publishing...", stage: "Creating product listing", status: "running" });
    startFinding(async () => {
      try {
        const response = await fetch("/api/admin/enrichment/create-product", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lookup,
            priceKes: Number(commercial.priceKes),
            costPriceKes: Number(commercial.costPriceKes),
            stockQuantity: Number(commercial.stockQuantity),
            supplierName: commercial.supplierName,
            categoryId: commercial.categoryId
          })
        });
        const data = await response.json();
        if (!response.ok) {
          const text = data.message ?? data.error ?? "Could not create product.";
          setLookupMessage(text);
          setOperationProgress({ label: "Publishing failed", stage: text, status: "error" });
          return;
        }
        setOperationProgress({ label: "Published", stage: "Complete", percent: 100, status: "success" });
        toast.success("Product listing created", { description: data.product?.name });
        window.location.reload();
      } catch (error) {
        const text = error instanceof Error ? error.message : "Could not create product.";
        setLookupMessage(text);
        setOperationProgress({ label: "Publishing failed", stage: text, status: "error" });
      }
    });
  }

  function queueEnrichment(ids: string[]) {
    if (busy) return;
    setOperationProgress({ label: "Processing...", stage: "Queueing enrichment", status: "running" });
    startFinding(async () => {
      try {
        const response = await fetch("/api/admin/enrichment/enrich-existing", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productIds: ids }) });
        const data = await response.json();
        if (!response.ok) {
          const text = data.error ?? "Could not queue enrichment.";
          setOperationProgress({ label: "Queue failed", stage: text, status: "error" });
          toast.error(text);
        } else {
          toast.success(`Queued ${data.queued} enrichment job${data.queued === 1 ? "" : "s"}`);
          await processEnrichmentQueue(data.queued ?? ids.length);
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : "Could not queue enrichment.";
        setOperationProgress({ label: "Queue failed", stage: text, status: "error" });
        toast.error(text);
      }
    });
  }

  async function processEnrichmentQueue(maxRuns: number) {
    let applied = 0;
    const total = Math.max(maxRuns, 1);
    for (let index = 0; index < total; index += 1) {
      setOperationProgress({ label: "Processing", stage: "Processing enrichment queue", percent: Math.round((index / total) * 100), status: "running" });
      const response = await fetch("/api/admin/enrichment/process", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setOperationProgress({ label: "Processing failed", stage: data.error ?? "Icecat processing failed.", status: "error" });
        toast.error(data.error ?? "Icecat processing failed.");
        break;
      }
      if (!data.processed) break;
      if (data.applied) applied += 1;
    }
    if (applied) {
      setOperationProgress({ label: `Updated ${applied} product${applied === 1 ? "" : "s"}`, stage: "Complete", percent: 100, status: "success" });
      toast.success(`Icecat updated ${applied} product${applied === 1 ? "" : "s"}`, { description: "Images, specs and descriptions were applied where available." });
      window.location.reload();
    } else {
      setOperationProgress({ label: "Processing complete", stage: "No updates were applied", percent: 100, status: "success" });
    }
  }

  function toggleRow(id: string, event: React.ChangeEvent<HTMLInputElement>) {
    const ids = visibleRows.map((row) => row.id);
    if (event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey && lastSelectedId) {
      const start = ids.indexOf(lastSelectedId);
      const end = ids.indexOf(id);
      if (start >= 0 && end >= 0) {
        const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1);
        setSelectedRows((current) => [...new Set([...current, ...range])]);
        return;
      }
    }
    setLastSelectedId(id);
    setSelectedRows((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function togglePage(checked: boolean) {
    const pageIds = visibleRows.map((row) => row.id);
    setSelectedRows((current) => checked ? [...new Set([...current, ...pageIds])] : current.filter((id) => !pageIds.includes(id)));
  }

  async function runBulk(action: "delete" | "publish" | "unpublish" | "set-category" | "set-price" | "set-stock" | "export") {
    if (busy) return;
    const ids = selectAllMatching ? visibleRows.map((row) => row.id) : selectedRows;
    if (!ids.length) return;
    if (action === "export") {
      setOperationProgress({ label: "Exporting", stage: "Preparing CSV", percent: 20, status: "running" });
      exportSelected(ids, allRows);
      setOperationProgress({ label: "Export ready", stage: "Complete", percent: 100, status: "success" });
      return;
    }
    const value = bulkValue(action, categories);
    if (value === false) return;
    const message = action === "delete"
      ? `This will inspect ${ids.length} selected product(s). Referenced products will be archived and hidden; unreferenced products may be permanently deleted. Continue?`
      : `${bulkLabel(action)} ${ids.length} selected product(s)?`;
    if (!window.confirm(message)) return;
    setOperationProgress({ label: bulkRunningLabel(action), stage: `${bulkRunningLabel(action)} ${ids.length} product${ids.length === 1 ? "" : "s"}`, status: "running" });
    try {
      const result = await bulkProductAction(ids, action, value);
      if (action === "delete") {
        setOperationProgress({ label: "Delete complete", stage: `Archived ${result.archived}, deleted ${result.deleted}`, percent: 100, status: result.failed.length ? "error" : "success" });
        toast.success(`Archived ${result.archived}, deleted ${result.deleted}${result.failed.length ? ` - ${result.failed.length} could not be changed` : ""}`, { description: result.failed.map((item) => item.reason).join("; ") || "Undo window: publish archived products again from the Archived filter." });
        setRowsAfterBulk(result);
      } else {
        setOperationProgress({ label: `${bulkLabel(action)} complete`, stage: `Updated ${result.updated} product${result.updated === 1 ? "" : "s"}`, percent: 100, status: result.failed.length ? "error" : "success" });
        toast.success(`${bulkLabel(action)} ${result.updated} product${result.updated === 1 ? "" : "s"}`);
      }
      setSelectedRows([]);
      setSelectAllMatching(false);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Bulk action failed.";
      setOperationProgress({ label: "Action failed", stage: text, status: "error" });
      toast.error(text);
    }
  }

  function setRowsAfterBulk(result: { archived: number; deleted: number }) {
    if (result.deleted) window.location.reload();
    else if (result.archived) window.location.reload();
  }

  return <><ViewHead title="Catalogue" copy="Products, media and the compatibility map that powers what fits this machine." actions={<><button type="button" onClick={() => setShowImport((current) => !current)} disabled={busy} className={showImport ? "btn-dark" : "btn-lite"}>{showImport ? "Close import" : "Import XLSX"}</button><button type="button" onClick={() => setShowAdd(true)} disabled={busy} className="btn-dark">Add product</button></>} />
    {showAdd ? <AddProductDialog categories={categories} brands={brands} onClose={() => setShowAdd(false)} /> : null}
    {showImport ? <Card title="XLSX import" tag="Preview before commit"><div className="p-3"><ExcelImportPanel /></div></Card> : null}
    <div className="mb-3"><AdminProgress progress={operationProgress} /></div>
    <Card title="Find product">
      <div className="grid gap-2 p-3 md:grid-cols-[1fr_1fr_1fr_auto]">
        <input value={lookup.brand} onChange={(event) => setLookup({ ...lookup, brand: event.target.value })} className="admin-input" placeholder="Brand" />
        <input value={lookup.mpn} onChange={(event) => setLookup({ ...lookup, mpn: event.target.value })} className="admin-input font-mono tabular-nums" placeholder="MPN / model" />
        <input value={lookup.gtin} onChange={(event) => setLookup({ ...lookup, gtin: event.target.value })} className="admin-input font-mono tabular-nums" placeholder="GTIN / EAN" />
        <ProgressButton onClick={findProduct} disabled={!icecatEnabled} progress={busy ? operationProgress : null} className="btn-dark">Find</ProgressButton>
      </div>
      {!icecatEnabled ? <div className="border-t border-line bg-warning/10 px-4 py-3 text-xs text-warning">Icecat is flagged off until credentials and commercial reuse rights are verified. CSV import remains available.</div> : null}
      {lookupMessage ? <div className="border-t border-line bg-danger/10 px-4 py-3 text-xs text-danger">{lookupMessage}</div> : null}
      {lookupResult ? <div className="grid gap-3 border-t border-line p-3 lg:grid-cols-[160px_1fr_300px]">
        <div className="aspect-[4/3] overflow-hidden rounded-md border border-line bg-mist">{lookupResult.result.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lookupResult.result.images[0]} alt={lookupResult.result.title ?? "Icecat product"} className="h-full w-full object-contain p-2" />
        ) : null}</div>
        <div>
          <div className="text-sm font-semibold">{lookupResult.result.title}</div>
          <div className="mt-1 font-mono text-xs text-slate-500">{lookupResult.result.brand} | {lookupResult.result.mpn ?? lookupResult.result.gtin}</div>
          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{lookupResult.result.description}</p>
          <div className="mt-2 flex flex-wrap gap-1"><Badge tone="teal">{lookupResult.cached ? "Cached" : "Icecat result"}</Badge>{lookupResult.result.category ? <Badge tone="mute">{lookupResult.result.category}</Badge> : null}{lookupResult.duplicate ? <Badge tone="warn">Existing product found</Badge> : null}</div>
        </div>
        <div className="grid gap-2">
          {lookupResult.duplicate ? <Link href={`/product/${lookupResult.duplicate.slug}`} className="btn-lite text-center">Open existing product</Link> : <>
            <input value={commercial.priceKes} onChange={(event) => setCommercial({ ...commercial, priceKes: event.target.value })} className="admin-input font-mono tabular-nums" placeholder="Price KSh required" />
            <input value={commercial.costPriceKes} onChange={(event) => setCommercial({ ...commercial, costPriceKes: event.target.value })} className="admin-input font-mono tabular-nums" placeholder="Cost KSh required" />
            <input value={commercial.stockQuantity} onChange={(event) => setCommercial({ ...commercial, stockQuantity: event.target.value })} className="admin-input font-mono tabular-nums" placeholder="Stock required" />
            <input value={commercial.supplierName} onChange={(event) => setCommercial({ ...commercial, supplierName: event.target.value })} className="admin-input" placeholder="Supplier required" />
            <select value={commercial.categoryId} onChange={(event) => setCommercial({ ...commercial, categoryId: event.target.value })} className="admin-input"><option value="">Category required</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <ProgressButton onClick={createListing} progress={busy ? operationProgress : null} className="btn-dark">Create listing</ProgressButton>
          </>}
        </div>
      </div> : null}
    </Card>
    <SelectionActionBar selectedCount={selectAllMatching ? visibleRows.length : selectedRows.length} totalCount={visibleRows.length} selectAllMatching={selectAllMatching} disabled={busy} onSelectAllMatching={() => setSelectAllMatching(true)} onClear={() => { setSelectedRows([]); setSelectAllMatching(false); }} onAction={runBulk} />
    <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card title={`All products`} tag={`${visibleRows.length} of ${allRows.length} items`}>
        <div className="sticky top-0 z-20 border-b border-[#EDF1F6] bg-white p-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="admin-input w-full max-w-md" placeholder="Filter catalogue table" />
        </div>
        <div className="max-h-[calc(100vh-260px)] overflow-auto"><table className="min-w-[880px] w-full table-fixed border-collapse text-[13px]"><colgroup><col className="w-10" /><col className="w-[34%]" /><col className="w-[16%]" /><col className="w-[18%]" /><col className="w-[14%]" /><col className="w-[18%]" /></colgroup><thead><tr><SelectTh rows={visibleRows} selectedRows={selectedRows} onToggle={togglePage} /><Th>Product</Th><Th>Part no.</Th><Th>Category</Th><Th right>Price (KSh)</Th><Th>Status</Th></tr></thead><tbody>
          {visibleRows.map((row) => <tr key={row.id} onClick={() => setSelected(row.id)} className={`cursor-pointer border-b border-[#EDF1F6] hover:bg-[#F7FCFB] ${selected?.id === row.id ? "bg-[#EAF8F6] shadow-[inset_2px_0_0_#14B8A6]" : ""}`}>
            <SelectTd row={row} selected={selectedRows.includes(row.id) || selectAllMatching} onChange={toggleRow} />
            <Td><div className="line-clamp-2 font-medium leading-snug">{row.name}</div><div className="text-xs text-slate-500">{row.brand}</div></Td><Td mono>{partNumber(row)}</Td><Td><span className="line-clamp-2">{row.category}</span></Td><Td right mono nowrap>{formatNumber(row.price_kes)}</Td><Td><ProductBadges row={row} /></Td>
          </tr>)}
          {!visibleRows.length ? <tr><Td /><Td><span className="text-[#5B6B80]">No products match this search.</span></Td><Td /><Td /><Td /><Td /></tr> : null}
        </tbody></table></div>
      </Card>
      <Card title="Compatibility">
        {selected ? <div>
          <div className="border-b border-[#EDF1F6] p-4"><div className="font-semibold">{selected.name}</div><div className="font-mono text-xs text-[#5B6B80]">{productCode(selected)} | {selected.brand}</div><div className="mt-2"><StockBadge row={selected} /></div></div>
          <CompatibilityEditor selected={selected} rows={allRows} />
          {selected.stock_quantity === 0 && selected.consumableCount > 0 ? <div className="border-t border-amber-200 bg-[#FEF3E2] p-3 text-xs text-[#B45309]"><b>This printer is out of stock.</b> Linked consumables may stop moving. Check before reordering.</div> : null}
          <div className="border-t border-line p-3 text-xs text-slate-500">Icecat enrichment: {icecatEnabled ? "enabled" : "flagged off until credentials and licensing are verified"}.</div>
          <div className="border-t border-line p-3"><ProgressButton onClick={() => queueEnrichment([selected.id])} disabled={!icecatEnabled} progress={busy ? operationProgress : null} className="btn-lite">Enrich</ProgressButton></div>
        </div> : <Empty title="No product selected" copy="Select a product to inspect compatibility." />}
      </Card>
    </div>
  </>;
}

function AddProductDialog({ categories, brands, onClose }: { categories: Array<{ id: string; name: string }>; brands: Array<{ id: string; name: string }>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#071426]/55 p-4" role="dialog" aria-modal="true" aria-label="Add product">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-[10px] border border-[#DDE4EC] bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#EDF1F6] px-4 py-3">
          <h2 className="text-[15px] font-semibold">Add product manually</h2>
          <button type="button" onClick={onClose} className="btn-lite ml-auto min-h-8 px-2" aria-label="Close add product"><X className="h-4 w-4" /></button>
        </div>
        <form action={upsertProductAction} className="grid gap-3 p-4 md:grid-cols-2">
          <input name="name" required className="admin-input" placeholder="Product name" />
          <input name="slug" required className="admin-input" placeholder="slug-used-in-url" />
          <input name="mpn" className="admin-input font-mono tabular-nums" placeholder="MPN / model" />
          <input name="sku" className="admin-input font-mono tabular-nums" placeholder="SKU" />
          <select name="category_id" className="admin-input"><option value="">Category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
          <select name="brand_id" className="admin-input"><option value="">Brand</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
          <input name="price_kes" required type="number" min="0" className="admin-input font-mono tabular-nums" placeholder="Price KSh" />
          <input name="cost_price_kes" type="number" min="0" className="admin-input font-mono tabular-nums" placeholder="Cost KSh" />
          <input name="stock_quantity" required type="number" min="0" className="admin-input font-mono tabular-nums" placeholder="Stock quantity" />
          <select name="stock_status" className="admin-input"><option value="in_stock">In stock</option><option value="backorder">Backorder</option><option value="out_of_stock">Out of stock</option></select>
          <select name="condition" className="admin-input"><option value="new">New</option><option value="refurbished">Refurbished</option></select>
          <input name="supplier_name" className="admin-input" placeholder="Supplier" />
          <input name="reorder_level" type="number" min="0" className="admin-input font-mono tabular-nums" placeholder="Reorder level" />
          <input name="reorder_quantity" type="number" min="0" className="admin-input font-mono tabular-nums" placeholder="Reorder quantity" />
          <textarea name="description" required className="admin-input h-24 md:col-span-2" placeholder="Description" />
          <label className="grid gap-1 text-xs font-semibold text-[#33445A] md:col-span-2">
            Primary image upload
            <input name="primary_image_file" type="file" accept="image/*" className="admin-input h-auto py-2" />
          </label>
          <textarea name="images" className="admin-input h-24 md:col-span-2" placeholder="Image URLs, one per line" />
          <textarea name="specs" className="admin-input h-24 md:col-span-2" placeholder="Specs, one per line: Paper size: A4" />
          <label className="flex items-center gap-2 text-sm font-semibold text-[#33445A]"><input name="is_published" type="checkbox" defaultChecked /> Published</label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#33445A]"><input name="is_featured" type="checkbox" /> Featured</label>
          <div className="flex justify-end gap-2 border-t border-[#EDF1F6] pt-3 md:col-span-2">
            <button type="button" onClick={onClose} className="btn-lite">Cancel</button>
            <FormSubmitButton pendingText="Uploading image and saving..." className="btn-dark">Create product</FormSubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function Inventory({ rows, filter, setFilter, dirty, status, updateCell, selectedRows, setSelectedRows, selectAllMatching, setSelectAllMatching, lastSelectedId, setLastSelectedId }: { rows: ProductRow[]; filter: string; setFilter: (value: string) => void; dirty: Record<string, DirtyCell>; status: Record<string, "ok" | "err">; updateCell: (row: ProductRow, field: DirtyCell["field"], raw: string) => void; selectedRows: string[]; setSelectedRows: React.Dispatch<React.SetStateAction<string[]>>; selectAllMatching: boolean; setSelectAllMatching: (value: boolean) => void; lastSelectedId: string | null; setLastSelectedId: (value: string | null) => void }) {
  const [operationProgress, setOperationProgress] = useState<AdminProgressState | null>(null);
  const busy = operationProgress?.status === "running";

  function exportRows() {
    if (busy) return;
    setOperationProgress({ label: "Exporting", stage: "Preparing inventory CSV", percent: 25, status: "running" });
    const csv = ["Product,MPN,SKU,Stock,Price,Cost,Status", ...rows.map((row) => [row.name, row.mpn ?? "", row.sku ?? "", row.stock_quantity, row.price_kes, row.cost_price_kes ?? "", row.stock_status].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ceter-inventory.csv";
    link.click();
    URL.revokeObjectURL(url);
    setOperationProgress({ label: "Export ready", stage: "Complete", percent: 100, status: "success" });
  }

  function toggleRow(id: string, event: React.ChangeEvent<HTMLInputElement>) {
    const ids = rows.map((row) => row.id);
    if (event.nativeEvent instanceof MouseEvent && event.nativeEvent.shiftKey && lastSelectedId) {
      const start = ids.indexOf(lastSelectedId);
      const end = ids.indexOf(id);
      if (start >= 0 && end >= 0) {
        setSelectedRows((current) => [...new Set([...current, ...ids.slice(Math.min(start, end), Math.max(start, end) + 1)])]);
        return;
      }
    }
    setLastSelectedId(id);
    setSelectedRows((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  async function runBulk(action: "delete" | "publish" | "unpublish" | "set-category" | "set-price" | "set-stock" | "export") {
    if (busy) return;
    const ids = selectAllMatching ? rows.map((row) => row.id) : selectedRows;
    if (!ids.length) return;
    if (action === "export") {
      setOperationProgress({ label: "Exporting", stage: "Preparing selected CSV", percent: 25, status: "running" });
      exportSelected(ids, rows);
      setOperationProgress({ label: "Export ready", stage: "Complete", percent: 100, status: "success" });
      return;
    }
    const value = bulkValue(action);
    if (value === false) return;
    const message = action === "delete"
      ? `This will inspect ${ids.length} selected product(s). Referenced products will be archived and hidden; unreferenced products may be permanently deleted. Continue?`
      : `${bulkLabel(action)} ${ids.length} selected product(s)?`;
    if (!window.confirm(message)) return;
    setOperationProgress({ label: bulkRunningLabel(action), stage: `${bulkRunningLabel(action)} ${ids.length} product${ids.length === 1 ? "" : "s"}`, status: "running" });
    try {
      const result = await bulkProductAction(ids, action, value);
      if (action === "delete") {
        setOperationProgress({ label: "Delete complete", stage: `Archived ${result.archived}, deleted ${result.deleted}`, percent: 100, status: result.failed.length ? "error" : "success" });
        toast.success(`Archived ${result.archived}, deleted ${result.deleted}${result.failed.length ? ` - ${result.failed.length} could not be changed` : ""}`);
      } else {
        setOperationProgress({ label: `${bulkLabel(action)} complete`, stage: `Updated ${result.updated} product${result.updated === 1 ? "" : "s"}`, percent: 100, status: result.failed.length ? "error" : "success" });
        toast.success(`${bulkLabel(action)} ${result.updated} product${result.updated === 1 ? "" : "s"}`);
      }
      setSelectedRows([]);
      setSelectAllMatching(false);
      window.location.reload();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Bulk action failed.";
      setOperationProgress({ label: "Action failed", stage: text, status: "error" });
      toast.error(text);
    }
  }

  const filters = [
    ["out", "Out of stock"],
    ["zero-cost", "Zero cost"],
    ["missing-mpn", "Missing MPN"],
    ["missing-images", "Missing images"],
    ["unmapped", "Unmapped"],
    ["archived", "Archived"]
  ] as const;
  return <><ViewHead title="Inventory" copy="Edit stock and prices straight in the table. Tab across, Enter moves down, Esc reverts a cell." actions={<><button onClick={() => setFilter(filter === "low" ? "" : "low")} disabled={busy} className={filter === "low" ? "btn-dark" : "btn-lite"}>Low stock</button><ProgressButton onClick={exportRows} progress={busy ? operationProgress : null} className="btn-lite">Export</ProgressButton></>} />
    <AdminProgress progress={operationProgress} />
    <SelectionActionBar selectedCount={selectAllMatching ? rows.length : selectedRows.length} totalCount={rows.length} selectAllMatching={selectAllMatching} disabled={busy} onSelectAllMatching={() => setSelectAllMatching(true)} onClear={() => { setSelectedRows([]); setSelectAllMatching(false); }} onAction={runBulk} />
    <Card title="Stock and pricing" tag={`${rows.length} rows | every change is logged against your name`}>
      <div className="flex flex-wrap gap-1.5 border-b border-[#EDF1F6] bg-white p-3 text-xs">
        <button onClick={() => setFilter("")} disabled={busy} className={!filter ? "btn-dark min-h-8 text-xs" : "btn-lite min-h-8 text-xs"}>Active</button>
        {filters.map(([value, label]) => <button key={value} disabled={busy} onClick={() => setFilter(value)} className={filter === value ? "btn-dark min-h-8 text-xs" : "btn-lite min-h-8 text-xs"}>{label}</button>)}
      </div>
      <MissingMpnNotice count={rows.filter((row) => !row.mpn).length} onClick={() => setFilter("missing-mpn")} />
      <div className="max-h-[calc(100vh-230px)] overflow-auto"><table className="min-w-[1080px] w-full table-fixed border-collapse text-[13px]"><colgroup><col className="w-10" /><col className="w-[32%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[12%]" /><col className="w-[12%]" /><col className="w-[9%]" /><col className="w-[10%]" /></colgroup><thead><tr><SelectTh rows={rows} selectedRows={selectedRows} onToggle={(checked) => setSelectedRows((current) => checked ? [...new Set([...current, ...rows.map((row) => row.id)])] : current.filter((id) => !rows.some((row) => row.id === id)))} /><Th sticky>Product</Th><Th>MPN</Th><Th right>Stock</Th><Th right>Price (KSh)</Th><Th right>Cost (KSh)</Th><Th right>Margin</Th><Th>Status</Th></tr></thead><tbody>
        {rows.map((row) => {
          const isDirty = Object.keys(dirty).some((key) => key.startsWith(`${row.id}:`));
          return <tr key={row.id} className={`border-b border-[#EDF1F6] hover:bg-[#F7FCFB] ${selectedRows.includes(row.id) || selectAllMatching ? "bg-[#EAF8F6] shadow-[inset_2px_0_0_#14B8A6]" : ""} ${isDirty ? "bg-[#FFF8E8]" : ""} ${status[row.id] === "ok" ? "bg-[#E7F6EE]" : ""} ${status[row.id] === "err" ? "bg-[#FDECEC]" : ""}`}>
            <SelectTd row={row} selected={selectedRows.includes(row.id) || selectAllMatching} onChange={toggleRow} />
            <Td sticky><div className="line-clamp-2 font-medium leading-snug">{row.name}</div><div className="text-xs text-[#5B6B80]">{row.brand} | {row.category}</div></Td>
            <EditTd row={row} field="mpn" dirty={dirty} updateCell={updateCell} />
            <EditTd row={row} field="stock_quantity" dirty={dirty} updateCell={updateCell} />
            <EditTd row={row} field="price_kes" dirty={dirty} updateCell={updateCell} />
            <EditTd row={row} field="cost_price_kes" dirty={dirty} updateCell={updateCell} nullable /><Td right mono nowrap>{row.cost_price_kes && row.price_kes ? `${Math.round((1 - row.cost_price_kes / row.price_kes) * 1000) / 10}%` : "-"}</Td>
            <Td><StockBadge row={row} /></Td>
          </tr>;
        })}
        {!rows.length ? <tr><td colSpan={8}><Empty title="No inventory rows" copy="Clear the filters or import catalogue items to populate the matrix." /></td></tr> : null}
      </tbody></table></div>
    </Card>
  </>;
}

function Quotes({ quotes, products, vatRate }: { quotes: QuoteRow[]; products: ProductRow[]; vatRate: number }) {
  const [lines, setLines] = useState<Array<{ id: string; qty: number; price: number }>>([]);
  const [pendingQuote, setPendingQuote] = useState("");
  const [progress, setProgress] = useState<AdminProgressState | null>(null);
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const vat = Math.round(subtotal * vatRate);
  const cost = lines.reduce((sum, line) => sum + line.qty * (products.find((product) => product.id === line.id)?.cost_price_kes ?? 0), 0);
  const stages = ["new", "contacted", "quoted", "won", "closed"];

  async function updateQuote(quote: QuoteRow, status: string) {
    if (pendingQuote) return;
    setPendingQuote(quote.id);
    setProgress({ label: "Saving...", stage: `Updating ${quote.ref}`, status: "running" });
    try {
      const formData = new FormData();
      formData.set("id", quote.id);
      formData.set("status", status);
      await updateQuoteStatusAction(formData);
      setProgress({ label: "Quote updated", stage: "Complete", percent: 100, status: "success" });
      toast.success("Quote status updated", { description: `${quote.ref} is now ${status}.` });
      window.location.reload();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not update quote.";
      setProgress({ label: "Quote update failed", stage: text, status: "error" });
      toast.error(text);
    } finally {
      setPendingQuote("");
    }
  }

  return <><ViewHead title="Quotes & tenders" copy="Every enquiry has an owner and a follow-up date. Prices are frozen onto the quote when issued." />
    <div className="mb-3"><AdminProgress progress={progress} /></div>
    <div className="mb-3 grid gap-2 sm:grid-cols-5">{stages.map((stage) => <button key={stage} className="rounded-md border border-[#DDE8EE] bg-white p-3 text-left hover:border-[#CFE9E5] hover:bg-[#F7FCFB]"><div className="font-mono text-lg font-semibold">{quotes.filter((q) => q.status === stage).length}</div><div className="text-xs capitalize text-[#5B6B80]">{stage}</div></button>)}</div>
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]"><Card title="Enquiries" tag={`${quotes.length} total`}>{quotes.length ? <div className="max-h-[calc(100vh-275px)] overflow-auto"><table className="min-w-[860px] w-full text-[13px]"><thead><tr><Th>Ref</Th><Th>Client</Th><Th>Requirement</Th><Th>Owner</Th><Th right>Value (KSh)</Th><Th>Follow-up</Th><Th>Action</Th></tr></thead><tbody>{quotes.map((q) => <tr key={q.id} className="border-b border-[#EDF1F6] hover:bg-[#F7FCFB]"><Td mono>{q.ref}</Td><Td>{q.client}</Td><Td><span className="line-clamp-2">{q.need}</span></Td><Td>{q.owner || <Badge tone="warn">Unassigned</Badge>}</Td><Td right mono>{q.value ? formatNumber(q.value) : "-"}</Td><Td><Badge tone={q.followUpAt && new Date(q.followUpAt) < new Date() ? "crit" : "mute"}>{q.followUpAt && new Date(q.followUpAt) < new Date() ? "Overdue" : q.status}</Badge></Td><Td><QuoteStatusAction quote={q} pending={pendingQuote === q.id ? progress : null} disabled={Boolean(pendingQuote) && pendingQuote !== q.id} onUpdate={updateQuote} /></Td></tr>)}</tbody></table></div> : <Empty title="No open enquiries" copy="Storefront quote requests and tender leads appear here." action={<button className="btn-dark">New quote</button>} />}</Card>
      <div className="xl:sticky xl:top-[74px] xl:self-start"><Card title="Quotation builder" tag="Draft"><div className="max-h-56 overflow-auto border-b border-[#EDF1F6]">{products.slice(0, 7).map((product) => <button key={product.id} onClick={() => setLines((current) => current.some((line) => line.id === product.id) ? current.map((line) => line.id === product.id ? { ...line, qty: line.qty + 1 } : line) : [...current, { id: product.id, qty: 1, price: product.price_kes }])} className="flex w-full items-center gap-2 border-b border-[#EDF1F6] px-3 py-2 text-left hover:bg-[#E6FAF7]"><span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{product.name}</span><span className="font-mono text-xs text-[#5B6B80]">{productCode(product)} | {formatNumber(product.stock_quantity)} in stock</span></span><span className="font-mono text-xs tabular-nums">{formatNumber(product.price_kes)}</span></button>)}</div>
        {lines.length ? <div><table className="w-full text-xs"><tbody>{lines.map((line) => { const product = products.find((item) => item.id === line.id); return <tr key={line.id} className="border-b border-[#EDF1F6]"><Td>{product?.name}</Td><Td right mono>{line.qty}</Td><Td right mono nowrap>{formatNumber(line.price)}</Td></tr>; })}</tbody></table><div className="border-t border-[#DDE4EC] p-4 text-sm"><Total label="Subtotal" value={subtotal} /><Total label={`VAT ${Math.round(vatRate * 100)}%`} value={vat} /><div className="flex justify-between py-1"><span className="text-[#5B6B80]">Margin</span><span className="font-mono text-[#0F7B4F]">{subtotal ? `${Math.round((1 - cost / subtotal) * 1000) / 10}%` : "0%"}</span></div><Total label="Total" value={subtotal + vat} big /></div></div> : <Empty title="No lines yet" copy="Search above and click a product to build the quotation." action={<button className="btn-lite">Add custom line</button>} />}</Card></div></div>
  </>;
}

function Orders({ orders }: { orders: OrderRow[] }) {
  const [pending, setPending] = useState("");
  const [progress, setProgress] = useState<AdminProgressState | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState(orders[0]?.id ?? "");
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;
  function fulfil(order: OrderRow) {
    if (pending) return;
    setPending(order.id);
    setProgress({ label: "Processing...", stage: `Fulfilling ${order.ref}`, status: "running" });
    fetch("/api/admin/orders/status", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: order.id, status: "fulfilled" }) })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not fulfil order.");
        setProgress({ label: "Order fulfilled", stage: "Complete", percent: 100, status: "success" });
        toast.success("Order fulfilled");
        window.location.reload();
      })
      .catch((error) => {
        const text = error instanceof Error ? error.message : "Could not fulfil order.";
        setProgress({ label: "Fulfilment failed", stage: text, status: "error" });
        toast.error(text);
      })
      .finally(() => setPending(""));
  }
  return <><ViewHead title="Orders" copy="Stock leaves the books at fulfilment, not at checkout. Equipment lines get serial numbers here." />
    <div className="mb-3"><AdminProgress progress={progress} /></div>
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card title="Orders" tag={`${orders.length} total`}>{orders.length ? <div className="max-h-[calc(100vh-220px)] overflow-auto"><table className="min-w-[760px] w-full text-[13px]"><thead><tr><Th>Ref</Th><Th>Client</Th><Th right>Lines</Th><Th right>Total (KSh)</Th><Th>Payment</Th><Th>Fulfilment</Th><Th>Status</Th><Th /></tr></thead><tbody>{orders.map((order) => <tr key={order.id} onClick={() => setSelectedOrderId(order.id)} className={`cursor-pointer border-b border-[#EDF1F6] hover:bg-[#F7FCFB] ${selectedOrder?.id === order.id ? "bg-[#EAF8F6] shadow-[inset_2px_0_0_#14B8A6]" : ""}`}><Td mono>{order.ref}</Td><Td>{order.client}</Td><Td right mono>{order.lines}</Td><Td right mono>{formatNumber(order.total)}</Td><Td><Badge tone={order.status === "paid" || order.status === "processing" || order.status === "fulfilled" ? "ok" : "warn"}>{order.status === "pending" ? "pending" : "paid"}</Badge></Td><Td><Badge tone={order.status === "fulfilled" ? "ok" : order.status === "paid" || order.status === "processing" ? "teal" : "mute"}>{order.status === "fulfilled" ? "fulfilled" : order.needsSerials ? "serials needed" : "open"}</Badge></Td><Td><Badge tone={order.status === "fulfilled" ? "ok" : order.status === "paid" || order.status === "processing" ? "teal" : "warn"}>{order.status}</Badge></Td><Td right>{order.status === "fulfilled" || order.needsSerials ? null : <ProgressButton onClick={(event) => { event.stopPropagation(); fulfil(order); }} disabled={Boolean(pending) && pending !== order.id} progress={pending === order.id ? progress : null} className="btn-lite min-h-8 text-xs">Fulfil</ProgressButton>}</Td></tr>)}</tbody></table></div> : <Empty title="No open orders" copy="Paid storefront orders appear here for fulfilment." action={<Link href="/" className="btn-lite">View storefront</Link>} />}</Card>
      <div className="xl:sticky xl:top-[74px] xl:self-start">
        <Card title="Order detail" tag={selectedOrder?.ref}>{selectedOrder ? <div>
          <ListRow title={selectedOrder.client} sub={`Created ${new Date(selectedOrder.createdAt).toLocaleDateString("en-KE")}`} action={<Badge tone={selectedOrder.status === "fulfilled" ? "ok" : "teal"}>{selectedOrder.status}</Badge>} />
          <div className="grid grid-cols-2 gap-2 border-b border-[#EDF1F6] p-3 text-sm">
            <div><div className="text-xs text-[#5B6B80]">Payment</div><Badge tone={selectedOrder.status === "pending" ? "warn" : "ok"}>{selectedOrder.status === "pending" ? "Pending" : "Paid"}</Badge></div>
            <div><div className="text-xs text-[#5B6B80]">Fulfilment</div><Badge tone={selectedOrder.status === "fulfilled" ? "ok" : "mute"}>{selectedOrder.status === "fulfilled" ? "Done" : "Open"}</Badge></div>
            <div><div className="text-xs text-[#5B6B80]">Lines</div><div className="font-mono">{selectedOrder.lines}</div></div>
            <div><div className="text-xs text-[#5B6B80]">Total</div><div className="font-mono">{formatKes(selectedOrder.total)}</div></div>
          </div>
          <ListRow title="Serial numbers" sub={selectedOrder.needsSerials ? "Equipment serials must be completed before closing." : "No serials required for this order."} action={selectedOrder.needsSerials ? <input className="h-8 w-36 rounded-md border border-line px-2 text-xs" placeholder="Scan serial" /> : <Badge tone="mute">Not tracked</Badge>} />
          {selectedOrder.status === "fulfilled" || selectedOrder.needsSerials ? null : <div className="p-3"><ProgressButton onClick={() => fulfil(selectedOrder)} disabled={Boolean(pending) && pending !== selectedOrder.id} progress={pending === selectedOrder.id ? progress : null} className="btn-dark w-full">Mark fulfilled</ProgressButton></div>}
        </div> : <Empty title="No order selected" copy="Select an order from the table to inspect fulfilment state." />}</Card>
      </div>
    </div>
  </>;
}

function QuoteStatusAction({ quote, pending, disabled, onUpdate }: { quote: QuoteRow; pending: AdminProgressState | null; disabled?: boolean; onUpdate: (quote: QuoteRow, status: string) => void }) {
  const next = quote.status === "new" ? "contacted" : quote.status === "contacted" ? "quoted" : quote.status === "quoted" ? "won" : "closed";
  const label = quote.status === "won" || quote.status === "closed" ? "Close" : `Mark ${next}`;
  return <ProgressButton onClick={() => onUpdate(quote, next)} disabled={disabled || quote.status === "closed"} progress={pending} className="btn-lite min-h-8 whitespace-nowrap text-xs">{label}</ProgressButton>;
}

function SidebarAction({ collapsed, icon: Icon, label, href, external, submit, disabled, danger }: { collapsed: boolean; icon: React.ComponentType<{ className?: string }>; label: string; href?: string; external?: boolean; submit?: boolean; disabled?: boolean; danger?: boolean }) {
  const className = `mb-0.5 flex h-9 w-full items-center gap-2 overflow-hidden rounded-md border border-transparent px-2 text-left text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-accent/25 ${collapsed ? "min-[860px]:justify-center" : ""} ${danger ? "text-red-600 hover:border-red-100 hover:bg-red-50" : disabled ? "cursor-not-allowed text-slate-400" : "text-[#4B5C70] hover:border-[#D5ECE9] hover:bg-[#F2FAF9] hover:text-ink"}`;
  const content = <><Icon className="h-4 w-4 shrink-0" />{collapsed ? <span className="sr-only">{label}</span> : <span className="truncate">{label}</span>}</>;
  if (href) return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} title={collapsed ? label : undefined} className={className}>{content}</a>;
  return <button type={submit ? "submit" : "button"} disabled={disabled} title={collapsed ? label : undefined} className={className}>{content}</button>;
}
function TopIndicator({ count, label, tone, onClick }: { count: number; label: string; tone: "crit" | "warn" | "mute"; onClick: () => void }) {
  const toneClass = tone === "crit" ? "border-red-100 bg-red-50/70 text-red-700 hover:bg-red-50" : tone === "warn" ? "border-amber-100 bg-amber-50/70 text-amber-700 hover:bg-amber-50" : "border-[#CFE9E5] bg-[#F1FBF9] text-[#38625E] hover:bg-[#E6F7F5]";
  return <button onClick={onClick} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium ${toneClass}`}><span className="font-mono tabular-nums">{count}</span>{label}</button>;
}
function ViewHead({ title, copy, actions }: { title: string; copy: string; actions?: React.ReactNode }) { return <div className="mb-4 flex flex-wrap items-end gap-3"><div><h1 className="m-0 text-[20px] font-semibold tracking-normal">{title}</h1><p className="mt-1 text-[13px] text-[#5B6B80]">{copy}</p></div><div className="flex-1" />{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</div>; }
function Card({ title, tag, children }: { title: string; tag?: string; children: React.ReactNode }) { return <section className="mb-3 overflow-hidden rounded-md border border-[#DDE8EE] bg-white shadow-[0_1px_2px_rgba(11,30,57,0.04)]"><h2 className="flex min-h-10 items-center gap-2 border-b border-[#E7EEF3] bg-[#FBFDFD] px-3 py-2 text-[13px] font-semibold shadow-[inset_2px_0_0_rgba(20,184,166,0.18)]">{title}{tag ? <span className="ml-auto rounded-full bg-[#F1FBF9] px-2 py-0.5 text-[11.5px] font-medium text-[#38625E]">{tag}</span> : null}</h2>{children}</section>; }
function Empty({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) { return <div className="px-4 py-7 text-center text-sm text-[#5B6B80]"><b className="mb-1 block text-[#0B1E39]">{title}</b><span className="block">{copy}</span>{action ? <div className="mt-3">{action}</div> : null}</div>; }
function ListRow({ title, sub, action }: { title: React.ReactNode; sub: React.ReactNode; action?: React.ReactNode }) { return <div className="flex min-h-12 items-center gap-3 border-b border-[#EDF1F6] px-3 py-2 last:border-b-0 hover:bg-[#F7FCFB]"><div className="min-w-0 flex-1"><div className="truncate text-[13px] font-medium">{title}</div><div className="truncate text-xs text-[#5B6B80]">{sub}</div></div>{action}</div>; }
function Kpi({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-[#DDE8EE] bg-white p-3 shadow-[inset_0_1px_0_rgba(20,184,166,0.06)]"><div className="font-mono text-xl font-semibold tabular-nums text-[#0B1E39]">{value}</div><div className="mt-1 text-xs text-[#5B6B80]">{label}</div></div>; }
function Th({ children, right, sticky }: { children?: React.ReactNode; right?: boolean; sticky?: boolean }) { return <th className={`sticky top-0 z-30 border-b border-[#DDE8EE] bg-[#F4F8F8] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-normal text-[#52677B] shadow-[0_1px_0_#DDE8EE] ${sticky ? "left-0 z-40" : ""} ${right ? "text-right" : "text-left"}`}>{children}</th>; }
function Td({ children, right, mono, nowrap, sticky }: { children?: React.ReactNode; right?: boolean; mono?: boolean; nowrap?: boolean; sticky?: boolean }) { return <td className={`px-3 py-2 align-middle ${sticky ? "sticky left-0 z-10 bg-inherit shadow-[1px_0_0_#EDF1F6]" : ""} ${right ? "text-right" : ""} ${mono ? "font-mono tabular-nums" : ""} ${nowrap ? "whitespace-nowrap" : ""}`}>{children}</td>; }
function EditTd({ row, field, dirty, updateCell, nullable }: { row: ProductRow; field: DirtyCell["field"]; dirty: Record<string, DirtyCell>; updateCell: (row: ProductRow, field: DirtyCell["field"], raw: string) => void; nullable?: boolean }) { const [focused, setFocused] = useState(false); const key = `${row.id}:${field}`; const value = row[field]; const text = field === "mpn"; const displayValue = text || focused ? value ?? "" : value == null ? "" : formatNumber(Number(value)); return <td className="px-3 py-1 text-right"><input value={displayValue} type="text" inputMode={text ? "text" : "numeric"} onChange={(event) => updateCell(row, field, text ? event.target.value : event.target.value.replace(/,/g, ""))} onFocus={(event) => { setFocused(true); requestAnimationFrame(() => event.currentTarget.select()); }} onBlur={() => setFocused(false)} onKeyDown={(event) => { if (event.key === "Escape") updateCell(row, field, String(dirty[key]?.original ?? value ?? "")); if (event.key === "Enter") { event.preventDefault(); const inputs = [...document.querySelectorAll<HTMLInputElement>(`input[data-field="${field}"]`)]; inputs[inputs.indexOf(event.currentTarget) + 1]?.focus(); } }} data-field={field} aria-label={`${field} for ${productCode(row)}`} className={`w-full min-w-24 rounded-md border px-2 py-1.5 ${text ? "text-left placeholder:text-slate-400" : "text-right font-mono tabular-nums"} focus:border-[#14B8A6] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 ${dirty[key] ? "border-[#EBD9A6] bg-[#FFF9E8]" : "border-transparent bg-transparent hover:border-[#DDE4EC]"}`} placeholder={nullable ? "-" : text ? "???" : undefined} /></td>; }
function MissingMpnNotice({ count, onClick }: { count: number; onClick: () => void }) {
  if (!count) return null;
  return <div className="flex flex-wrap items-center gap-2 border-b border-[#EDF1F6] bg-[#FBFDFF] px-3 py-2 text-xs text-[#5B6B80]"><b className="text-[#0B1E39]">{count} products missing a part number</b><button onClick={onClick} className="font-semibold text-[#0F766E]">Filter</button></div>;
}
function SelectTh({ rows, selectedRows, onToggle }: { rows: ProductRow[]; selectedRows: string[]; onToggle: (checked: boolean) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const pageIds = rows.map((row) => row.id);
  const selectedOnPage = pageIds.filter((id) => selectedRows.includes(id)).length;
  const checked = rows.length > 0 && selectedOnPage === rows.length;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = selectedOnPage > 0 && selectedOnPage < rows.length;
  }, [rows.length, selectedOnPage]);
  return <th className="sticky top-0 z-30 w-10 border-b border-[#DDE8EE] bg-[#F4F8F8] px-3 py-2 shadow-sm"><input ref={ref} type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} aria-label="Select all rows on this page" className="h-4 w-4 rounded border-slate-300 accent-[#14B8A6]" /></th>;
}
function SelectTd({ row, selected, onChange }: { row: ProductRow; selected: boolean; onChange: (id: string, event: React.ChangeEvent<HTMLInputElement>) => void }) {
  return <td className="w-10 px-3 py-2" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={selected} onChange={(event) => onChange(row.id, event)} aria-label={`Select ${row.name}`} className="h-4 w-4 rounded border-slate-300 accent-[#14B8A6]" /></td>;
}
function SelectionActionBar({ selectedCount, totalCount, selectAllMatching, disabled, onSelectAllMatching, onClear, onAction }: { selectedCount: number; totalCount: number; selectAllMatching: boolean; disabled?: boolean; onSelectAllMatching: () => void; onClear: () => void; onAction: (action: "delete" | "publish" | "unpublish" | "set-category" | "set-price" | "set-stock" | "export") => void }) {
  const visible = selectedCount > 0;
  const buttonClass = "rounded-md border border-white/25 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60";
  return <div className={`fixed bottom-5 z-50 rounded-[8px] border border-[#223654] bg-[#0B1E39] px-3 py-2 text-white shadow-2xl transition-transform left-4 right-4 lg:left-[80px] lg:right-6 ${visible ? "translate-y-0" : "pointer-events-none translate-y-40"}`} role="region" aria-label="Bulk actions">
    <div className="flex min-h-10 flex-wrap items-center gap-2">
      <span className="mr-2 text-sm font-semibold"><span className="font-mono">{selectedCount}</span> selected</span>
      {!selectAllMatching && selectedCount < totalCount ? <button disabled={disabled} className={buttonClass} onClick={onSelectAllMatching}>Select all {totalCount} matching this filter</button> : null}
      <button disabled={disabled} className={buttonClass} onClick={() => onAction("publish")}><Check className="mr-1 inline h-3.5 w-3.5" />Publish</button>
      <button disabled={disabled} className={buttonClass} onClick={() => onAction("unpublish")}><Archive className="mr-1 inline h-3.5 w-3.5" />Unpublish</button>
      <button disabled={disabled} className="rounded-md border border-red-300/60 bg-red-500/15 px-2.5 py-1.5 text-xs font-semibold hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => onAction("delete")}><Trash2 className="mr-1 inline h-3.5 w-3.5" />Delete selected</button>
      <button disabled={disabled} className={buttonClass} onClick={() => onAction("set-category")}>Set category</button>
      <button disabled={disabled} className={buttonClass} onClick={() => onAction("set-price")}>Adjust price</button>
      <button disabled={disabled} className={buttonClass} onClick={() => onAction("set-stock")}>Set stock</button>
      <button disabled={disabled} className={buttonClass} onClick={() => onAction("export")}>Export selected</button>
      <button disabled={disabled} className="ml-auto rounded-md border border-white/25 px-2.5 py-1.5 text-xs font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60" onClick={onClear}>Clear selection</button>
    </div>
  </div>;
}
function Badge({ tone, children }: { tone: "ok" | "warn" | "crit" | "mute" | "teal"; children: React.ReactNode }) { const classes = { ok: "border-green-100 bg-green-50 text-green-700", warn: "border-amber-100 bg-amber-50 text-amber-700", crit: "border-red-100 bg-red-50 text-red-700", mute: "border-slate-200 bg-slate-100 text-slate-600", teal: "border-[#CFE9E5] bg-[#EAF8F6] text-[#0F766E]" }; return <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11.5px] font-semibold ${classes[tone]}`}>{children}</span>; }
function StockBadge({ row }: { row: ProductRow }) { if (row.stock_quantity <= 0) return <Badge tone="crit">Out of stock</Badge>; if (row.stock_quantity <= row.reorder_level) return <Badge tone="crit">Restock now</Badge>; if (row.reorder_level > 0 && row.stock_quantity <= row.reorder_level * 1.6) return <Badge tone="warn">Getting low</Badge>; return <Badge tone="ok">In stock</Badge>; }
function CompatibilityEditor({ selected, rows }: { selected: ProductRow; rows: ProductRow[] }) {
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState<CompatibilityRow["relationType"]>("TONER");
  const [direction, setDirection] = useState<"printer" | "consumable">("printer");
  const [progress, setProgress] = useState<AdminProgressState | null>(null);
  const [pending, startTransition] = useTransition();
  const busy = pending || progress?.status === "running";
  const matches = rows
    .filter((row) => row.id !== selected.id)
    .filter((row) => !search.trim() || [row.name, row.brand, row.category, row.mpn, row.sku].some((value) => String(value ?? "").toLowerCase().includes(search.trim().toLowerCase())))
    .slice(0, 8);

  function attach() {
    const otherId = targetId || matches[0]?.id;
    if (!otherId || busy) return;
    const input = direction === "printer"
      ? { printerId: selected.id, consumableId: otherId, relationType }
      : { printerId: otherId, consumableId: selected.id, relationType };
    setProgress({ label: "Saving...", stage: "Attaching compatibility", status: "running" });
    startTransition(async () => {
      try {
        await upsertCompatibilityAction(input);
        setProgress({ label: "Compatibility attached", stage: "Complete", percent: 100, status: "success" });
        toast.success("Compatibility mapping attached");
        window.location.reload();
      } catch (error) {
        setProgress({ label: "Save failed", stage: error instanceof Error ? error.message : "Could not attach mapping.", status: "error" });
        toast.error(error instanceof Error ? error.message : "Could not attach mapping.");
      }
    });
  }

  function remove(id: string) {
    if (busy) return;
    setProgress({ label: "Deleting...", stage: "Removing compatibility", status: "running" });
    startTransition(async () => {
      try {
        await deleteCompatibilityAction(id);
        setProgress({ label: "Compatibility removed", stage: "Complete", percent: 100, status: "success" });
        toast.success("Compatibility mapping removed");
        window.location.reload();
      } catch (error) {
        setProgress({ label: "Delete failed", stage: error instanceof Error ? error.message : "Could not remove mapping.", status: "error" });
        toast.error(error instanceof Error ? error.message : "Could not remove mapping.");
      }
    });
  }

  return <div>
    <div className="grid gap-2 border-b border-[#EDF1F6] p-3">
      <AdminProgress progress={progress} />
      <div className="grid grid-cols-2 gap-2">
        <button disabled={busy} className={direction === "printer" ? "btn-dark" : "btn-lite"} onClick={() => setDirection("printer")}>Attach consumable</button>
        <button disabled={busy} className={direction === "consumable" ? "btn-dark" : "btn-lite"} onClick={() => setDirection("consumable")}>Attach printer</button>
      </div>
      <input value={search} disabled={busy} onChange={(event) => setSearch(event.target.value)} className="admin-input" placeholder="Search catalogue" />
      <select value={targetId} disabled={busy} onChange={(event) => setTargetId(event.target.value)} className="admin-input">
        <option value="">Choose matching product</option>
        {matches.map((row) => <option key={row.id} value={row.id}>{row.name} - {productCode(row)}</option>)}
      </select>
      <select value={relationType} disabled={busy} onChange={(event) => setRelationType(event.target.value as CompatibilityRow["relationType"])} className="admin-input">
        <option value="TONER">Toner</option>
        <option value="DRUM">Drum</option>
        <option value="INKJET">Inkjet</option>
        <option value="SPARE_PART">Spare part</option>
        <option value="ACCESSORY">Accessory</option>
      </select>
      <ProgressButton onClick={attach} disabled={!targetId && !matches.length} progress={busy ? progress : null} className="btn-dark">Attach</ProgressButton>
    </div>
    {selected.compatibilities.length ? selected.compatibilities.map((item) => (
      <ListRow key={item.id} title={item.product.name} sub={`${item.direction === "printer" ? "Fits this product" : "Uses this product"} | ${item.relationType} | ${productCode(item.product)}`} action={<button onClick={() => remove(item.id)} disabled={busy} className="btn-lite">Remove</button>} />
    )) : <Empty title="Nothing mapped yet" copy="Link the toners and parts that fit this machine so storefront fit lists and stock warnings work." />}
  </div>;
}
function ProductBadges({ row }: { row: ProductRow }) {
  const job = row.latestEnrichmentJob;
  const badges = [
    !row.mpn ? { tone: "warn" as const, label: "Missing MPN" } : null,
    job?.status === "FAILED" ? { tone: "crit" as const, label: job.error ?? "Icecat failed" } : null,
    row.stock_quantity <= row.reorder_level ? { tone: "crit" as const, label: "Restock" } : null,
    row.images.length === 0 ? { tone: "warn" as const, label: "No images" } : null,
    row.compatibleCount === 0 ? { tone: "warn" as const, label: "No consumables" } : null,
    row.cost_price_kes == null ? { tone: "warn" as const, label: "No cost price" } : null,
    job?.status === "PENDING" || job?.status === "RUNNING" ? { tone: "teal" as const, label: "Enrichment running" } : null,
    row.enriched_at || job?.status === "DONE" ? { tone: "ok" as const, label: "Icecat synced" } : null,
    row.is_published ? { tone: "ok" as const, label: "Published" } : { tone: "mute" as const, label: "Unpublished" },
    row.archived_at ? { tone: "mute" as const, label: "Archived" } : null,
    !row.enriched_at && !job ? { tone: "mute" as const, label: "Shell created" } : null
  ].filter((badge): badge is { tone: "ok" | "warn" | "crit" | "mute" | "teal"; label: string } => Boolean(badge));
  const visible = badges.slice(0, 2);
  return <div className="flex max-w-[260px] flex-wrap gap-1">
    {visible.map((badge) => <Badge key={badge.label} tone={badge.tone}>{badge.label}</Badge>)}
    {badges.length > visible.length ? <Badge tone="mute">+{badges.length - visible.length}</Badge> : null}
  </div>;
}
function Total({ label, value, big }: { label: string; value: number; big?: boolean }) { return <div className={`flex justify-between py-1 ${big ? "mt-2 border-t border-[#DDE4EC] pt-3 text-base font-semibold" : ""}`}><span className="text-[#5B6B80]">{label}</span><span className="font-mono">{formatKes(value)}</span></div>; }
function initials(value: string) { return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AD"; }
function productCode(row?: { mpn: string | null; sku: string | null } | null) { return row?.mpn || row?.sku || "???"; }
function partNumber(row?: { mpn: string | null } | null) { return row?.mpn || <span className="text-slate-400">???</span>; }
function gapText(row: ProductRow) { if (!row.mpn) return "Missing part number"; if (row.reorder_level <= 0) return "Reorder level not configured"; if (!row.supplier_name) return "Supplier not configured"; if (row.images.length === 0) return "No images"; if (row.cost_price_kes == null) return "No cost price"; return "No compatible consumables mapped"; }
function margin(rows: ProductRow[]) { const priced = rows.filter((row) => row.price_kes > 0 && row.cost_price_kes); if (!priced.length) return "0%"; return `${Math.round(priced.reduce((sum, row) => sum + (1 - (row.cost_price_kes ?? 0) / row.price_kes), 0) / priced.length * 1000) / 10}%`; }
function bulkLabel(action: "delete" | "publish" | "unpublish" | "set-category" | "set-price" | "set-stock") {
  return action === "publish" ? "Publish" : action === "unpublish" ? "Unpublish" : action === "set-category" ? "Set category for" : action === "set-price" ? "Adjust price for" : action === "set-stock" ? "Set stock for" : "Delete";
}
function bulkRunningLabel(action: "delete" | "publish" | "unpublish" | "set-category" | "set-price" | "set-stock") {
  return action === "publish" ? "Publishing..." : action === "unpublish" ? "Unpublishing..." : action === "set-category" ? "Saving..." : action === "set-price" ? "Saving..." : action === "set-stock" ? "Updating inventory..." : "Deleting...";
}
function bulkValue(action: string, categories?: Array<{ id: string; name: string }>): string | number | null | false {
  if (action === "set-price") {
    const value = window.prompt("New price in KSh");
    return value == null ? false : Number(value);
  }
  if (action === "set-stock") {
    const value = window.prompt("New stock quantity");
    return value == null ? false : Number(value);
  }
  if (action === "set-category") {
    const options = categories?.map((category) => `${category.id} - ${category.name}`).join("\n") ?? "";
    const value = window.prompt(`Paste the category id to apply:\n${options}`);
    return value == null ? false : value.trim() || null;
  }
  return null;
}
function exportSelected(ids: string[], rows: ProductRow[]) {
  const selected = rows.filter((row) => ids.includes(row.id));
  const csv = ["Product,MPN,SKU,Category,Stock,Price,Cost,Published,Archived", ...selected.map((row) => [row.name, row.mpn ?? "", row.sku ?? "", row.category, row.stock_quantity, row.price_kes, row.cost_price_kes ?? "", row.is_published, row.archived_at ? "yes" : "no"].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "ceter-selected-products.csv";
  link.click();
  URL.revokeObjectURL(url);
}
