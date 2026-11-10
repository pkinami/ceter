import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { AdminResourcePage } from "@/components/admin/AdminResourcePage";
import { upsertSupplierAction } from "@/app/admin/purchases/actions";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("suppliers.manage");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) notFound();
  return (
    <AdminResourcePage eyebrow="Purchases / Suppliers" title={`Edit ${supplier.company_name}`} subtitle="Update supplier details without rewriting purchase history.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={upsertSupplierAction}>
          <input type="hidden" name="id" value={supplier.id} />
          <label>Supplier code<input name="supplier_code" defaultValue={supplier.supplier_code ?? ""} /></label>
          <label>Legal or trading name<input name="company_name" required defaultValue={supplier.company_name} /></label>
          <label>Trading name<input name="trading_name" defaultValue={supplier.trading_name ?? ""} /></label>
          <label>Contact person<input name="contact_person" defaultValue={supplier.contact_person ?? ""} /></label>
          <label>Telephone<input name="phone" defaultValue={supplier.phone ?? ""} /></label>
          <label>Email<input name="email" type="email" defaultValue={supplier.email ?? ""} /></label>
          <label>KRA PIN<input name="kra_pin" defaultValue={supplier.kra_pin ?? ""} /></label>
          <label>Tax/VAT status<input name="tax_status" defaultValue={supplier.tax_status ?? ""} /></label>
          <label>Payment terms<input name="payment_terms" defaultValue={supplier.payment_terms ?? ""} /></label>
          <label>Currency<input name="currency" defaultValue={supplier.currency} /></label>
          <label className="wide">Address<textarea name="address" defaultValue={supplier.address ?? ""} /></label>
          <label className="wide">Notes<textarea name="notes" defaultValue={supplier.notes ?? ""} /></label>
          <ToggleSwitch name="is_preferred" defaultChecked={supplier.is_preferred} label="Preferred supplier" />
          <ToggleSwitch name="is_active" defaultChecked={supplier.is_active} label="Active" />
          <button className="ceter-admin-primary-button">Save supplier</button>
        </form>
      </article>
    </AdminResourcePage>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}
