import { notFound } from "next/navigation";
import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, money, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";
import { postStockTakeAction, saveStockTakeCountsAction } from "@/app/admin/inventory/actions";

export default async function StockTakeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("inventory.stock_take");
  const canSeeCost = hasPermission(session, "products.cost_price.view");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const stockTake = await prisma.stockTake.findUnique({ where: { id }, include: { lines: { include: { product: true } }, status_history: true } });
  if (!stockTake) notFound();
  return (
    <AdminResourcePage eyebrow="Inventory / Stock Takes" title={stockTake.stock_take_number} subtitle={stockTake.name} stats={[{ label: "Status", value: stockTake.status }, { label: "Location", value: stockTake.location }, { label: "Lines", value: String(stockTake.lines.length) }]}>
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={saveStockTakeCountsAction}>
          <input type="hidden" name="id" value={stockTake.id} /><input type="hidden" name="return_to" value={`/admin/inventory/stock-takes/${stockTake.id}`} /><input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          {stockTake.lines.map((line) => (
            <div className="wide ceter-admin-line-row" key={line.id}>
              <span>{line.product.name}</span>
              <input aria-label={`Counted quantity for ${line.product.name}`} name={`counted_${line.id}`} type="number" step="0.001" min="0" defaultValue={line.counted_quantity === null ? "" : Number(line.counted_quantity)} disabled={["posted", "cancelled"].includes(stockTake.status)} />
              <input name={`reason_${line.id}`} placeholder="Reason" defaultValue={line.reason ?? ""} />
              <input name={`notes_${line.id}`} placeholder="Notes" defaultValue={line.notes ?? ""} />
            </div>
          ))}
          {!["posted", "cancelled"].includes(stockTake.status) ? <button className="ceter-admin-secondary-button">Save counts for review</button> : null}
        </form>
        <AdminTable columns={["Product", "SKU", "Snapshot", "Counted", "Variance", "Variance value"]} empty="No stock-take lines exist." rows={stockTake.lines.map((line) => [
          line.product.name,
          line.product.sku ?? "-",
          stockTake.blind_count && line.counted_quantity === null ? "Blind" : qty(line.snapshot_quantity),
          line.counted_quantity === null ? "-" : qty(line.counted_quantity),
          line.variance_quantity === null ? "-" : qty(line.variance_quantity),
          canSeeCost ? money(line.variance_value_kes) : "Restricted"
        ])} />
        {["under_review", "approved", "submitted"].includes(stockTake.status) ? <form action={postStockTakeAction}><input type="hidden" name="id" value={stockTake.id} /><input type="hidden" name="return_to" value={`/admin/inventory/stock-takes/${stockTake.id}`} /><input type="hidden" name="idempotency_key" value={crypto.randomUUID()} /><button className="ceter-admin-primary-button">Post variance movements</button></form> : null}
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Audit</span><h2>Status History</h2></div></div>
        <AdminTable columns={["Date", "From", "To", "Reason"]} empty="No status history has been recorded." rows={stockTake.status_history.map((event) => [event.created_at.toLocaleString("en-KE"), event.from_status ?? "-", <StatusBadge key={event.id} value={event.to_status} />, event.reason ?? "-"])} />
      </article>
    </AdminResourcePage>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}
