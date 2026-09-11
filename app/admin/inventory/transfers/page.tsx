import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function StockTransfersPage() {
  await requirePermission("inventory.transfer");
  const transfers = await prisma.stockTransfer.findMany({ include: { lines: { include: { product: true } } }, orderBy: { created_at: "desc" }, take: 80 });
  return (
    <AdminResourcePage eyebrow="Inventory / Transfers" title="Stock Transfers" subtitle="Create, dispatch and receive branch/location transfers without losing stock history." action={<Link className="ceter-admin-primary-button" href="/admin/inventory/transfers/new">New transfer</Link>}>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Filters</span><h2>Search by number, status, source, destination or product</h2></div></div>
        <form className="ceter-admin-filter-row"><label>Search<input name="q" /></label><label>Status<input name="status" /></label><label>Location<input name="location" /></label></form>
        <AdminTable columns={["Number", "Source", "Destination", "Status", "Requested", "Lines", "Quantity", "Action"]} empty="No stock transfers have been created." rows={transfers.map((transfer) => [
          transfer.transfer_number,
          transfer.source_location,
          transfer.destination_location,
          <StatusBadge key={transfer.id} value={transfer.status} />,
          transfer.created_at.toLocaleString("en-KE"),
          String(transfer.lines.length),
          qty(transfer.lines.reduce((sum, line) => sum + Number(line.quantity), 0)),
          <Link key={`${transfer.id}-view`} href={`/admin/inventory/transfers/${transfer.id}`}>View</Link>
        ])} />
      </article>
    </AdminResourcePage>
  );
}
