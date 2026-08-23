import { ProductForm } from "@/components/admin/ProductForm";
import { getProductFormLookups } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  await requireAdminSession();
  const { brands, categories } = await getProductFormLookups();
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Storefront</p>
          <h1>Add Product</h1>
          <span>Create a real catalogue product. Published products appear on the Ceter storefront after save.</span>
        </div>
      </div>
      <AdminNotice success={params.success} error={params.error} />
      <ProductForm brands={brands} categories={categories} />
    </div>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={`ceter-admin-message ${error ? "error" : "success"}`}>{error ?? success}</div>;
}
