import Link from "next/link";
import { Card, Kpi, KpiGrid, Money, PageHeader, Pill } from "@/components/admin/AdminPrimitives";
import { getAdminDashboard } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";
import { formatKes } from "@/lib/utils";

export const metadata = { title: "Admin | Ceter Operations" };

export default async function AdminPage() {
  await requireAdminSession();
  const stats = await getAdminDashboard();
  const potentialMargin = stats.inventorySellingValue - stats.inventoryCostValue;

  return (
    <>
      <PageHeader title="Dashboard" copy="Live operational metrics from PostgreSQL. No mock records are included." />
      <KpiGrid>
        <Kpi label="Total products" value={stats.totalProducts} note={`${stats.publishedProducts} published / ${stats.draftProducts} draft`} />
        <Kpi label="In-stock products" value={stats.inStockProducts} note={`${stats.backorderProducts} backorder products`} />
        <Kpi label="Low stock" value={stats.lowStockProducts} note={`${stats.stockUnits} stock units on hand`} />
        <Kpi label="Inventory cost value" value={formatKes(stats.inventoryCostValue)} note={`Selling value ${formatKes(stats.inventorySellingValue)}`} />
        <Kpi label="Paid revenue" value={formatKes(stats.paidRevenue)} note={`${stats.paidPayments} paid payment records`} />
        <Kpi label="Orders" value={stats.orders} note="Real order table count" />
        <Kpi label="Quotes" value={stats.quotes} note="Quote pipeline records" />
        <Kpi label="Customers" value={stats.customers} note="Authenticated customer profiles" />
        <Kpi label="Potential gross margin" value={formatKes(potentialMargin)} note="Selling value minus known cost value" />
        <Kpi label="Draft products" value={stats.draftProducts} note="Hidden from storefront until published" />
      </KpiGrid>

      <div className="admin-grid-2">
        <Card title="Recent Activity" tag="database">
          <RecentActivity stats={stats} />
        </Card>

        <Card title="Payments" tag="paid data only">
          <div className="p-4 text-sm text-slate-600">
            <p className="font-semibold text-ink">Revenue shown here uses only `PaymentTransaction.status = paid`.</p>
            <p className="mt-2">Unpaid, pending, failed, or abandoned payments are listed on the payments page but are not counted as revenue.</p>
            <div className="mt-4 rounded-md border border-line bg-white p-3">
              <div className="text-xs uppercase text-slate-500">Paid revenue</div>
              <div className="mt-1 text-2xl font-black"><Money value={stats.paidRevenue} /></div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function RecentActivity({ stats }: { stats: Awaited<ReturnType<typeof getAdminDashboard>> }) {
  const rows = [
    ...stats.recentProducts.map((product) => ({
      id: `p-${product.id}`,
      type: "Product",
      href: `/admin/products?q=${encodeURIComponent(product.name)}`,
      record: product.name,
      status: product.is_published ? "Published" : "Draft",
      tone: product.is_published ? "green" as const : "amber" as const,
      when: product.updated_at.toLocaleString("en-KE")
    })),
    ...stats.recentOrders.map((order) => ({
      id: `o-${order.id}`,
      type: "Order",
      href: "/admin/orders",
      record: order.profile?.full_name ?? order.id.slice(0, 8),
      status: order.status,
      tone: order.status === "cancelled" ? "red" as const : "teal" as const,
      when: order.created_at.toLocaleString("en-KE")
    })),
    ...stats.recentQuotes.map((quote) => ({
      id: `q-${quote.id}`,
      type: "Quote",
      href: "/admin/quotes",
      record: quote.name,
      status: quote.status,
      tone: quote.status === "won" ? "green" as const : "gray" as const,
      when: quote.created_at.toLocaleString("en-KE")
    }))
  ];

  return (
    <>
      <div className="grid gap-2 p-3 md:hidden">
        {rows.map((row) => (
          <div key={row.id} className="rounded-md border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase text-slate-500">{row.type}</div>
                <Link href={row.href} className="mt-0.5 block truncate text-sm font-semibold text-ink hover:text-signal">{row.record}</Link>
              </div>
              <Pill tone={row.tone}>{row.status}</Pill>
            </div>
            <div className="mt-2 text-[11px] font-semibold text-slate-500">{row.when}</div>
          </div>
        ))}
      </div>
      <div className="hidden md:block">
        <div className="admin-table-wrap">
          <table style={{ minWidth: 720 }}>
            <thead>
              <tr>{["Type", "Record", "Status", "When"].map((header) => <th key={header}>{header}</th>)}</tr>
            </thead>
            <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.type}</td>
              <td><Link href={row.href} className="font-semibold hover:text-signal">{row.record}</Link></td>
              <td><Pill tone={row.tone}>{row.status}</Pill></td>
              <td>{row.when}</td>
            </tr>
          ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
