import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";
import { dispatchStockTransferAction, receiveStockTransferAction } from "@/app/admin/inventory/actions";

export default async function StockTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("inventory.transfer");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const transfer = await prisma.stockTransfer.findUnique({ where: { id }, include: { lines: { include: { product: true } }, status_history: true } });
  if (!transfer) notFound();
  return (
    <AdminResourcePage eyebrow="Inventory / Transfers" title={transfer.transfer_number} subtitle={`${transfer.source_location} to ${transfer.destination_location}`} stats={[{ label: "Status", value: transfer.status }, { label: "Lines", value: String(transfer.lines.length) }, { label: "Dispatched", value: transfer.dispatched_at?.toLocaleString("en-KE") ?? "Pending" }]}>
      <article className="ceter-admin-panel">
        <AdminTable columns={["Product", "SKU", "Requested", "Dispatched", "Received", "Remaining"]} empty="No transfer lines exist." rows={transfer.lines.map((line) => [
          line.product.name,
          line.product.sku ?? "-",
          qty(line.quantity),
          qty(line.dispatched_quantity),
          qty(line.received_quantity),
          qty(Number(line.dispatched_quantity) - Number(line.received_quantity))
        ])} />
        {["submitted", "approved", "ready_for_dispatch"].includes(transfer.status) ? <form action={dispatchStockTransferAction}><input type="hidden" name="id" value={transfer.id} /><input type="hidden" name="return_to" value={`/admin/inventory/transfers/${transfer.id}`} /><input type="hidden" name="idempotency_key" value={crypto.randomUUID()} /><button className="ceter-admin-primary-button">Dispatch transfer</button></form> : null}
        {["in_transit", "partially_received"].includes(transfer.status) ? (
          <form className="ceter-admin-form" action={receiveStockTransferAction}>
            <input type="hidden" name="id" value={transfer.id} /><input type="hidden" name="return_to" value={`/admin/inventory/transfers/${transfer.id}`} /><input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
            {transfer.lines.map((line) => <label key={line.id}>{line.product.name}<input name={`receive_${line.id}`} type="number" step="0.001" min="0" max={Number(line.dispatched_quantity) - Number(line.received_quantity)} defaultValue={Number(line.dispatched_quantity) - Number(line.received_quantity)} /></label>)}
            <button className="ceter-admin-primary-button">Receive quantities</button>
          </form>
        ) : null}
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Audit</span><h2>Status History</h2></div></div>
        <AdminTable columns={["Date", "From", "To", "Reason"]} empty="No status history has been recorded." rows={transfer.status_history.map((event) => [event.created_at.toLocaleString("en-KE"), event.from_status ?? "-", <StatusBadge key={event.id} value={event.to_status} />, event.reason ?? "-"])} />
      </article>
    </AdminResourcePage>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}
