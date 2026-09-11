import { requirePermission, hasPermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, label, AdminResourcePage, qty, StatusBadge } from "@/components/admin/AdminResourcePage";
import { archiveInventoryLocationAction, createInventoryLocationAction } from "@/app/admin/inventory/actions";

export default async function InventoryLocationsPage() {
  const session = await requirePermission("inventory.view");
  const canManage = hasPermission(session, "inventory.locations.manage");
  const locations = await prisma.inventoryLocation.findMany({ include: { balances: true }, orderBy: [{ is_active: "desc" }, { name: "asc" }] });
  return (
    <AdminResourcePage eyebrow="Inventory / Locations" title="Locations / Warehouses" subtitle="Branch-aware stock locations, default receiving and dispatch points.">
      {canManage ? (
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Location setup</span><h2>Create or edit location</h2></div></div>
          <form className="ceter-admin-form" action={createInventoryLocationAction}>
            <label>Name<input name="name" required /></label>
            <label>Code<input name="code" required /></label>
            <label>Branch<input name="branch" /></label>
            <label>Type<select name="location_type" defaultValue="main_warehouse"><option value="main_warehouse">Main warehouse</option><option value="branch_store">Branch store</option><option value="showroom">Showroom</option><option value="service_workshop">Service workshop</option><option value="returns_quarantine">Returns / quarantine</option><option value="goods_in_transit">Goods in transit</option></select></label>
            <label className="wide">Description<textarea name="description" /></label>
            <label className="wide">Address<textarea name="address" /></label>
            <label><input type="checkbox" name="is_active" defaultChecked /> Active</label>
            <label><input type="checkbox" name="is_default_receiving" /> Default receiving</label>
            <label><input type="checkbox" name="is_default_dispatch" /> Default dispatch</label>
            <button className="ceter-admin-primary-button">Save location</button>
          </form>
        </article>
      ) : null}
      <article className="ceter-admin-panel">
        <AdminTable columns={["Name", "Code", "Branch", "Type", "Products", "On hand", "Defaults", "Status", "Actions"]} empty="No inventory locations have been configured." rows={locations.map((location) => [
          location.name,
          location.code,
          location.branch ?? "-",
          label(location.location_type),
          String(location.balances.length),
          qty(location.balances.reduce((sum, balance) => sum + Number(balance.on_hand_quantity), 0)),
          [location.is_default_receiving ? "Receiving" : null, location.is_default_dispatch ? "Dispatch" : null].filter(Boolean).join(", ") || "-",
          <StatusBadge key={location.id} value={location.is_active ? "active" : "archived"} />,
          canManage ? <form key={`${location.id}-archive`} action={archiveInventoryLocationAction}><input type="hidden" name="id" value={location.id} /><button className="ceter-admin-secondary-button">Archive</button></form> : "View"
        ])} />
      </article>
    </AdminResourcePage>
  );
}
