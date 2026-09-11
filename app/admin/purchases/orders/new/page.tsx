import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminResourcePage } from "@/components/admin/AdminResourcePage";
import { createPurchaseOrderAction } from "@/app/admin/purchases/actions";

export default async function NewPurchaseOrderPage() {
  await requirePermission("purchases.manage");
  const [suppliers, products, locations] = await Promise.all([
    prisma.supplier.findMany({ where: { is_active: true }, orderBy: { company_name: "asc" } }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 300 }),
    prisma.inventoryLocation.findMany({ where: { is_active: true }, orderBy: { name: "asc" } })
  ]);
  return (
    <AdminResourcePage eyebrow="Purchases / Orders" title="New Purchase Order" subtitle="Totals are recalculated on the server; browser-supplied totals are ignored.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={createPurchaseOrderAction}>
          <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          <label>Supplier<select name="supplier_id" required>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.company_name}</option>)}</select></label>
          <label>Delivery location<select name="delivery_location_id">{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <label>Currency<input name="currency" defaultValue="KES" /></label>
          <label>Expected delivery<input name="expected_delivery_date" type="date" /></label>
          {Array.from({ length: 6 }, (_, index) => <div className="wide ceter-admin-line-row" key={index}><select name={`product_id_${index}`}><option value="">Product</option>{products.map((product) => <option key={`${index}-${product.id}`} value={product.id}>{product.name} ({product.sku ?? product.mpn ?? "No SKU"})</option>)}</select><input name={`quantity_${index}`} type="number" step="0.001" min="0" placeholder="Qty" /><input name={`unit_cost_kes_${index}`} type="number" min="0" placeholder="Unit cost" /><input name={`discount_kes_${index}`} type="number" min="0" placeholder="Discount" /><input name={`tax_kes_${index}`} type="number" min="0" placeholder="Tax" /></div>)}
          <label className="wide">Internal notes<textarea name="notes" /></label>
          <label className="wide">Supplier notes<textarea name="supplier_notes" /></label>
          <button className="ceter-admin-primary-button">Submit purchase order</button>
        </form>
      </article>
    </AdminResourcePage>
  );
}
