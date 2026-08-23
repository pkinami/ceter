import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductFormLookups } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const [routeParams, query] = await Promise.all([params, searchParams]);
  await requireAdminSession();
  const [product, lookups] = await Promise.all([
    prisma.product.findUnique({ where: { id: routeParams.id } }),
    getProductFormLookups()
  ]);
  if (!product) notFound();
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Storefront</p>
          <h1>Edit Product</h1>
          <span>Changes persist to PostgreSQL, audit price and stock movement where applicable, and revalidate storefront catalogue routes.</span>
        </div>
      </div>
      <AdminNotice success={query.success} error={query.error} />
      <ProductForm product={product} brands={lookups.brands} categories={lookups.categories} />
    </div>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={`ceter-admin-message ${error ? "error" : "success"}`}>{error ?? success}</div>;
}
