import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/AdminPrimitives";
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
    <>
      <PageHeader title="Edit Product" copy="Changes persist to PostgreSQL and revalidate storefront catalogue routes." />
      <AdminNotice success={query.success} error={query.error} />
      <ProductForm product={product} brands={lookups.brands} categories={lookups.categories} />
    </>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div>;
}
