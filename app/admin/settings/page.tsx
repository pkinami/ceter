import { updateDeliveryFeesAction } from "@/app/admin/actions";
import { PageHeader, Table } from "@/components/admin/AdminPrimitives";
import { requireAdminSession } from "@/lib/admin/auth";
import { getDeliveryFees } from "@/lib/delivery";
import { formatKes } from "@/lib/utils";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  await requireAdminSession();
  const deliveryFees = await getDeliveryFees();
  const settings = [
    ["Company", "Ceter Technologies Limited", "Application configuration"],
    ["Product image bucket", process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images", "Server environment"],
    ["Storefront revalidation", "Enabled", "next/cache revalidatePath"],
    ["Payment secrets", "Configured only through environment variables", "Not exposed in admin"],
    ["Database pool", process.env.PRISMA_POOL_MAX || "default", "Server environment"]
  ];
  return (
    <>
      <PageHeader title="Store Settings" copy="Only backend-backed or environment-backed settings are shown. Secrets are intentionally hidden." />
      {params.error ? <p className="mb-3 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
      {params.success ? <p className="mb-3 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">{params.success}</p> : null}
      <section className="admin-card mb-4 p-4">
        <h2 className="text-sm font-black text-ink">Delivery Fees</h2>
        <p className="mt-1 text-xs text-slate-500">Kenyan ecommerce benchmarks vary by merchant and courier, so Ceter uses editable region fees instead of hard-coded competitor pricing.</p>
        <form action={updateDeliveryFeesAction} className="mt-4 grid gap-3 md:grid-cols-3">
          {deliveryFees.map((region) => (
            <label key={region.value} className="grid gap-2 rounded-md border border-line bg-white p-3 text-xs font-semibold">
              <span>{region.label}</span>
              <input className="admin-input" name={`delivery_fee_${region.value}`} type="number" autoComplete="off" min={0} step={1} defaultValue={region.feeKes} />
              <span className="text-slate-500">Currently {formatKes(region.feeKes)}</span>
              <span className="flex items-center gap-2">
                <input type="checkbox" name={`delivery_enabled_${region.value}`} defaultChecked={region.isEnabled} />
                Enabled
              </span>
            </label>
          ))}
          <button className="btn-dark md:col-span-3">Save Delivery Fees</button>
        </form>
      </section>
      <Table headers={["Setting", "Value", "Source"]}>
        {settings.map(([name, value, source]) => <tr key={name}><td>{name}</td><td>{value}</td><td>{source}</td></tr>)}
      </Table>
    </>
  );
}
