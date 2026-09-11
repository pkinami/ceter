import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function StockTakesPage() {
  await requirePermission("inventory.stock_take");
  const stockTakes = await prisma.stockTake.findMany({ include: { lines: true }, orderBy: { created_at: "desc" }, take: 80 });
  return (
    <AdminResourcePage eyebrow="Inventory / Stock Takes" title="Stock Takes" subtitle="Physical counts with frozen snapshots, review and variance posting." action={<Link className="ceter-admin-primary-button" href="/admin/inventory/stock-takes/new">New stock take</Link>}>
      <article className="ceter-admin-panel">
        <form className="ceter-admin-filter-row"><label>Search<input name="q" /></label><label>Status<input name="status" /></label><label>Location<input name="location" /></label></form>
        <AdminTable columns={["Number", "Name", "Location", "Status", "Lines", "Variance", "Started", "Action"]} empty="No stock takes have been created." rows={stockTakes.map((stockTake) => [
          stockTake.stock_take_number,
          stockTake.name,
          stockTake.location,
          <StatusBadge key={stockTake.id} value={stockTake.status} />,
          String(stockTake.lines.length),
          qty(stockTake.lines.reduce((sum, line) => sum + Number(line.variance_quantity ?? 0), 0)),
          stockTake.started_at?.toLocaleString("en-KE") ?? "-",
          <Link key={`${stockTake.id}-view`} href={`/admin/inventory/stock-takes/${stockTake.id}`}>Open</Link>
        ])} />
      </article>
    </AdminResourcePage>
  );
}
