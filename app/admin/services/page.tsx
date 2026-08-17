import Link from "next/link";
import { deleteServiceAction, upsertServiceAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { Card, EmptyState, Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getServiceEntries } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

type Props = { searchParams: Promise<{ success?: string; error?: string; edit?: string }> };

export default async function ServicesPage({ searchParams }: Props) {
  const params = await searchParams;
  await requireAdminSession();
  const services = await getServiceEntries();
  const editing = params.edit ? services.find((service) => service.id === params.edit) ?? null : null;

  return (
    <>
      <PageHeader title="Services" copy="Manage storefront service cards, quote calls-to-action, order, pricing and visibility." />
      <AdminNotice success={params.success} error={params.error} />
      <Card title={editing ? `Edit Service: ${editing.title}` : "Create Service"}>
        <form action={upsertServiceAction} className="grid gap-3 p-4 md:grid-cols-3">
          <input type="hidden" name="return_to" value="/admin/services" />
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input type="hidden" name="existing_image" value={editing?.image ?? ""} />
          <label className="grid gap-1 text-xs font-semibold">
            Title
            <input className="admin-input" name="title" autoComplete="off" defaultValue={editing?.title ?? ""} required />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Slug
            <input className="admin-input" name="slug" autoComplete="off" defaultValue={editing?.slug ?? ""} placeholder="auto-normalized from title" />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Sort order
            <input className="admin-input" name="sort_order" type="number" autoComplete="off" min={0} defaultValue={editing?.sort_order ?? 0} />
          </label>
          <label className="grid gap-1 text-xs font-semibold md:col-span-3">
            Description
            <input className="admin-input" name="description" autoComplete="off" defaultValue={editing?.description ?? ""} required />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Price KSh
            <input className="admin-input" name="price_kes" type="number" autoComplete="off" min={0} defaultValue={editing?.price_kes ?? ""} />
          </label>
          <label className="grid gap-1 text-xs font-semibold md:col-span-2">
            Image URL or /public path
            <input className="admin-input" name="image" autoComplete="off" defaultValue={editing?.image ?? ""} />
          </label>
          <label className="grid gap-1 text-xs font-semibold">
            Upload image
            <input className="admin-input" name="image_file" type="file" accept="image/*" />
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="show_request_quote" defaultChecked={editing?.show_request_quote ?? true} />
            Show quote CTA
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold">
            <input type="checkbox" name="is_enabled" defaultChecked={editing?.is_enabled ?? true} />
            Enabled on storefront
          </label>
          <div className="flex flex-wrap gap-2 md:col-span-3">
            <FormSubmitButton className="btn-dark" pendingText="Saving service...">{editing ? "Update Service" : "Create Service"}</FormSubmitButton>
            {editing ? <Link className="btn-lite" href="/admin/services">Cancel</Link> : null}
          </div>
        </form>
      </Card>
      {services.length ? (
        <Table headers={["Service", "Slug", "Price", "Sort", "Status", "Actions"]}>
          {services.map((service) => (
            <tr key={service.id}>
              <td><strong>{service.title}</strong><br /><span className="text-slate-500">{service.description}</span></td>
              <td>{service.slug}</td>
              <td>{service.price_kes == null ? "Quote" : <Money value={service.price_kes} />}</td>
              <td>{service.sort_order}</td>
              <td><Pill tone={service.is_enabled ? "green" : "gray"}>{service.is_enabled ? "Enabled" : "Disabled"}</Pill></td>
              <td>
                <div className="flex flex-wrap gap-2">
                  <Link className="btn-lite" href={`/admin/services?edit=${service.id}`}>Edit</Link>
                  <form action={deleteServiceAction}>
                    <input type="hidden" name="id" value={service.id} />
                    <FormSubmitButton className="btn-lite text-red-700" pendingText="Deleting..." confirmMessage="Delete this service from the storefront?">Delete</FormSubmitButton>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      ) : <EmptyState title="No services yet" copy="Create the first service to make it available for enabled homepage service sections." />}
    </>
  );
}

function AdminNotice({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div>;
}
