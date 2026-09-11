import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminResourcePage } from "@/components/admin/AdminResourcePage";
import { createStockTransferAction } from "@/app/admin/inventory/actions";

export default async function NewStockTransferPage() {
  await requirePermission("inventory.transfer");
  const [locations, balances] = await Promise.all([
    prisma.inventoryLocation.findMany({ where: { is_active: true }, orderBy: { name: "asc" } }),
    prisma.inventoryBalance.findMany({ include: { product: true, location: true }, orderBy: { product: { name: "asc" } }, take: 300 })
  ]);
  return (
    <AdminResourcePage eyebrow="Inventory / Transfers" title="New Stock Transfer" subtitle="Submit a controlled source-to-destination transfer. Dispatch posts stock out; receipt posts stock in.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={createStockTransferAction}>
          <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          <label>Source location<select name="source_location_id" required>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label>Destination location<select name="destination_location_id" required>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          {Array.from({ length: 6 }, (_, index) => (
            <div className="wide ceter-admin-line-row" key={index}>
              <select name={`product_id_${index}`}><option value="">Inventory item</option>{balances.map((balance) => <option key={`${index}-${balance.id}`} value={balance.product_id}>{balance.product.name} - {balance.location.name} - available {Number(balance.available_quantity)}</option>)}</select>
              <input name={`quantity_${index}`} type="number" step="0.001" min="0" placeholder="Quantity" />
            </div>
          ))}
          <label className="wide">Notes<textarea name="notes" /></label>
          <button className="ceter-admin-primary-button">Submit transfer</button>
        </form>
      </article>
    </AdminResourcePage>
  );
}
