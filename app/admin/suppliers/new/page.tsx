import { requirePermission } from "@/lib/admin/auth";
import { AdminResourcePage } from "@/components/admin/AdminResourcePage";
import { upsertSupplierAction } from "@/app/admin/purchases/actions";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";

export default async function NewSupplierPage() {
  await requirePermission("suppliers.manage");
  return <SupplierForm title="New Supplier" />;
}

function SupplierForm({ title }: { title: string }) {
  return (
    <AdminResourcePage eyebrow="Purchases / Suppliers" title={title} subtitle="Create a supplier without guessing tax, KRA PIN or lead-time data.">
      <article className="ceter-admin-panel">
        <form className="ceter-admin-form" action={upsertSupplierAction}>
          <label>Supplier code<input name="supplier_code" /></label>
          <label>Legal or trading name<input name="company_name" required /></label>
          <label>Trading name<input name="trading_name" /></label>
          <label>Contact person<input name="contact_person" /></label>
          <label>Telephone<input name="phone" /></label>
          <label>Email<input name="email" type="email" /></label>
          <label>KRA PIN<input name="kra_pin" /></label>
          <label>Tax/VAT status<input name="tax_status" /></label>
          <label>Payment terms<input name="payment_terms" /></label>
          <label>Currency<input name="currency" defaultValue="KES" /></label>
          <label className="wide">Address<textarea name="address" /></label>
          <label className="wide">Notes<textarea name="notes" /></label>
          <ToggleSwitch name="is_preferred" label="Preferred supplier" />
          <button className="ceter-admin-primary-button">Save supplier</button>
        </form>
      </article>
    </AdminResourcePage>
  );
}
