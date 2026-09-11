import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function PurchaseReturnsPage() {
  await requirePermission("purchases.manage");
  const returns = await prisma.purchaseReturn.findMany({ include: { supplier: true, return_location: true, lines: { include: { product: true } } }, orderBy: { created_at: "desc" }, take: 80 });
  return (
    <AdminResourcePage eyebrow="Purchases / Returns" title="Purchase Returns" subtitle="Debit-note foundation with inventory reversal state; accounting adjustment remains explicit for finance review.">
      <article className="ceter-admin-panel">
        <AdminTable columns={["Return", "Supplier", "Location", "Status", "Quantity", "Reason", "Financial state"]} empty="No purchase returns have been recorded." rows={returns.map((item) => [item.return_number, item.supplier.company_name, item.return_location.name, <StatusBadge key={item.id} value={item.status} />, qty(item.lines.reduce((sum, line) => sum + Number(line.quantity), 0)), item.reason, item.financial_adjustment_state])} />
      </article>
    </AdminResourcePage>
  );
}
