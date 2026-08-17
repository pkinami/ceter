import Link from "next/link";
import { deleteHomepageSectionAction, upsertHomepageSectionAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Card, EmptyState, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getHomepageSectionsAdmin, getProductFilters } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

type Props = { searchParams: Promise<{ success?: string; error?: string; edit?: string }> };

export default async function HomepagePage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminSession();
  const [sections, { categories }] = await Promise.all([getHomepageSectionsAdmin(), getProductFilters()]);
  const editing = params.edit ? sections.find((section) => section.id === params.edit) ?? null : null;

  return (
    <>
      <PageHeader title="Homepage" copy="Manage homepage product, service and brand sections with live ordering and visibility." />
      <AdminNotice success={params.success} error={params.error} />
      <Card title={editing ? `Edit Section: ${editing.title}` : "Create Homepage Section"}>
        <form action={upsertHomepageSectionAction} className="grid gap-3 p-4 md:grid-cols-3">
          <input type="hidden" name="return_to" value="/admin/homepage" />
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <label className="grid gap-1 text-xs font-semibold">
            Title
            <input className="admin-input" name="title" defaultValue={editing?.title ?? ""} required />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Section type
            <select className="admin-input" name="section_type" defaultValue={editing?.section_type ?? "category_products"}>
              <option value="category_products">Category products</option>
              <option value="latest_products">Latest products</option>
              <option value="services">Services</option>
              <option value="brands">Brands</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Category
            <select className="admin-input" name="category_id" defaultValue={editing?.category_id ?? ""}>
              <option value="">No category</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Sort order
            <input className="admin-input" name="sort_order" type="number" min={0} defaultValue={editing?.sort_order ?? 0} />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Product/service limit
            <input className="admin-input" name="product_limit" type="number" min={1} max={24} defaultValue={editing?.product_limit ?? 8} />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="is_enabled" defaultChecked={editing?.is_enabled ?? true} />
            Enabled on homepage
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <FormSubmitButton className="btn-dark" pendingText="Saving section...">{editing ? "Update Section" : "Create Section"}</FormSubmitButton>
            {editing ? <Link className="btn-lite" href="/admin/homepage">Cancel</Link> : null}
          </div>
        </form>
      </Card>
      {sections.length ? (
        <Table headers={["Section", "Type", "Category", "Limit", "Sort", "Status", "Actions"]}>
          {sections.map((section) => (
            <tr key={section.id}>
              <td><strong>{section.title}</strong></td>
              <td>{section.section_type}</td>
              <td>{section.category?.name ?? "None"}</td>
              <td>{section.product_limit}</td>
              <td>{section.sort_order}</td>
              <td><Pill tone={section.is_enabled ? "green" : "gray"}>{section.is_enabled ? "Enabled" : "Disabled"}</Pill></td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-lite" href={`/admin/homepage?edit=${section.id}`}>Edit</Link>
                  <form action={deleteHomepageSectionAction}>
                    <input type="hidden" name="id" value={section.id} />
                    <FormSubmitButton className="btn-lite text-red-700" pendingText="Deleting..." confirmMessage="Delete this homepage section?">Delete</FormSubmitButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : <EmptyState title="No homepage sections yet" copy="Create a section to control what appears below the homepage hero." />}
    </>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div>;
}
