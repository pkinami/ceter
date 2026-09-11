import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function PurchasesDashboardPage() {
  await requirePermission("purchases.view");
  const [orders, receipts, payments, suppliers] = await Promise.all([
    prisma.purchaseOrder.findMany({ include: { supplier: true }, orderBy: { created_at: "desc" }, take: 10 }),
    prisma.goodsReceipt.findMany({ include: { supplier: true }, orderBy: { created_at: "desc" }, take: 10 }),
    prisma.supplierPayment.findMany({ include: { supplier: true }, orderBy: { created_at: "desc" }, take: 10 }),
    prisma.supplier.count({ where: { is_active: true } })
  ]);
  return (
    <AdminResourcePage eyebrow="Purchases" title="Purchases" subtitle="Procurement dashboard for suppliers, purchase orders, goods received and supplier payments." stats={[{ label: "Active suppliers", value: String(suppliers) }, { label: "Open orders", value: String(orders.filter((order) => !["closed", "cancelled", "completed"].includes(order.status)).length) }, { label: "Recent GRNs", value: String(receipts.length) }, { label: "Recent payments", value: String(payments.length) }]}>
      <section className="ceter-stock-grid">
        <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Orders</span><h2>Recent Purchase Orders</h2></div><Link href="/admin/purchases/orders">Open</Link></div><AdminTable columns={["PO", "Supplier", "Status", "Total"]} empty="No purchase orders have been created." rows={orders.map((order) => [order.po_number, order.supplier.company_name, <StatusBadge key={order.id} value={order.status} />, money(order.total_kes)])} /></article>
        <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Goods</span><h2>Recent Goods Received</h2></div><Link href="/admin/purchases/goods-received">Open</Link></div><AdminTable columns={["GRN", "Supplier", "Status", "Date"]} empty="No goods receipts have been recorded." rows={receipts.map((receipt) => [receipt.grn_number, receipt.supplier.company_name, <StatusBadge key={receipt.id} value={receipt.status} />, receipt.receipt_date.toLocaleString("en-KE")])} /></article>
      </section>
    </AdminResourcePage>
  );
}
