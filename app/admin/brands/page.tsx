import Link from "next/link";
import { deleteBrandAction, upsertBrandAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Card, EmptyState, Money, NumberText, PageHeader, Table } from "@/components/admin/AdminPrimitives";
import { getBrandMetrics, toNumber } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

type Props = { searchParams: Promise<{ success?: string; error?: string }> };

export default async function BrandsPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminSession();
  const rows = await getBrandMetrics();
  return (
    <>
      <PageHeader title="Brands" copy="Database brands with live catalogue, stock and value metrics." />
      <AdminNotice success={params.success} error={params.error} />
      <Card title="Create / Update Brand">
        <form action={upsertBrandAction} className="grid gap-3 p-4 md:grid-cols-4">
          <input type="hidden" name="return_to" value="/admin/brands" />
          <label className="sr-only" htmlFor="brand-name">Brand name</label>
          <input id="brand-name" className="admin-input" name="name" autoComplete="organization" placeholder="Brand or business name" required />
          <label className="sr-only" htmlFor="brand-slug">Brand slug</label>
          <input id="brand-slug" className="admin-input" name="slug" autoComplete="off" placeholder="slug (auto-normalized)" />
          <label className="sr-only" htmlFor="brand-icon">Brand icon URL</label>
          <input id="brand-icon" className="admin-input" name="icon" autoComplete="off" placeholder="/brands/hp.svg or local asset" />
          <input className="admin-input" name="icon_file" type="file" accept="image/*" />
          <FormSubmitButton className="btn-dark md:col-span-4" pendingText="Saving brand...">Save Brand</FormSubmitButton>
        </form>
      </Card>
      {rows.length ? (
        <Table headers={["Brand", "Products", "Published", "In Stock", "Backorder", "Stock Value", "Category Distribution", "Actions"]} minWidth={1040}>
          {rows.map(({ brand, metric, distribution }) => (
            <tr key={brand.id}>
              <td><strong>{brand.name}</strong><br /><span className="text-slate-500">{brand.slug}</span></td>
              <td><NumberText value={toNumber(metric.products)} /></td>
              <td><NumberText value={toNumber(metric.published)} /></td>
              <td><NumberText value={toNumber(metric.in_stock)} /></td>
              <td><NumberText value={toNumber(metric.backorder)} /></td>
              <td><Money value={toNumber(metric.stock_value)} /></td>
              <td>{distribution.map((item) => `${item.category_name ?? "Uncategorised"}: ${toNumber(item.products)}`).join(", ") || "None"}</td>
              <td>
                <details className="space-y-3">
                  <summary className="cursor-pointer font-bold text-signal">Manage</summary>
                  <form action={upsertBrandAction} className="grid min-w-72 gap-2">
                    <input type="hidden" name="id" value={brand.id} />
                    <input type="hidden" name="return_to" value="/admin/brands" />
                    <input type="hidden" name="existing_icon" value={brand.icon ?? ""} />
                    <label className="sr-only" htmlFor={`brand-name-${brand.id}`}>Brand name</label>
                    <input id={`brand-name-${brand.id}`} className="admin-input" name="name" autoComplete="organization" defaultValue={brand.name} required />
                    <label className="sr-only" htmlFor={`brand-slug-${brand.id}`}>Brand slug</label>
                    <input id={`brand-slug-${brand.id}`} className="admin-input" name="slug" autoComplete="off" defaultValue={brand.slug} required />
                    <label className="sr-only" htmlFor={`brand-icon-${brand.id}`}>Brand icon URL</label>
                    <input id={`brand-icon-${brand.id}`} className="admin-input" name="icon" autoComplete="off" defaultValue={brand.icon ?? ""} placeholder="Icon URL" />
                    <input className="admin-input" name="icon_file" type="file" accept="image/*" />
                    <div className="flex flex-wrap gap-2">
                      <FormSubmitButton className="btn-dark" pendingText="Updating...">Update</FormSubmitButton>
                      <Link className="btn-lite" href={`/admin/products?brand=${brand.id}`}>Products</Link>
                    </div>
                  </form>
                  <form action={deleteBrandAction}>
                    <input type="hidden" name="id" value={brand.id} />
                    <FormSubmitButton className="btn-lite text-red-700" pendingText="Deleting..." confirmMessage="Delete this brand? Linked products will become unbranded.">Delete</FormSubmitButton>
                  </form>
                </details>
              </td>
            </tr>
          ))}
        </Table>
      ) : <EmptyState title="No brands yet" copy="Create brands manually or import products with brand names." />}
    </>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div>;
}
