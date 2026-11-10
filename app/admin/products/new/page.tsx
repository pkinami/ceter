import { ProductForm } from "@/components/admin/ProductForm";
import { getProductFormLookups } from "@/lib/admin/data";
import { hasPermission, requirePermission } from "@/lib/admin/auth";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  const session = await requirePermission("products.create");
  const { brands, categories } = await getProductFormLookups();
  return (
    <div className="ceter-admin-page ceter-product-form-page">
      <div className="ceter-admin-greeting ceter-product-form-heading">
        <div>
          <p>Inventory&nbsp;&nbsp;&gt;&nbsp;&nbsp;Products &amp; Services&nbsp;&nbsp;&gt;&nbsp;&nbsp;Add Item</p>
          <h1>Add Item</h1>
        </div>
        <a className="ceter-admin-secondary-button" href="/admin/products">Back</a>
      </div>
      <AdminNotice success={params.success} error={params.error} />
      <ProductForm brands={brands} categories={categories} canEditCost={hasPermission(session, "products.cost_price.view")} />
    </div>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={`ceter-admin-message ${error ? "error" : "success"}`}>{error ?? success}</div>;
}
