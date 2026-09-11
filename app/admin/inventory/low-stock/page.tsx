import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty } from "@/components/admin/AdminResourcePage";

export default async function LowStockPage() {
  const session = await requirePermission("inventory.view");
  const canPurchase = hasPermission(session, "purchases.manage");
  const balances = await prisma.inventoryBalance.findMany({ include: { product: { include: { brand: true, category: true } }, location: true }, orderBy: { available_quantity: "asc" }, take: 200 });
  const low = balances.filter((balance) => balance.product.reorder_level > 0 && Number(balance.available_quantity) <= balance.product.reorder_level);
  return (
    <AdminResourcePage eyebrow="Inventory / Low Stock" title="Low Stock Alerts" subtitle="Available, reserved, on-order and reorder quantities by product and location.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-filter-row"><label>Search<input name="q" /></label><label>Location<input name="location" /></label><label>Brand<input name="brand" /></label><label>Category<input name="category" /></label></form>
        <AdminTable columns={["Product", "SKU", "Location", "Available", "Reserved", "On order", "Backordered", "Reorder level", "Recommended", "Preferred supplier", "Action"]} empty="No low-stock items currently require replenishment." rows={low.map((balance) => [
          balance.product.name,
          balance.product.sku ?? "-",
          balance.location.name,
          qty(balance.available_quantity),
          qty(balance.reserved_quantity),
          qty(balance.incoming_quantity),
          balance.product.stock_status === "backorder" ? "Yes" : "No",
          String(balance.product.reorder_level),
          String(balance.product.reorder_quantity || Math.max(0, balance.product.reorder_level - Number(balance.available_quantity))),
          balance.product.supplier_name ?? "Not assigned",
          canPurchase ? <Link key={balance.id} href="/admin/purchases/orders/new">Create PO</Link> : "Restricted"
        ])} />
      </article>
    </AdminResourcePage>
  );
}
