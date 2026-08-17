import { Card, Money, NumberText, PageHeader, Table } from "@/components/admin/AdminPrimitives";
import { getAdminDashboard, getReports, toNumber } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function ReportsPage() {
  await requireAdminSession();
  const [dashboard, reports] = await Promise.all([getAdminDashboard(), getReports()]);
  return (
    <>
      <PageHeader title="Reports" copy="Real aggregate reports from products, orders, payments and quote pipeline." />
      <div className="admin-grid-2">
        <Card title="Products By Brand">
          <Table headers={["Brand", "Products", "Published", "Stock", "Cost Value", "Selling Value"]} minWidth={760}>
            {reports.byBrand.map((row) => (
              <tr key={row.name ?? "unbranded"}>
                <td>{row.name ?? "Unbranded"}</td>
                <td><NumberText value={toNumber(row.products)} /></td>
                <td><NumberText value={toNumber(row.published)} /></td>
                <td><NumberText value={toNumber(row.stock_units)} /></td>
                <td><Money value={toNumber(row.cost_value)} /></td>
                <td><Money value={toNumber(row.selling_value)} /></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Products By Category">
          <Table headers={["Category", "Products", "Published", "Stock", "Cost Value", "Selling Value"]} minWidth={760}>
            {reports.byCategory.map((row) => (
              <tr key={row.name ?? "uncategorised"}>
                <td>{row.name ?? "Uncategorised"}</td>
                <td><NumberText value={toNumber(row.products)} /></td>
                <td><NumberText value={toNumber(row.published)} /></td>
                <td><NumberText value={toNumber(row.stock_units)} /></td>
                <td><Money value={toNumber(row.cost_value)} /></td>
                <td><Money value={toNumber(row.selling_value)} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Card title="Financial And Pipeline Totals">
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <div className="admin-card p-3"><div className="text-xs text-slate-500">Inventory cost value</div><div className="mt-1 font-black"><Money value={dashboard.inventoryCostValue} /></div></div>
          <div className="admin-card p-3"><div className="text-xs text-slate-500">Inventory selling value</div><div className="mt-1 font-black"><Money value={dashboard.inventorySellingValue} /></div></div>
          <div className="admin-card p-3"><div className="text-xs text-slate-500">Potential gross margin</div><div className="mt-1 font-black"><Money value={dashboard.inventorySellingValue - dashboard.inventoryCostValue} /></div></div>
          <div className="admin-card p-3"><div className="text-xs text-slate-500">Paid revenue</div><div className="mt-1 font-black"><Money value={dashboard.paidRevenue} /></div></div>
        </div>
      </Card>
      <div className="admin-grid-2">
        <Card title="Order Totals">
          <Table headers={["Status", "Orders", "Total"]} minWidth={460}>
            {reports.orderTotals.map((row) => <tr key={row.status}><td>{row.status}</td><td>{row._count}</td><td><Money value={row._sum.total_kes ?? 0} /></td></tr>)}
          </Table>
        </Card>
        <Card title="Quote Pipeline">
          <Table headers={["Status", "Quotes", "Quoted Value"]} minWidth={460}>
            {reports.quotePipeline.map((row) => <tr key={row.status}><td>{row.status}</td><td>{row._count}</td><td><Money value={row._sum.quoted_value_kes ?? 0} /></td></tr>)}
          </Table>
        </Card>
      </div>
    </>
  );
}
