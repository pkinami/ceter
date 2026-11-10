import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminResourcePage } from "@/components/admin/AdminResourcePage";
import { createStockTakeAction } from "@/app/admin/inventory/actions";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";

export default async function NewStockTakePage() {
  await requirePermission("inventory.stock_take");
  const locations = await prisma.inventoryLocation.findMany({ where: { is_active: true }, orderBy: { name: "asc" } });
  return (
    <AdminResourcePage eyebrow="Inventory / Stock Takes" title="New Stock Take" subtitle="Start a count by freezing current audited balances for a location.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={createStockTakeAction}>
          <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
          <label>Name<input name="name" required placeholder="Monthly count" /></label>
          <label>Location<select name="location_id" required>{locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}</select></label>
          <ToggleSwitch name="blind_count" label="Blind count" />
          <button className="ceter-admin-primary-button">Open stock take</button>
        </form>
      </article>
    </AdminResourcePage>
  );
}
