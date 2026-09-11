import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("suppliers.view");
  const canManage = hasPermission(session, "suppliers.manage");
  const canSeeFinance = hasPermission(session, "products.cost_price.view");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const supplier = await prisma.supplier.findUnique({ where: { id }, include: { purchase_orders: true, supplier_invoices: true, supplier_payments: true } });
  if (!supplier) notFound();
  return (
    <AdminResourcePage eyebrow="Purchases / Suppliers" title={supplier.company_name} subtitle={supplier.supplier_code ?? "Supplier detail"} action={canManage ? <Link className="ceter-admin-primary-button" href={`/admin/suppliers/${supplier.id}/edit`}>Edit supplier</Link> : undefined}>
      <section className="ceter-stock-grid">
        <article className="ceter-admin-panel"><h2>Overview</h2><p>{supplier.contact_person ?? "No contact person recorded."}</p><p>{supplier.phone ?? "-"} / {supplier.email ?? "-"}</p><p>{supplier.address ?? "No address recorded."}</p><p>KRA PIN: {supplier.kra_pin ? "Recorded" : "Not provided"}</p><StatusBadge value={supplier.is_active ? "active" : "archived"} /></article>
        <article className="ceter-admin-panel"><h2>Financial Summary</h2><p>Outstanding: {canSeeFinance ? money(supplier.supplier_invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0)) : "Restricted"}</p><p>Payments: {supplier.supplier_payments.length}</p></article>
      </section>
      <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Supplier</span><h2>Purchase history</h2></div></div><AdminTable columns={["PO number", "Status", "Total", "Expected"]} empty="No purchase history is available for this supplier." rows={supplier.purchase_orders.map((po) => [po.po_number, <StatusBadge key={po.id} value={po.status} />, canSeeFinance ? money(po.total_kes) : "Restricted", po.expected_delivery_date?.toLocaleDateString("en-KE") ?? "-"])} /></article>
    </AdminResourcePage>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}
