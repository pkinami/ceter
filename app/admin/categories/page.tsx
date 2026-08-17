import Link from "next/link";
import { deleteCategoryAction, upsertCategoryAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Card, EmptyState, Money, NumberText, PageHeader, Table } from "@/components/admin/AdminPrimitives";
import { getCategoryMetrics, toNumber } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";
import { BUILT_IN_PARENT_CATEGORIES, categoryIconMap } from "@/lib/category-icons";

type Props = { searchParams: Promise<{ success?: string; error?: string; edit?: string; q?: string }> };

export default async function CategoriesPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminSession();
  const rows = await getCategoryMetrics();
  const query = (params.q ?? "").trim().toLowerCase();
  const visibleRows = query
    ? rows.filter(({ category }) =>
        category.name.toLowerCase().includes(query) ||
        category.slug.toLowerCase().includes(query) ||
        (category.description ?? "").toLowerCase().includes(query) ||
        (category.parent?.name ?? "").toLowerCase().includes(query)
      )
    : rows;
  const editing = params.edit ? rows.find((row) => row.category.id === params.edit)?.category ?? null : null;
  const parentOptions = rows.filter((row) => row.category.id !== editing?.id);
  return (
    <>
      <PageHeader title="Categories" copy="Real three-level hierarchy with database product counts and stock values." />
      <AdminNotice success={params.success} error={params.error} />
      <div className="admin-card p-4 text-sm text-slate-700">
        <strong className="text-ink">Built-in parent categories</strong>
        <p className="mt-1">Category imports can use these known parent slugs. Icons apply to parent category tiles; child categories normally do not need icons. Category images are optional manual artwork and are not part of the import template.</p>
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          {BUILT_IN_PARENT_CATEGORIES.map((category) => (
            <div key={category.slug} className="rounded-md border border-slate-200 bg-white p-2 text-xs">
              <div className="font-black text-ink">{category.name}</div>
              <div className="mt-1 text-slate-500">{category.slug}</div>
              <div className="mt-1 font-semibold text-signal">Icon: {category.icon}</div>
            </div>
          ))}
        </div>
      </div>
      <Card title={editing ? `Edit Category: ${editing.name}` : "Create Category"}>
        <form action={upsertCategoryAction} className="grid gap-3 p-4 md:grid-cols-3">
          <input type="hidden" name="return_to" value="/admin/categories" />
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input type="hidden" name="existing_image" value={editing?.image ?? ""} />
          <label className="sr-only" htmlFor="category-name">Category name</label>
          <input id="category-name" className="admin-input" name="name" autoComplete="off" placeholder="Category name" defaultValue={editing?.name ?? ""} required />
          <label className="sr-only" htmlFor="category-slug">Category slug</label>
          <input id="category-slug" className="admin-input" name="slug" autoComplete="off" placeholder="slug (auto-normalized)" defaultValue={editing?.slug ?? ""} />
          <label className="sr-only" htmlFor="category-parent">Parent category</label>
          <select id="category-parent" className="admin-input" name="parent_id" autoComplete="off" defaultValue={editing?.parent_id ?? ""}>
            <option value="">Main category</option>
            {parentOptions.map(({ category }) => <option key={category.id} value={category.id}>{category.parent_id ? "Leaf under " : "Subcategory under "}{category.name}</option>)}
          </select>
          <label className="sr-only" htmlFor="category-description">Category description</label>
          <input id="category-description" className="admin-input" name="description" autoComplete="off" placeholder="Category description" defaultValue={editing?.description ?? ""} />
          <label className="sr-only" htmlFor="category-icon">Category icon</label>
          <select id="category-icon" className="admin-input" name="icon" autoComplete="off" defaultValue={editing?.icon ?? ""}>
            <option value="">No icon / child category</option>
            {Object.keys(categoryIconMap).map((icon) => <option key={icon} value={icon}>{icon}</option>)}
          </select>
          <label className="sr-only" htmlFor="category-sort-order">Sort order</label>
          <input id="category-sort-order" className="admin-input" name="sort_order" type="number" autoComplete="off" min={0} placeholder="Sort order" defaultValue={editing?.sort_order ?? ""} />
          <label className="sr-only" htmlFor="category-image">Category image URL</label>
          <input id="category-image" className="admin-input md:col-span-2" name="image" autoComplete="off" placeholder="Optional category image URL or /public path" defaultValue={editing?.image ?? ""} />
          <input className="admin-input" name="image_file" type="file" accept="image/*" />
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <FormSubmitButton className="btn-dark" pendingText="Saving category...">{editing ? "Update Category" : "Save Category"}</FormSubmitButton>
            {editing ? <Link className="btn-lite" href="/admin/categories">Cancel</Link> : null}
          </div>
        </form>
      </Card>
      <form action="/admin/categories" className="admin-card flex flex-wrap items-end gap-3 p-4">
        <label className="min-w-72 flex-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
          Find categories
          <input className="admin-input mt-2 w-full" name="q" type="search" autoComplete="off" placeholder="Search category name, slug, description, or parent" defaultValue={params.q ?? ""} />
        </label>
        <button className="btn-dark" type="submit">Search</button>
        {query ? <Link className="btn-lite" href="/admin/categories">Clear</Link> : null}
      </form>
      {visibleRows.length ? (
        <Table headers={["Category", "Level", "Products", "Published", "Stock Units", "Cost Value", "Selling Value", "Actions"]}>
          {visibleRows.map(({ category, metric }) => (
            <tr key={category.id}>
              <td><strong>{category.name}</strong><br /><span className="text-slate-500">{category.slug}</span></td>
              <td>{category.parent?.parent_id ? "Leaf category" : category.parent_id ? "Subcategory" : "Main category"}</td>
              <td><NumberText value={toNumber(metric.products)} /></td>
              <td><NumberText value={toNumber(metric.published)} /></td>
              <td><NumberText value={toNumber(metric.stock_units)} /></td>
              <td><Money value={toNumber(metric.cost_value)} /></td>
              <td><Money value={toNumber(metric.selling_value)} /></td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-lite" href={`/admin/categories?edit=${category.id}`}>Edit</Link>
                  <Link className="btn-lite" href={`/admin/products?category=${category.id}`}>Products</Link>
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="id" value={category.id} />
                    <FormSubmitButton className="btn-lite text-red-700" pendingText="Deleting..." confirmMessage="Delete this category? Products and banners linked to it will be uncategorised.">Delete</FormSubmitButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <EmptyState title={query ? "No matching categories" : "No categories yet"} copy={query ? "Clear the search or try a different category name, slug, description, or parent." : "Create categories manually or import a clean category workbook."} />
      )}
    </>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div>;
}
