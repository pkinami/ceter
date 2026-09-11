"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Box,
  ChevronDown,
  Edit3,
  Eye,
  Filter,
  FileDown,
  FileUp,
  Grid2X2,
  ImageIcon,
  Package,
  PackageX,
  Plus,
  Search,
  ShoppingBag,
  SlidersVertical,
  Trash2,
  Wrench
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { deleteProductAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { CeterCombobox } from "@/components/admin/CeterCombobox";

export type InventoryItemRow = {
  id: string;
  kind: "product" | "service";
  type: "Product" | "Service" | "Raw Material";
  product: string;
  image: string;
  name: string;
  description: string;
  stock: number | null;
  unit: string;
  category: string;
  sku: string;
  buyingPrice: number | null;
  sellingPrice: number | null;
  status: string;
  editHref: string;
  viewHref: string;
};

export type InventorySummaryCard = {
  label: string;
  value: number;
  description: string;
  icon: "bag" | "box" | "grid" | "image" | "stock";
  pill?: string;
  breakdown?: Array<{ label: string; value: number }>;
  supportingValue?: number;
};

type Tab = "All Items" | "Products" | "Services" | "Raw Materials";

const summaryIcons: Record<InventorySummaryCard["icon"], LucideIcon> = {
  bag: ShoppingBag,
  box: Box,
  grid: Grid2X2,
  image: ImageIcon,
  stock: SlidersVertical
};

const tabs: Tab[] = ["All Items", "Products", "Raw Materials", "Services"];

export function ProductInventoryClient({
  rows,
  summary,
  categories,
  canManage,
  canImport,
  canViewCost
}: {
  rows: InventoryItemRow[];
  summary: InventorySummaryCard[];
  categories: string[];
  canManage: boolean;
  canImport: boolean;
  canViewCost: boolean;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("All Items");
  const [category, setCategory] = useState("All Categories");
  const [status, setStatus] = useState("All Statuses");
  const [draftCategory, setDraftCategory] = useState("All Categories");
  const [draftStatus, setDraftStatus] = useState("All Statuses");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const tabMatch = tab === "All Items"
        || (tab === "Products" && row.type === "Product")
        || (tab === "Services" && row.type === "Service")
        || (tab === "Raw Materials" && row.type === "Raw Material");
      const categoryMatch = category === "All Categories" || row.category === category;
      const statusMatch = status === "All Statuses" || row.status === status;
      const searchMatch = !needle || [row.product, row.name, row.description, row.category, row.sku, row.status].some((value) => value.toLowerCase().includes(needle));
      return tabMatch && categoryMatch && statusMatch && searchMatch;
    });
  }, [category, query, rows, status, tab]);

  const activeFilterCount = [category !== "All Categories", status !== "All Statuses"].filter(Boolean).length;

  function applyFilters() {
    setCategory(draftCategory);
    setStatus(draftStatus);
    setFiltersOpen(false);
  }

  function clearFilters() {
    setDraftCategory("All Categories");
    setDraftStatus("All Statuses");
    setCategory("All Categories");
    setStatus("All Statuses");
    setFiltersOpen(false);
  }

  function exportCsv() {
    const columns = ["Product", "Stock", "Category", "SKU", canViewCost ? "Buying Price" : "Cost", "Status"];
    const csv = [columns, ...filtered.map((row) => [
      row.name,
      stockLabel(row),
      row.category,
      row.sku,
      canViewCost ? priceLabel(row.buyingPrice) : "Restricted",
      row.status
    ])].map((line) => line.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ceter-products-services.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ceter-admin-page ceter-inventory-page">
      <div className="ceter-admin-greeting ceter-admin-module-heading ceter-inventory-heading">
        <div>
          <h1>Products &amp; Services</h1>
          <span>Manage your products and services inventory</span>
        </div>
      </div>

      <section className="ceter-inventory-summary" aria-label="Inventory summary">
        {summary.map((card) => {
          const Icon = summaryIcons[card.icon];
          const percentage = summaryPercentage(card.value, rows.length);
          return (
            <article key={card.label} className={`ceter-inventory-summary-card ${card.label === "All Items" ? "wide" : ""}`}>
              <div className="ceter-inventory-summary-top">
                <div className="ceter-inventory-summary-icon"><Icon size={17} strokeWidth={2} /></div>
                {card.pill ? <span className="ceter-inventory-summary-pill">{card.pill}</span> : null}
              </div>
              <strong className="ceter-inventory-summary-value">{card.value.toLocaleString("en-KE")}</strong>
              <p>{card.description}</p>
              {card.breakdown ? <SummaryBreakdown items={card.breakdown} total={rows.length} /> : card.label === "Out of Stock" ? (
                <div className="ceter-inventory-stock-support"><i /> <span>{(card.supportingValue ?? 0).toLocaleString("en-KE")} low stock total</span></div>
              ) : (
                <div className="ceter-inventory-progress-row">
                  <div className="ceter-inventory-progress"><i style={{ width: `${percentage}%` }} /></div>
                  <span>{percentage}% of inventory</span>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <section className="ceter-inventory-table-panel" aria-label="Inventory table">
        <div className="ceter-inventory-panel-header">
          <div className="ceter-inventory-panel-title">
            <h2>Inventory</h2>
            <span className="ceter-inventory-panel-icon"><Package size={18} /><span className="ceter-inventory-count">{rows.length.toLocaleString("en-KE")}</span></span>
          </div>
          <div className="ceter-inventory-panel-actions">
            {canManage ? <Link className="primary" href="/admin/products/new"><Plus size={15} /> Add Item</Link> : null}
            {canImport ? <Link href="/admin/import"><FileUp size={15} /> Import</Link> : null}
            <button className="tinted" type="button" onClick={exportCsv}><FileDown size={15} /> Export</button>
          </div>
        </div>

        <div className="ceter-inventory-table-head">
          <label className="ceter-inventory-search">
            <Search size={17} />
            <span className="sr-only">Search products and services</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search items..." />
          </label>
          <div className="ceter-inventory-filter-shell">
            <button className="ceter-inventory-filter-button" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>
              <Filter size={16} />
              <span>Filters</span>
              {activeFilterCount ? <b>{activeFilterCount}</b> : null}
            </button>
            {filtersOpen ? (
              <div className="ceter-inventory-filter-popover" role="dialog" aria-label="Inventory filters">
                <div className="ceter-inventory-filter-title">
                  <strong>Filters</strong>
                  <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">Close</button>
                </div>
                <CeterCombobox compact name="category_filter" value={draftCategory} onChange={setDraftCategory} options={categories.map((item) => ({ value: item, label: item }))} />
                <CeterCombobox compact name="status_filter" value={draftStatus} onChange={setDraftStatus} options={["All Statuses", "In Stock", "Low Stock", "Out of Stock", "Backorder", "Active", "Inactive"].map((item) => ({ value: item, label: item }))} />
                <div className="ceter-inventory-filter-actions">
                  <button type="button" onClick={clearFilters}>Clear</button>
                  <button type="button" onClick={applyFilters}>Apply filters</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="ceter-inventory-tabs" role="tablist" aria-label="Inventory categories">
          {tabs.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="ceter-inventory-table-wrap">
          <table>
            <colgroup>
              <col className="ceter-inventory-col-product" />
              <col className="ceter-inventory-col-stock" />
              <col className="ceter-inventory-col-category" />
              <col className="ceter-inventory-col-sku" />
              <col className="ceter-inventory-col-price" />
              <col className="ceter-inventory-col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Category</th>
                <th>SKU</th>
                <th>{canViewCost ? "Buying Price" : "Cost"}</th>
                <th aria-label="Row actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.length ? filtered.map((row) => <InventoryRow key={`${row.kind}-${row.id}`} row={row} canManage={canManage} canViewCost={canViewCost} />) : (
                <tr>
                  <td colSpan={6}>
                    <div className="ceter-inventory-empty">
                      <PackageX size={30} />
                      <span>No items match the current view.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryBreakdown({ items, total }: { items: Array<{ label: string; value: number }>; total: number }) {
  return (
    <div className="ceter-inventory-summary-breakdown">
      {items.map((item) => {
        const percentage = summaryPercentage(item.value, total);
        return (
          <div key={item.label} className="ceter-inventory-breakdown-item">
            <span>{item.label}<b>{item.value.toLocaleString("en-KE")}</b></span>
            <div className="ceter-inventory-progress"><i style={{ width: `${percentage}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function InventoryRow({ row, canManage, canViewCost }: { row: InventoryItemRow; canManage: boolean; canViewCost: boolean }) {
  const TypeIcon = row.type === "Service" ? Wrench : row.type === "Raw Material" ? Box : Package;
  return (
    <tr>
      <td>
        <div className="ceter-inventory-product-cell">
          <span className={`ceter-inventory-type ${row.type === "Service" ? "service" : row.type === "Raw Material" ? "raw" : ""}`} aria-hidden="true"><TypeIcon size={14} /></span>
          <div>
            <strong className="ceter-inventory-name">{row.name}</strong>
            <small>{row.type === "Service" ? "Service item" : row.sku !== "-" ? row.sku : row.type}</small>
          </div>
        </div>
      </td>
      <td><span className={`ceter-inventory-stock ${statusClass(row.status)}`}><i />{stockLabel(row)}</span></td>
      <td><span className="ceter-inventory-category">{row.category}</span></td>
      <td><span className="ceter-inventory-sku">{row.sku}</span></td>
      <td>{canViewCost ? priceLabel(row.buyingPrice) : "Restricted"}</td>
      <td>
        <div className="ceter-inventory-row-actions">
          {canManage ? <Link className="edit" href={row.editHref} aria-label={`Edit ${row.name}`}><Edit3 size={14} /> Edit</Link> : null}
          <details className="ceter-inventory-row-menu">
            <summary aria-label={`More actions for ${row.name}`}><ChevronDown size={16} /></summary>
            <div>
              <Link href={row.viewHref}><Eye size={14} /> View</Link>
              {canManage && row.kind === "product" ? (
                <form action={deleteProductAction}>
                  <input type="hidden" name="id" value={row.id} />
                  <FormSubmitButton confirmMessage={`Archive ${row.name}?`} pendingText="" type="submit">
                    <Trash2 size={14} /> Archive
                  </FormSubmitButton>
                </form>
              ) : null}
            </div>
          </details>
        </div>
      </td>
    </tr>
  );
}

function stockLabel(row: InventoryItemRow) {
  return row.stock === null ? "Not stocked" : `${row.stock.toLocaleString("en-KE")} ${row.status.toLowerCase()}`;
}

function priceLabel(value: number | null) {
  return value === null ? "-" : new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

function statusClass(status: string) {
  if (/out|inactive/i.test(status)) return "red";
  if (/low|backorder/i.test(status)) return "amber";
  return "green";
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function summaryPercentage(value: number, total: number) {
  if (!total || !value) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}
