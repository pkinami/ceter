import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, label, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";
import { postStockAdjustmentAction } from "@/app/admin/inventory/actions";

export default async function StockAdjustmentsPage() {
  await requirePermission("inventory.adjust");
  const [products, locations, adjustments] = await Promise.all([
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 300 }),
    prisma.inventoryLocation.findMany({ where: { is_active: true }, orderBy: { name: "asc" } }),
    prisma.stockAdjustment.findMany({ include: { product: true, location: true, posted_by: true }, orderBy: { created_at: "desc" }, take: 50 })
  ]);
  return (
    <AdminResourcePage eyebrow="Inventory / Adjustments" title="Stock Adjustments" subtitle="Post positive or negative corrections as immutable audited movements.">
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Adjustment workflow</span><h2>Select location and product, preview balance, confirm and post</h2></div></div>
        <form className="ceter-admin-form" action={postStockAdjustmentAction}>
          <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          <label>Location<select name="location_id" required>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label>Product<select name="product_id" required>{products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku ?? product.mpn ?? "No SKU"})</option>)}</select></label>
          <label>Adjustment quantity<input name="quantity" type="number" step="0.001" required placeholder="-1 or 5" /></label>
          <label>Reason<select name="reason" defaultValue="data_correction"><option value="opening_balance_correction">Opening balance correction</option><option value="damage">Damage</option><option value="loss">Loss</option><option value="data_correction">Data correction</option><option value="found_stock">Found stock</option><option value="warranty_replacement">Warranty replacement</option><option value="demonstration_stock">Demonstration stock</option><option value="quarantine">Quarantine</option><option value="other_approved_reason">Other approved reason</option></select></label>
          <label className="wide">Notes<textarea name="notes" placeholder="Required for exceptional adjustments" /></label>
          <button className="ceter-admin-primary-button">Confirm and post movement</button>
        </form>
      </article>
      <article className="ceter-admin-panel">
        <AdminTable columns={["Date", "Number", "Product", "Location", "Quantity", "Reason", "Posted by", "Status"]} empty="No stock adjustments have been posted." rows={adjustments.map((adjustment) => [
          adjustment.created_at.toLocaleString("en-KE"),
          adjustment.adjustment_number,
          adjustment.product.name,
          adjustment.location.name,
          qty(adjustment.quantity),
          label(adjustment.reason),
          adjustment.posted_by?.full_name ?? adjustment.posted_by?.email ?? "System",
          <StatusBadge key={adjustment.id} value={adjustment.status} />
        ])} />
      </article>
    </AdminResourcePage>
  );
}
