import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function InventoryLedgerPage() {
  const session = await requirePermission("inventory.view");
  const canSeeCost = hasPermission(session, "products.cost_price.view");
  const movements = await prisma.inventoryMovement.findMany({
    include: { product: true, location: true, user: true },
    orderBy: { created_at: "desc" },
    take: 100
  });
  return (
    <AdminResourcePage eyebrow="Inventory / Ledger" title="Stock Ledger" subtitle="Immutable posted stock movements with source document traceability.">
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Filters</span><h2>Product, SKU, location, movement type, source, user, date range and correlation ID</h2></div></div>
        <form className="ceter-admin-filter-row" role="search">
          <label>Search<input name="q" placeholder="Product, SKU, reference or correlation ID" /></label>
          <label>Movement type<input name="movement_type" placeholder="purchase_receipt" /></label>
          <label>Date range<input name="date_range" placeholder="YYYY-MM-DD to YYYY-MM-DD" /></label>
        </form>
        <AdminTable
          columns={["Date/time", "Product", "SKU", "Location", "Movement", "In", "Out", "Running", "Source", "Reference", "User", "Reason", "Status", "Unit cost"]}
          empty="No posted inventory movements exist yet."
          rows={movements.map((movement) => {
            const quantity = Number(movement.quantity);
            return [
              movement.created_at.toLocaleString("en-KE"),
              movement.product.name,
              movement.product.sku ?? "-",
              movement.location.name,
              <StatusBadge key={`${movement.id}-type`} value={movement.movement_type} />,
              quantity > 0 ? qty(quantity) : "-",
              quantity < 0 ? qty(Math.abs(quantity)) : "-",
              movement.running_balance === null ? "Pending" : qty(movement.running_balance),
              `${movement.source_document_type} ${movement.source_document_id.slice(0, 8)}`,
              movement.reference,
              movement.user?.full_name ?? movement.user?.email ?? "System",
              movement.reason,
              <StatusBadge key={`${movement.id}-status`} value={movement.status} />,
              canSeeCost ? money(movement.unit_cost_kes) : "Restricted"
            ];
          })}
        />
      </article>
    </AdminResourcePage>
  );
}
