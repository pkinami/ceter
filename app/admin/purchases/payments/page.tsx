import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, StatusBadge } from "@/components/admin/AdminResourcePage";
import { recordSupplierPaymentAction } from "@/app/admin/purchases/actions";

export default async function SupplierPaymentsPage() {
  await requirePermission("supplier_payments.manage");
  const [payments, suppliers, invoices] = await Promise.all([
    prisma.supplierPayment.findMany({ include: { supplier: true, allocations: true }, orderBy: { created_at: "desc" }, take: 80 }),
    prisma.supplier.findMany({ where: { is_active: true }, orderBy: { company_name: "asc" } }),
    prisma.supplierInvoice.findMany({ where: { balance_kes: { gt: 0 } }, include: { supplier: true }, orderBy: { due_date: "asc" }, take: 80 })
  ]);
  return (
    <AdminResourcePage eyebrow="Purchases / Payments" title="Supplier Payments" subtitle="Supplier payment events and allocations remain separate from receiving status.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={recordSupplierPaymentAction}>
          <label>Supplier<select name="supplier_id" required>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.company_name}</option>)}</select></label>
          <label>Open supplier invoice<select name="supplier_invoice_id" required>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.supplier_invoice_number} - {invoice.supplier.company_name} - {money(invoice.balance_kes)}</option>)}</select></label>
          <label>Amount<input name="amount_kes" type="number" min="1" required /></label>
          <label>Method<select name="method" defaultValue="bank_transfer"><option value="bank_transfer">Bank transfer</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option><option value="card">Card</option></select></label>
          <label>Transaction reference<input name="transaction_reference" /></label>
          <label className="wide">Notes<textarea name="notes" /></label>
          <button className="ceter-admin-primary-button">Record payment</button>
        </form>
      </article>
      <article className="ceter-admin-panel"><AdminTable columns={["Number", "Supplier", "Amount", "Method", "Reference", "Status", "Allocations", "Date"]} empty="No supplier payments have been recorded." rows={payments.map((payment) => [payment.payment_number ?? payment.supplier_payment_number, payment.supplier.company_name, money(payment.amount_kes), payment.method, payment.transaction_reference ? "Recorded" : "-", <StatusBadge key={payment.id} value={payment.status} />, String(payment.allocations.length), payment.paid_at.toLocaleString("en-KE")])} /></article>
    </AdminResourcePage>
  );
}
