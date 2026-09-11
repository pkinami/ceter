import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminTable, AdminResourcePage, StatusBadge } from "@/components/admin/AdminResourcePage";

export default async function SerialNumbersPage() {
  await requirePermission("inventory.serials.manage");
  const serials = await prisma.serialNumber.findMany({ include: { product: true, current_location: true, supplier: true, goods_receipt: true }, orderBy: { updated_at: "desc" }, take: 100 });
  return (
    <AdminResourcePage eyebrow="Inventory / Serials" title="Serial Number Tracking" subtitle="Serialized stock location, status, supplier, receipt and warranty traceability.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-filter-row"><label>Search<input name="q" placeholder="Serial, SKU, product or barcode input" /></label><label>Status<input name="status" /></label><label>Location<input name="location" /></label></form>
        <AdminTable columns={["Serial number", "Product", "SKU", "Location", "Status", "Supplier", "GRN", "Warranty"]} empty="No serial numbers have been recorded. Serial numbers are never invented." rows={serials.map((serial) => [
          serial.serial_number,
          serial.product.name,
          serial.product.sku ?? "-",
          serial.current_location?.name ?? "-",
          <StatusBadge key={serial.id} value={serial.status} />,
          serial.supplier?.company_name ?? "-",
          serial.goods_receipt?.grn_number ?? "-",
          serial.warranty_ends_at ? serial.warranty_ends_at.toLocaleDateString("en-KE") : "-"
        ])} />
      </article>
    </AdminResourcePage>
  );
}
