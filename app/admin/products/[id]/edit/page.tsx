import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductFormLookups } from "@/lib/admin/data";
import { hasPermission, requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  const session = await requirePermission("products.update");
  if (!isRecordId(routeParams.id)) notFound();
  const [product, lookups] = await Promise.all([
    prisma.product.findUnique({ where: { id: routeParams.id } }),
    getProductFormLookups()
  ]);
  if (!product) notFound();
  return (
    <div className="ceter-admin-page ceter-product-form-page">
      <div className="ceter-admin-greeting ceter-product-form-heading">
        <div>
          <p>Inventory&nbsp;&nbsp;&gt;&nbsp;&nbsp;Products &amp; Services&nbsp;&nbsp;&gt;&nbsp;&nbsp;Edit Item</p>
          <h1>Edit Item</h1>
        </div>
        <a className="ceter-admin-secondary-button" href="/admin/products">Back</a>
      </div>
      <AdminNotice success={query.success} error={query.error} />
      <ProductForm product={product} brands={lookups.brands} categories={lookups.categories} canEditCost={hasPermission(session, "products.cost_price.view")} />
    </div>
  );
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={`ceter-admin-message ${error ? "error" : "success"}`}>{error ?? success}</div>;
}
