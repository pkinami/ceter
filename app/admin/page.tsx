import Link from "next/link";
import { Card, Kpi, KpiGrid, Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
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
          <Table headers={["Type", "Record", "Status", "When"]} minWidth={720}>
            {stats.recentProducts.map((product) => (
              <tr key={`p-${product.id}`}>
                <td>Product</td>
                <td><Link href={`/admin/products?q=${encodeURIComponent(product.name)}`} className="font-semibold hover:text-signal">{product.name}</Link></td>
                <td><Pill tone={product.is_published ? "green" : "amber"}>{product.is_published ? "Published" : "Draft"}</Pill></td>
                <td>{product.updated_at.toLocaleString("en-KE")}</td>
              </tr>
            ))}
            {stats.recentOrders.map((order) => (
              <tr key={`o-${order.id}`}>
                <td>Order</td>
                <td><Link href="/admin/orders" className="font-semibold hover:text-signal">{order.profile?.full_name ?? order.id.slice(0, 8)}</Link></td>
                <td><Pill tone={order.status === "cancelled" ? "red" : "teal"}>{order.status}</Pill></td>
                <td>{order.created_at.toLocaleString("en-KE")}</td>
              </tr>
            ))}
            {stats.recentQuotes.map((quote) => (
              <tr key={`q-${quote.id}`}>
                <td>Quote</td>
                <td><Link href="/admin/quotes" className="font-semibold hover:text-signal">{quote.name}</Link></td>
                <td><Pill tone={quote.status === "won" ? "green" : "gray"}>{quote.status}</Pill></td>
                <td>{quote.created_at.toLocaleString("en-KE")}</td>
              </tr>
            ))}
          </Table>
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
