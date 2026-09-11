import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("purchases.view");
  const canSeeCost = hasPermission(session, "products.cost_price.view");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const order = await prisma.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, lines: { include: { product: true } }, goods_received_notes: true, goods_receipts: true, status_history: true } });
  if (!order) notFound();
  return (
    <AdminResourcePage eyebrow="Purchases / Orders" title={order.po_number} subtitle={order.supplier.company_name} stats={[{ label: "Status", value: order.status }, { label: "Currency", value: order.currency }, { label: "Total", value: canSeeCost ? money(order.total_kes) : "Restricted" }]}>
      <article className="ceter-admin-panel"><AdminTable columns={["Product", "SKU", "Qty", "Received", "Unit cost", "Tax", "Gross"]} empty="This purchase order has no lines." rows={order.lines.map((line) => [line.product.name, line.product.sku ?? "-", qty(line.quantity), qty(line.received_quantity), canSeeCost ? money(line.unit_cost_kes) : "Restricted", canSeeCost ? money(line.tax_kes) : "Restricted", canSeeCost ? money(line.gross_kes) : "Restricted"])} /></article>
      <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Activity</span><h2>Status History</h2></div></div><AdminTable columns={["Date", "From", "To", "Reason"]} empty="No status history has been recorded." rows={order.status_history.map((event) => [event.created_at.toLocaleString("en-KE"), event.from_status ?? "-", <StatusBadge key={event.id} value={event.to_status} />, event.reason ?? "-"])} /></article>
    </AdminResourcePage>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}
