"use client";

import { useMemo, useState } from "react";
import { ClipboardCheck, FileDown, PackageCheck, PackageMinus, PackagePlus, Search } from "lucide-react";
import { adjustInventoryStockAction, createStockTakeAction, createStockTransferAction, reconcileStockTakeAction, saveStockTakeCountsAction, updateStockTransferStatusAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { CeterCombobox } from "@/components/admin/CeterCombobox";

export type InventoryControlProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  stock: number;
  reorderLevel: number;
  reorderQuantity: number;
  cost: number | null;
  value: number;
  status: "In Stock" | "Low Stock" | "Out of Stock" | "Backorder";
};

export type InventoryControlMovementRow = {
  id: string;
  product: string;
  delta: number;
  reason: string;
  reference: string;
  unitCost: number | null;
  date: string;
  user: string;
};

export type InventoryTransferRow = {
  id: string;
  number: string;
  source: string;
  destination: string;
  status: string;
  date: string;
  responsible: string;
  notes: string | null;
  items: Array<{ id: string; product: string; sku: string | null; quantity: number; available: number | null }>;
};

export type InventoryStockTakeRow = {
  id: string;
  number: string;
  name: string;
  location: string;
  status: string;
  date: string;
  assigned: string;
  items: Array<{ id: string; product: string; sku: string | null; expected: number; counted: number | null; variance: number | null; notes: string | null }>;
};

type Summary = {
  products: number;
  units: number;
  stockValue: number;
  lowStock: number;
  outOfStock: number;
  movements: number;
};

type Props = {
  products: InventoryControlProductRow[];
  movements: InventoryControlMovementRow[];
  transfers: InventoryTransferRow[];
  stockTakes: InventoryStockTakeRow[];
  users: Array<{ id: string; name: string }>;
  summary: Summary;
  view: string;
};

