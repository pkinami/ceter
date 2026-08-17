import { PageHeader } from "@/components/admin/AdminPrimitives";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductFormLookups } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const params = await searchParams;
  await requireAdminSession();
  const { brands, categories } = await getProductFormLookups();
  return (
    <>
      <PageHeader title="Add Product" copy="Create a real catalogue product. Published products appear on the storefront after save." />
      <AdminNotice success={params.success} error={params.error} />
      <ProductForm brands={brands} categories={categories} />
    </>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div>;
}
