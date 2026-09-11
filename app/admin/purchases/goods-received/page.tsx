import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function GoodsReceivedPage() {
  await requirePermission("purchases.view");
  const receipts = await prisma.goodsReceipt.findMany({ include: { supplier: true, receiving_location: true, lines: true }, orderBy: { created_at: "desc" }, take: 100 });
  return (
    <AdminResourcePage eyebrow="Purchases / Goods Received" title="Goods Received" subtitle="GRNs create stock only after controlled posting." action={<Link className="ceter-admin-primary-button" href="/admin/purchases/goods-received/new">New GRN</Link>}>
      <article className="ceter-admin-panel">
        <AdminTable columns={["GRN", "Supplier", "Location", "Status", "Received", "Rejected", "Date", "Action"]} empty="No goods-received notes have been created." rows={receipts.map((receipt) => [
          receipt.grn_number,
          receipt.supplier.company_name,
          receipt.receiving_location.name,
          <StatusBadge key={receipt.id} value={receipt.status} />,
          qty(receipt.lines.reduce((sum, line) => sum + Number(line.quantity_received), 0)),
          qty(receipt.lines.reduce((sum, line) => sum + Number(line.quantity_rejected), 0)),
          receipt.receipt_date.toLocaleString("en-KE"),
          <Link key={`${receipt.id}-view`} href={`/admin/purchases/goods-received/${receipt.id}`}>View</Link>
        ])} />
      </article>
    </AdminResourcePage>
  );
}