export function InventoryControlClient({ products, movements, transfers, stockTakes, users, summary, view }: Props) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [location, setLocation] = useState("All Locations");
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ?? "");
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? products[0];
  const isStockTakes = view === "stock-takes";

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const statusMatch = status === "All Statuses" || product.status === status;
      const searchMatch = !needle || [product.name, product.sku ?? "", product.category, product.status].some((item) => item.toLowerCase().includes(needle));
      return statusMatch && searchMatch;
    });
  }, [products, query, status]);

  const filteredTransfers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const statusMatch = status === "All Statuses" || label(transfer.status) === status;
      const locationMatch = location === "All Locations" || transfer.source === location || transfer.destination === location;
      const searchMatch = !needle || [transfer.number, transfer.source, transfer.destination, transfer.responsible, ...transfer.items.map((item) => item.product)].some((item) => item.toLowerCase().includes(needle));
      return statusMatch && locationMatch && searchMatch;
    });
  }, [location, query, status, transfers]);

  const filteredStockTakes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stockTakes.filter((stockTake) => {
      const statusMatch = status === "All Statuses" || label(stockTake.status) === status;
      const locationMatch = location === "All Locations" || stockTake.location === location;
      const searchMatch = !needle || [stockTake.number, stockTake.name, stockTake.location, stockTake.assigned].some((item) => item.toLowerCase().includes(needle));
      return statusMatch && locationMatch && searchMatch;
    });
  }, [location, query, status, stockTakes]);

  const locations = ["All Locations", ...new Set(["Main Store", "Warehouse", "Showroom", ...transfers.flatMap((transfer) => [transfer.source, transfer.destination]), ...stockTakes.map((stockTake) => stockTake.location)])];

  function exportCsv() {
    const columns = ["Item", "SKU", "Category", "Stock", "Reorder Level", "Reorder Quantity", "Status", "Stock Value"];
    const csv = [columns, ...filteredProducts.map((product) => [
      product.name,
      product.sku ?? "-",
      product.category,
      String(product.stock),
      String(product.reorderLevel),
      String(product.reorderQuantity),
      product.status,
      String(product.value)
    ])].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = isStockTakes ? "ceter-stock-take.csv" : "ceter-stock-control.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="ceter-admin-page ceter-stock-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Inventory / {isStockTakes ? "Stock Control" : "Stock Transfer"}</p>
          <h1>{isStockTakes ? "Stock Takes" : "Stock Transfer"}</h1>
          <span>{isStockTakes ? "Count physical stock, record variances and reconcile Ceter inventory." : "Move or adjust stock using live product quantities and audited movement records."}</span>
        </div>
        <div className="ceter-admin-safe-mode">Live Ceter data</div>
      </div>

      <section className="ceter-stock-summary" aria-label="Stock summary">
        <SummaryCard icon="products" label="Products" value={summary.products.toLocaleString("en-KE")} note="Stock-backed catalogue items" />
        <SummaryCard icon="units" label="Units On Hand" value={summary.units.toLocaleString("en-KE")} note={`${summary.lowStock.toLocaleString("en-KE")} low stock`} />
        <SummaryCard icon="value" label="Stock Value" value={money(summary.stockValue)} note="At current selling price" />
        <SummaryCard icon="alerts" label="Out of Stock" value={summary.outOfStock.toLocaleString("en-KE")} note={`${summary.movements.toLocaleString("en-KE")} recent movements`} />
      </section>

      {isStockTakes ? <StockTakeWorkspace products={products} stockTakes={filteredStockTakes} users={users} /> : <TransferWorkspace products={products} transfers={filteredTransfers} users={users} />}

      <section className="ceter-stock-grid">
        <article className="ceter-admin-panel ceter-stock-form-panel">
          <div className="ceter-admin-panel-header">
            <div>
              <span>{isStockTakes ? "Physical count" : "Stock movement"}</span>
              <h2>{isStockTakes ? "Record Stock Take" : "Adjust / Transfer Stock"}</h2>
            </div>
          </div>
          {selectedProduct ? (
            <form className="ceter-admin-form ceter-stock-form" action={adjustInventoryStockAction}>
              <input type="hidden" name="return_to" value={isStockTakes ? "/admin/inventory?view=stock-takes" : "/admin/inventory"} />
              <CeterCombobox
                label="Item"
                name="product_id"
                value={selectedProductId}
                onChange={setSelectedProductId}
                required
                placeholder="Search products"
                options={products.map((product) => ({ value: product.id, label: product.name, detail: `${product.sku ?? "No SKU"} - ${product.stock} on hand` }))}
              />
              <label>Current stock<input readOnly value={selectedProduct.stock} /></label>
              <label>{isStockTakes ? "Counted stock" : "New stock quantity"}<input name="stock_quantity" type="number" min={0} required defaultValue={selectedProduct.stock} /></label>
              <label>Reorder level<input name="reorder_level" type="number" min={0} defaultValue={selectedProduct.reorderLevel} /></label>
              <label>Reorder quantity<input name="reorder_quantity" type="number" min={0} defaultValue={selectedProduct.reorderQuantity} /></label>
              <CeterCombobox label="Reason" name="reason" defaultValue={isStockTakes ? "CORRECTION" : "CORRECTION"} options={[
                { value: "CORRECTION", label: isStockTakes ? "Stock take variance" : "Stock transfer / adjustment" },
                { value: "OPENING_BALANCE", label: "Opening balance" },
                { value: "RETURN", label: "Returned stock" },
                { value: "DAMAGE", label: "Damage / write-off" }
              ]} />
              <label className="wide">Reference / notes<textarea name="reference" defaultValue={isStockTakes ? "Stock take count" : "Stock transfer adjustment"} /></label>
              <div className="ceter-admin-form-actions">
                <FormSubmitButton className="ceter-admin-primary-button" pendingText="Saving movement...">{isStockTakes ? "Save Stock Take" : "Save Movement"}</FormSubmitButton>
              </div>
            </form>
          ) : <div className="ceter-admin-empty">No stock-backed products are available.</div>}
        </article>

        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header ceter-stock-tools">
            <div>
              <span>Inventory report</span>
              <h2>Stock Control</h2>
            </div>
            <button className="ceter-admin-secondary-button" type="button" onClick={exportCsv}><FileDown size={15} /> Export</button>
          </div>
          <div className="ceter-stock-filter-row">
            <label className="ceter-admin-table-search">
              <Search size={15} />
              <span className="sr-only">Search stock</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stock" />
            </label>
            <CeterCombobox compact name="status" value={status} onChange={setStatus} options={(isStockTakes ? ["All Statuses", "Draft", "In Progress", "Under Review", "Completed", "Cancelled"] : ["All Statuses", "Draft", "Submitted", "In Transit", "Received", "Completed", "Cancelled", "In Stock", "Low Stock", "Out of Stock", "Backorder"]).map((item) => ({ value: item, label: item }))} />
            <CeterCombobox compact name="location" value={location} onChange={setLocation} options={locations.map((item) => ({ value: item, label: item }))} />
          </div>
          <div className="ceter-admin-table-wrap">
            <table>
              <thead><tr><th>Item</th><th>Stock</th><th>Reorder</th><th>Status</th><th>Value</th></tr></thead>
              <tbody>
                {filteredProducts.length ? filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td><strong>{product.name}</strong><small>{product.sku ?? product.category}</small></td>
                    <td>{product.stock.toLocaleString("en-KE")}</td>
                    <td>{product.reorderLevel.toLocaleString("en-KE")} / {product.reorderQuantity.toLocaleString("en-KE")}</td>
                    <td><span className={`ceter-stock-status ${statusTone(product.status)}`}>{product.status}</span></td>
                    <td>{money(product.value)}</td>
                  </tr>
                )) : <tr><td colSpan={5}><div className="ceter-admin-empty">No stock records match the current filters.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header">
          <div>
            <span>Movement history</span>
            <h2>Recent Stock Movements</h2>
          </div>
        </div>
        <div className="ceter-admin-table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Item</th><th>Movement</th><th>Reason</th><th>Reference</th><th>User</th></tr></thead>
            <tbody>
              {movements.length ? movements.map((movement) => (
                <tr key={movement.id}>
                  <td>{movement.date}</td>
                  <td>{movement.product}</td>
                  <td className={movement.delta >= 0 ? "ceter-stock-plus" : "ceter-stock-minus"}>{movement.delta >= 0 ? "+" : ""}{movement.delta.toLocaleString("en-KE")}</td>
                  <td>{label(movement.reason)}</td>
                  <td>{movement.reference}</td>
                  <td>{movement.user}</td>
                </tr>
              )) : <tr><td colSpan={6}><div className="ceter-admin-empty">No stock movements have been recorded.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function TransferWorkspace({ products, transfers, users }: { products: InventoryControlProductRow[]; transfers: InventoryTransferRow[]; users: Array<{ id: string; name: string }> }) {
  return (
    <section className="ceter-stock-grid">
      <article className="ceter-admin-panel ceter-stock-form-panel">
        <div className="ceter-admin-panel-header"><div><span>Transfer workflow</span><h2>Create Transfer</h2></div></div>
        <form className="ceter-admin-form ceter-stock-form" action={createStockTransferAction}>
          <input type="hidden" name="return_to" value="/admin/inventory" />
          <CeterCombobox label="Source branch or location" name="source_location" defaultValue="Main Store" options={["Main Store", "Warehouse", "Showroom"].map((item) => ({ value: item, label: item }))} />
          <CeterCombobox label="Destination branch or location" name="destination_location" defaultValue="Warehouse" options={["Main Store", "Warehouse", "Showroom"].map((item) => ({ value: item, label: item }))} />
          <label>Transfer date<input name="transfer_date" type="date" /></label>
          <CeterCombobox label="Responsible user" name="responsible_user_id" options={users.map((user) => ({ value: user.id, label: user.name }))} />
          <CeterCombobox label="Status" name="status" defaultValue="submitted" options={[["draft", "Draft"], ["submitted", "Submitted"], ["in_transit", "In Transit"]].map(([value, labelText]) => ({ value, label: labelText }))} />
          {Array.from({ length: 3 }, (_, index) => (
            <div className="wide ceter-admin-line-row" key={index}>
              <CeterCombobox name={`transfer_product_id_${index}`} placeholder="Search inventory" compact options={[{ value: "", label: "Inventory item" }, ...products.map((product) => ({ value: product.id, label: product.name, detail: `${product.sku ?? product.category} - available ${product.stock}` }))]} />
              <input name={`transfer_quantity_${index}`} type="number" min={0} placeholder="Transfer quantity" />
            </div>
          ))}
          <label className="wide">Notes<textarea name="notes" /></label>
          <div className="ceter-admin-form-actions"><a className="ceter-admin-secondary-button" href="/admin">Cancel</a><FormSubmitButton className="ceter-admin-primary-button" pendingText="Saving transfer...">Submit Transfer</FormSubmitButton></div>
        </form>
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Transfers</span><h2>Transfer List</h2></div></div>
        <div className="ceter-admin-table-wrap">
          <table>
            <thead><tr><th>Request ID</th><th>From Branch</th><th>To Branch</th><th>Request Date</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {transfers.length ? transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td><strong>{transfer.number}</strong><small>{transfer.responsible}</small></td>
                  <td>{transfer.source}</td>
                  <td>{transfer.destination}</td>
                  <td>{transfer.date}</td>
                  <td>{transfer.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString("en-KE")}</td>
                  <td><span className={`ceter-stock-status ${workflowTone(transfer.status)}`}>{label(transfer.status)}</span></td>
                  <td>
                    <details className="ceter-admin-details">
                      <summary>View</summary>
                      <div className="ceter-stock-detail">
                        {transfer.items.map((item) => <p key={item.id}>{item.product}: {item.quantity.toLocaleString("en-KE")} units, available {item.available ?? "-"}</p>)}
                        {transfer.notes ? <p>{transfer.notes}</p> : null}
                      </div>
                    </details>
                    {!["received", "completed", "cancelled"].includes(transfer.status) ? (
                      <form action={updateStockTransferStatusAction} className="ceter-admin-inline-form">
                        <input type="hidden" name="id" value={transfer.id} />
                        <CeterCombobox compact name="status" defaultValue={transfer.status === "draft" ? "submitted" : transfer.status === "submitted" ? "in_transit" : "received"} options={[["submitted", "Submitted"], ["in_transit", "In Transit"], ["received", "Received"], ["cancelled", "Cancelled"]].map(([value, labelText]) => ({ value, label: labelText }))} />
                        <FormSubmitButton className="ceter-admin-secondary-button" pendingText="Updating...">Save</FormSubmitButton>
                      </form>
                    ) : null}
                  </td>
                </tr>
              )) : <tr><td colSpan={7}><div className="ceter-admin-empty">No transfer records match the current filters.</div></td></tr>}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

function StockTakeWorkspace({ products, stockTakes, users }: { products: InventoryControlProductRow[]; stockTakes: InventoryStockTakeRow[]; users: Array<{ id: string; name: string }> }) {
  return (
    <section className="ceter-stock-grid">
      <article className="ceter-admin-panel ceter-stock-form-panel">
        <div className="ceter-admin-panel-header"><div><span>Physical count</span><h2>Create Stock Take</h2></div></div>
        <form className="ceter-admin-form ceter-stock-form" action={createStockTakeAction}>
          <label>Name or reference<input name="name" required placeholder="Monthly stock count" /></label>
          <CeterCombobox label="Branch or location" name="location" defaultValue="Main Store" options={["Main Store", "Warehouse", "Showroom"].map((item) => ({ value: item, label: item }))} />
          <label>Date<input name="stock_take_date" type="date" /></label>
          <CeterCombobox label="Assigned user" name="assigned_user_id" options={users.map((user) => ({ value: user.id, label: user.name }))} />
          <label className="wide">Notes<textarea name="notes" /></label>
          <div className="ceter-admin-form-actions"><FormSubmitButton className="ceter-admin-primary-button" pendingText="Opening count...">Create Stock Take</FormSubmitButton></div>
        </form>
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Stock takes</span><h2>Open Count</h2></div></div>
        <div className="ceter-admin-table-wrap">
          <table>
            <thead><tr><th>Reference</th><th>Location</th><th>Date</th><th>Assigned</th><th>Variance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {stockTakes.length ? stockTakes.map((stockTake) => {
                const variance = stockTake.items.reduce((sum, item) => sum + (item.variance ?? 0), 0);
                return (
                  <tr key={stockTake.id}>
                    <td><strong>{stockTake.number}</strong><small>{stockTake.name}</small></td>
                    <td>{stockTake.location}</td>
                    <td>{stockTake.date}</td>
                    <td>{stockTake.assigned}</td>
                    <td className={variance >= 0 ? "ceter-stock-plus" : "ceter-stock-minus"}>{variance >= 0 ? "+" : ""}{variance.toLocaleString("en-KE")}</td>
                    <td><span className={`ceter-stock-status ${workflowTone(stockTake.status)}`}>{label(stockTake.status)}</span></td>
                    <td>
                      <details className="ceter-admin-details">
                        <summary>Count items</summary>
                        <form action={saveStockTakeCountsAction} className="ceter-stock-count-form">
                          <input type="hidden" name="id" value={stockTake.id} />
                          {stockTake.items.slice(0, 12).map((item) => (
                            <label key={item.id}><span>{item.product}<small>Expected {item.expected.toLocaleString("en-KE")}</small></span><input name={`counted_${item.id}`} type="number" min={0} defaultValue={item.counted ?? item.expected} disabled={["completed", "cancelled"].includes(stockTake.status)} /></label>
                          ))}
                          {!["completed", "cancelled"].includes(stockTake.status) ? <FormSubmitButton className="ceter-admin-secondary-button" pendingText="Saving...">Save Progress</FormSubmitButton> : null}
                        </form>
                      </details>
                      {stockTake.status === "under_review" ? (
                        <form action={reconcileStockTakeAction} className="ceter-admin-inline-form">
                          <input type="hidden" name="id" value={stockTake.id} />
                          <FormSubmitButton className="ceter-admin-primary-button" pendingText="Reconciling...">Reconcile</FormSubmitButton>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              }) : <tr><td colSpan={7}><div className="ceter-admin-empty">No stock takes have been created.</div></td></tr>}
            </tbody>
          </table>
        </div>
        {!products.length ? <div className="ceter-admin-empty">Create inventory items before opening a stock take.</div> : null}
      </article>
    </section>
  );
}

function SummaryCard({ icon, label, value, note }: { icon: "products" | "units" | "value" | "alerts"; label: string; value: string; note: string }) {
  const Icon = icon === "products" ? PackageCheck : icon === "units" ? PackagePlus : icon === "value" ? ClipboardCheck : PackageMinus;
  return (
    <article className="ceter-admin-kpi ceter-stock-card">
      <div className="ceter-stock-card-icon"><Icon size={18} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value);
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusTone(status: string) {
  if (status === "Out of Stock") return "red";
  if (status === "Low Stock" || status === "Backorder") return "amber";
  return "green";
}

function workflowTone(status: string) {
  if (["completed", "received"].includes(status)) return "green";
  if (status === "cancelled") return "red";
  return "amber";
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
