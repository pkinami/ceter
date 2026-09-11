import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminResourcePage, qty } from "@/components/admin/AdminResourcePage";
import { createGoodsReceiptAction } from "@/app/admin/purchases/actions";

export default async function NewGoodsReceivedPage() {
  await requirePermission("purchases.manage");
  const [orders, locations] = await Promise.all([
    prisma.purchaseOrder.findMany({ where: { status: { in: ["submitted", "approved", "sent", "confirmed", "partially_received"] } }, include: { supplier: true, lines: { include: { product: true } } }, orderBy: { created_at: "desc" }, take: 20 }),
    prisma.inventoryLocation.findMany({ where: { is_active: true }, orderBy: { name: "asc" } })
  ]);
  const selected = orders[0];
  return (
    <AdminResourcePage eyebrow="Purchases / Goods Received" title="New Goods Received Note" subtitle="Receive against an open purchase order; posting is a separate controlled action.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={createGoodsReceiptAction}>
          <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          <label>Purchase order<select name="purchase_order_id" required>{orders.map((order) => <option key={order.id} value={order.id}>{order.po_number} - {order.supplier.company_name}</option>)}</select></label>
          <label>Receiving location<select name="receiving_location_id" required>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label>Supplier delivery note<input name="supplier_delivery_reference" /></label>
          <label>Condition<input name="condition" placeholder="Accepted / damaged / quarantine" /></label>
          {selected?.lines.map((line, index) => <div className="wide ceter-admin-line-row" key={line.id}><input type="hidden" name={`purchase_order_line_id_${index}`} value={line.id} /><span>{line.product.name} remaining {qty(Number(line.quantity) - Number(line.received_quantity))}</span><input name={`quantity_received_${index}`} type="number" step="0.001" min="0" placeholder="Received" /><input name={`quantity_rejected_${index}`} type="number" step="0.001" min="0" placeholder="Rejected" /><input name={`unit_cost_kes_${index}`} type="number" min="0" defaultValue={line.unit_cost_kes} /><textarea name={`serial_numbers_${index}`} placeholder="Serial numbers, one per line when required" /></div>)}
          <label className="wide">Inspection notes<textarea name="inspection_notes" /></label>
          <label className="wide">Notes<textarea name="notes" /></label>
          <button className="ceter-admin-primary-button">Create GRN</button>
        </form>
      </article>
    </AdminResourcePage>
  );
}
