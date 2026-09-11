import Link from "next/link";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { AdminTable, money, AdminResourcePage, StatusBadge } from "@/components/admin/AdminResourcePage";
import { archiveSupplierAction } from "@/app/admin/purchases/actions";

export default async function SuppliersPage() {
  const session = await requirePermission("suppliers.view");
  const canManage = hasPermission(session, "suppliers.manage");
  const canSeeFinance = hasPermission(session, "products.cost_price.view");
  const suppliers = await prisma.supplier.findMany({ include: { purchase_orders: true, supplier_invoices: true }, orderBy: [{ is_active: "desc" }, { company_name: "asc" }], take: 100 });
  return (
    <AdminResourcePage eyebrow="Purchases / Suppliers" title="Suppliers" subtitle="Supplier master data, product sourcing and purchase history." action={canManage ? <Link className="ceter-admin-primary-button" href="/admin/suppliers/new">New supplier</Link> : undefined}>
      <article className="ceter-admin-panel">
        <form className="ceter-admin-filter-row"><label>Search<input name="q" /></label><label>Status<input name="status" /></label><label>Preferred<input name="preferred" /></label></form>
        <AdminTable columns={["Code", "Name", "Contact", "Telephone", "Email", "Terms", "Currency", "Orders", "Outstanding", "Status", "Actions"]} empty="No suppliers have been created. Do not invent supplier records from product data." rows={suppliers.map((supplier) => [
          supplier.supplier_code ?? "-",
          supplier.company_name,
          supplier.contact_person ?? "-",
          supplier.phone ?? "-",
          supplier.email ?? "-",
          supplier.payment_terms ?? "-",
          supplier.currency,
          String(supplier.purchase_orders.length),
          canSeeFinance ? money(supplier.supplier_invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0)) : "Restricted",
          <StatusBadge key={supplier.id} value={supplier.is_active ? "active" : "archived"} />,
          <AdminActionMenu key={`${supplier.id}-actions`} label={`Actions for ${supplier.company_name}`}><Link href={`/admin/suppliers/${supplier.id}`}>View</Link>{canManage ? <><Link href={`/admin/suppliers/${supplier.id}/edit`}>Edit</Link><form action={archiveSupplierAction} className="ceter-admin-inline-form"><input type="hidden" name="id" value={supplier.id} /><button className="ceter-admin-secondary-button">Archive</button></form></> : null}</AdminActionMenu>
        ])} />
      </article>
    </AdminResourcePage>
  );
}
