import { requirePermission } from "@/lib/admin/auth";
import { reconcileInventory } from "@/lib/admin/inventory";
import { AdminTable, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function InventoryReconciliationPage() {
  await requirePermission("inventory.reconcile");
  const rows = await reconcileInventory();
  return (
    <AdminResourcePage eyebrow="Inventory / Reconciliation" title="Inventory Reconciliation" subtitle="Compare product mirror quantity, location balances, posted movement totals and serial counts without auto-fixing discrepancies." stats={[{ label: "Rows checked", value: String(rows.length) }, { label: "Reconciled", value: String(rows.filter((row) => row.status === "reconciled").length) }, { label: "Review required", value: String(rows.filter((row) => row.status !== "reconciled").length) }]}>
      <article className="ceter-admin-panel">
        <AdminTable columns={["Product", "SKU", "Product stock", "Balance total", "Ledger total", "Serial available", "Status", "Issues"]} empty="No products are available for reconciliation." rows={rows.map((row) => [
          row.productName,
          row.sku ?? "-",
          qty(row.productQuantity),
          qty(row.balanceTotal),
          qty(row.movementTotal),
          qty(row.serialAvailable),
          <StatusBadge key={row.productId} value={row.status} />,
          row.issues.join(", ") || "-"
        ])} />
      </article>
    </AdminResourcePage>
  );
}
