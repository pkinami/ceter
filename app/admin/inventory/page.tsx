import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function InventoryDashboardPage() {
  const session = await requirePermission("inventory.view");
  const canSeeCost = hasPermission(session, "products.cost_price.view");
  const [balances, movements, transfers, stockTakes, backorders, serials] = await Promise.all([
    prisma.inventoryBalance.findMany({
      include: { product: { include: { category: true, brand: true } }, location: true },
      orderBy: [{ available_quantity: "asc" }],
      take: 80
    }),
    prisma.inventoryMovement.findMany({ include: { product: true, location: true, user: true }, orderBy: { created_at: "desc" }, take: 12 }),
    prisma.stockTransfer.findMany({ where: { status: { in: ["submitted", "approved", "ready_for_dispatch", "in_transit", "partially_received"] } }, include: { lines: true }, orderBy: { created_at: "desc" }, take: 12 }),
    prisma.stockTake.findMany({ where: { status: { in: ["draft", "counting", "submitted", "under_review", "approved"] } }, include: { lines: true }, orderBy: { created_at: "desc" }, take: 12 }),
    prisma.product.findMany({ where: { archived_at: null, stock_status: "backorder" }, include: { category: true, brand: true }, take: 12 }),
    prisma.serialNumber.count({ where: { status: { in: ["available", "reserved", "in_transit"] } } })
  ]);
  const totalUnits = balances.reduce((sum, balance) => sum + Number(balance.available_quantity), 0);
  const lowStock = balances.filter((balance) => Number(balance.available_quantity) > 0 && balance.product.reorder_level > 0 && Number(balance.available_quantity) <= balance.product.reorder_level);
  const outOfStock = balances.filter((balance) => Number(balance.available_quantity) <= 0);
  const inventoryValue = canSeeCost ? balances.reduce((sum, balance) => sum + Number(balance.on_hand_quantity) * (balance.product.cost_price_kes ?? 0), 0) : null;

  return (
    <AdminResourcePage
      eyebrow="Inventory"
      title="Inventory Dashboard"
      subtitle="Audited stock balances, operational exceptions and inventory workflow entry points."
      stats={[
        { label: "Active items", value: String(new Set(balances.map((balance) => balance.product_id)).size), note: "With location balances" },
        { label: "Available units", value: qty(totalUnits), note: "Across locations" },
        { label: "Inventory value", value: money(inventoryValue), note: canSeeCost ? "At protected cost" : "Permission protected" },
        { label: "Low stock", value: String(lowStock.length), note: `${outOfStock.length} out of stock` },
        { label: "Backorders", value: String(backorders.length), note: "Inventory-side foundation" },
        { label: "Transfers in transit", value: String(transfers.filter((item) => item.status.includes("transit")).length) },
        { label: "Open stock takes", value: String(stockTakes.length) },
        { label: "Serial-controlled", value: String(serials), note: "Tracked serial records" }
      ]}
      action={<Link className="ceter-admin-primary-button" href="/admin/inventory/adjustments">Post adjustment</Link>}
    >
      <section className="ceter-stock-grid">
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Operational panel</span><h2>Low Stock</h2></div><Link href="/admin/inventory/low-stock">Open</Link></div>
          <AdminTable columns={["Product", "SKU", "Location", "Available", "Reorder"]} empty="No low-stock balances are present." rows={lowStock.slice(0, 8).map((balance) => [balance.product.name, balance.product.sku ?? "-", balance.location.name, qty(balance.available_quantity), `${balance.product.reorder_level} / ${balance.product.reorder_quantity}`])} />
        </article>
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Operational panel</span><h2>Recent Movements</h2></div><Link href="/admin/inventory/ledger">Ledger</Link></div>
          <AdminTable columns={["Date", "Product", "Location", "Type", "Quantity"]} empty="No inventory movements have been posted." rows={movements.map((movement) => [movement.created_at.toLocaleString("en-KE"), movement.product.name, movement.location.name, <StatusBadge key={movement.id} value={movement.movement_type} />, qty(movement.quantity)])} />
        </article>
      </section>
      <section className="ceter-stock-grid">
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Operational panel</span><h2>Transfers Awaiting Action</h2></div><Link href="/admin/inventory/transfers">Transfers</Link></div>
          <AdminTable columns={["Number", "From", "To", "Status", "Lines"]} empty="No open transfers require action." rows={transfers.map((transfer) => [transfer.transfer_number, transfer.source_location, transfer.destination_location, <StatusBadge key={transfer.id} value={transfer.status} />, String(transfer.lines.length)])} />
        </article>
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Operational panel</span><h2>Active Stock Takes</h2></div><Link href="/admin/inventory/stock-takes">Stock takes</Link></div>
          <AdminTable columns={["Number", "Location", "Status", "Lines"]} empty="No active stock takes are open." rows={stockTakes.map((stockTake) => [stockTake.stock_take_number, stockTake.location, <StatusBadge key={stockTake.id} value={stockTake.status} />, String(stockTake.lines.length)])} />
        </article>
      </section>
      <section className="ceter-stock-grid">
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Operational panel</span><h2>Backorders Requiring Attention</h2></div><Link href="/admin/inventory/backorders">Backorders</Link></div>
          <AdminTable columns={["Product", "SKU", "Category", "Brand"]} empty="No backorder products are currently flagged." rows={backorders.map((product) => [product.name, product.sku ?? "-", product.category?.name ?? "Uncategorised", product.brand?.name ?? "Unassigned"])} />
        </article>
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Operational panel</span><h2>Recent Adjustments</h2></div><Link href="/admin/inventory/adjustments">Adjustments</Link></div>
          <AdminTable columns={["Date", "Product", "Reference", "Reason", "Quantity"]} empty="No recent adjustment postings." rows={movements.filter((movement) => movement.source_document_type === "StockAdjustment").slice(0, 8).map((movement) => [movement.created_at.toLocaleString("en-KE"), movement.product.name, movement.reference, movement.reason, qty(movement.quantity)])} />
        </article>
      </section>
    </AdminResourcePage>
  );
}
