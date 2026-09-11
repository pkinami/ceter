import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function PurchaseOrdersPage() {
  const session = await requirePermission("purchases.view");
  const canManage = hasPermission(session, "purchases.manage");
  const canSeeCost = hasPermission(session, "products.cost_price.view");
  const orders = await prisma.purchaseOrder.findMany({ include: { supplier: true, lines: true }, orderBy: { created_at: "desc" }, take: 100 });
  return (
    <AdminResourcePage eyebrow="Purchases / Orders" title="Purchase Orders" subtitle="Server-calculated purchase orders with separate receiving and payment states." action={canManage ? <Link className="ceter-admin-primary-button" href="/admin/purchases/orders/new">New PO</Link> : undefined}>
      <article className="ceter-admin-panel">
        <form className="ceter-admin-filter-row"><label>Search<input name="q" /></label><label>Status<input name="status" /></label><label>Supplier<input name="supplier" /></label></form>
        <AdminTable columns={["PO number", "Supplier", "Status", "Lines", "Ordered", "Received", "Expected", "Total", "Action"]} empty="No purchase orders have been created." rows={orders.map((order) => [
          order.po_number,
          order.supplier.company_name,
          <StatusBadge key={order.id} value={order.status} />,
          String(order.lines.length),
          qty(order.lines.reduce((sum, line) => sum + Number(line.quantity), 0)),
          qty(order.lines.reduce((sum, line) => sum + Number(line.received_quantity), 0)),
          order.expected_delivery_date?.toLocaleDateString("en-KE") ?? "-",
          canSeeCost ? money(order.total_kes) : "Restricted",
          <Link key={`${order.id}-view`} href={`/admin/purchases/orders/${order.id}`}>View</Link>
        ])} />
      </article>
    </AdminResourcePage>
  );
}
