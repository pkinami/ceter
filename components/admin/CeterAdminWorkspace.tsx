import Link from "next/link";
import { ArrowUpRight, Boxes, CheckCircle2, CreditCard, Database, Package, Receipt, ShoppingBasket, ShoppingCart, TrendingUp, Users, WalletCards, Warehouse } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdminModule } from "@/lib/admin/modules";
import type { DashboardRank, DashboardSeries, WorkspaceData } from "@/lib/admin/workspace";
import { requirePermission } from "@/lib/admin/auth";
import { getWorkspaceData } from "@/lib/admin/workspace";
import { AdminDataTable } from "@/components/admin/AdminDataTable";
import { CeterCombobox } from "@/components/admin/CeterCombobox";
import { MultiLineChart, SalesAreaChart } from "@/components/admin/DashboardCharts";

type Props = {
  module: AdminModule;
  searchParams?: Record<string, string | string[] | undefined>;
};

export async function CeterAdminWorkspace({ module, searchParams }: Props) {
  await requirePermission(module === "dashboard" ? "dashboard.view" : "dashboard.view");
  const data = await getWorkspaceData(module, searchParams);
  if (module === "dashboard" && data.dashboard) return <DashboardView data={data} />;
  return <WorkspaceView data={data} />;
}

function DashboardView({ data }: { data: WorkspaceData }) {
  const dashboard = data.dashboard!;
  return (
    <div className="ceter-admin-page ceter-dashboard-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Home&nbsp;&nbsp;&gt;&nbsp;&nbsp;Dashboard</p>
          <h1>Dashboard Analytics</h1>
        </div>
      </div>

      <form className="ceter-dashboard-filter" action="/admin">
        <strong>Date Range</strong>
        <CeterCombobox label="Period" name="period" defaultValue="current-month" options={[{ value: "current-month", label: "Current Month" }]} />
        <label>
          <span>Start Date</span>
          <input name="start" type="date" defaultValue={dashboard.startDate} />
        </label>
        <label>
          <span>End Date</span>
          <input name="end" type="date" defaultValue={dashboard.endDate} />
        </label>
        <div className="ceter-dashboard-selected">
          Selected Period: {dashboard.periodLabel}
        </div>
      </form>

      <section className="ceter-dashboard-kpis" aria-label="Dashboard metrics">
        {dashboard.metrics.filter((metric) => ["Sales", "Expenses", "Purchases", "Profit/Loss"].includes(metric.label)).map((metric) => (
          <a key={metric.label} className={`ceter-dashboard-card ${metric.tone}`} href={metric.href}>
            <DashboardMetricIcon tone={metric.tone} label={metric.label} />
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small className={metric.deltaTone}>{metric.note ?? `${metric.delta} from last month`}</small>
            {metric.progress ? <div className="ceter-dashboard-progress"><i style={{ width: metric.progress }} /></div> : null}
          </a>
        ))}
      </section>

      <section className="ceter-dashboard-main">
        <article className="ceter-admin-panel ceter-dashboard-chart-panel">
          <div className="ceter-dashboard-panel-title">
            <div>
              <h2>Sales Performance</h2>
              <span><b>Daily Sales</b> {dashboard.salesTrend.length} days in selected range</span>
            </div>
          </div>
          <SalesAreaChart points={dashboard.salesTrend} />
        </article>
      </section>

      <section className="ceter-dashboard-receivables-grid">
        <article className="ceter-admin-panel ceter-dashboard-aging-panel debtors">
          <h2>Debtors (Receivables)</h2>
          <p>What customers owe your business</p>
          <div className="ceter-dashboard-aging-total">
            <span>Total Outstanding</span>
            <strong>{dashboard.debtorsTotal}</strong>
            <small>{dashboard.customers.debtors} customers with balances</small>
          </div>
          <div className="ceter-dashboard-aging">
            {dashboard.aging.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
          </div>
        </article>
        <article className="ceter-admin-panel ceter-dashboard-aging-panel creditors">
          <h2>Creditors (Payables)</h2>
          <p>{dashboard.suppliers.outstandingInvoices === "0" ? "Nothing owed to suppliers right now" : "What Ceter owes suppliers"}</p>
          {dashboard.suppliers.outstandingInvoices !== "0" ? (
            <div className="ceter-dashboard-aging-total">
              <span>Total Outstanding</span>
              <strong>{dashboard.finance.payables}</strong>
              <small>{dashboard.suppliers.outstandingInvoices} outstanding supplier invoices</small>
            </div>
          ) : null}
        </article>
      </section>

      <section className="ceter-dashboard-analytics-stack" aria-label="Business analytics">
        <AnalyticsPanel title="Financial Performance Overview" subtitle="Revenue, Expenses & Profit Comparison" series={dashboard.financialSeries} insights={dashboard.finance.insights} stats={[
          ["Revenue", dashboard.finance.revenue],
          ["Expenses", dashboard.finance.expenses],
          ["Gross Profit", dashboard.finance.grossProfit],
          ["Net Profit", dashboard.finance.netProfit],
          ["Receivables", dashboard.finance.receivables],
          ["Payables", dashboard.finance.payables],
          ["Collections", dashboard.finance.collections],
          ["Cash Indicator", dashboard.finance.cashIndicator]
        ]} />
        <AnalyticsPanel title="Outstanding vs Collections" subtitle="Open invoices against receipts" series={dashboard.collectionSeries} insights={[
          `${dashboard.finance.receivables} remains outstanding from customer invoices.`,
          `${dashboard.finance.collections} has been collected in the selected period.`
        ]} stats={[
          ["Outstanding", dashboard.finance.receivables],
          ["Collections", dashboard.finance.collections],
          ["Collection Rate", collectionRate(dashboard.finance.collections, dashboard.finance.receivables)]
        ]} />
      </section>

      <TopSoldItemsPanel items={dashboard.sales.productPerformance} />

      <section className="ceter-dashboard-business-grid" aria-label="Operational performance">
        <RankPanel title="Category Performance" subtitle="Revenue grouped by catalogue category" items={dashboard.sales.categoryPerformance} />
        <RankPanel title="Customer Balances" subtitle={`${dashboard.customers.debtors} customers with balances`} items={dashboard.customers.topBalances} />
        <RankPanel title="Supplier Balances" subtitle={`${dashboard.suppliers.outstandingInvoices} outstanding supplier invoices`} items={dashboard.suppliers.topBalances} />
      </section>

      <section className="ceter-dashboard-ops-grid" aria-label="Inventory and accounts">
        <article className="ceter-admin-panel ceter-dashboard-scorecard">
          <div className="ceter-dashboard-panel-title"><div><h2>Inventory Analytics</h2><span>Stock value, levels and movement</span></div></div>
          <dl>
            <div><dt>Total Products</dt><dd>{dashboard.inventory.totalProducts}</dd></div>
            <div><dt>Stock Value</dt><dd>{dashboard.inventory.stockValue}</dd></div>
            <div><dt>Stock Cost</dt><dd>{dashboard.inventory.stockCost}</dd></div>
            <div><dt>Low Stock</dt><dd>{dashboard.inventory.lowStock}</dd></div>
            <div><dt>Units On Hand</dt><dd>{dashboard.inventory.units}</dd></div>
          </dl>
          <MiniRank title="Stock Movement" items={dashboard.inventory.movements} />
        </article>
        <article className="ceter-admin-panel ceter-dashboard-scorecard">
          <div className="ceter-dashboard-panel-title"><div><h2>Customer Analytics</h2><span>Accounts, new customers and purchase history</span></div></div>
          <dl>
            <div><dt>Total Customers</dt><dd>{dashboard.customers.total}</dd></div>
            <div><dt>New Customers</dt><dd>{dashboard.customers.newCustomers}</dd></div>
            <div><dt>Debtors</dt><dd>{dashboard.customers.debtors}</dd></div>
          </dl>
          <MiniRank title="Purchase History" items={dashboard.customers.purchaseHistory} />
        </article>
        <article className="ceter-admin-panel ceter-dashboard-scorecard">
          <div className="ceter-dashboard-panel-title"><div><h2>Supplier Analytics</h2><span>Purchases and outstanding invoices</span></div></div>
          <dl>
            <div><dt>Total Suppliers</dt><dd>{dashboard.suppliers.total}</dd></div>
            <div><dt>Supplier Balances</dt><dd>{dashboard.suppliers.balances}</dd></div>
            <div><dt>Purchases</dt><dd>{dashboard.suppliers.purchases}</dd></div>
            <div><dt>Outstanding Invoices</dt><dd>{dashboard.suppliers.outstandingInvoices}</dd></div>
          </dl>
          <MiniRank title="Salesperson Performance" items={dashboard.sales.salespersonPerformance} />
        </article>
      </section>

      <section className="ceter-dashboard-bottom" aria-label="Operational summaries">
        {dashboard.summaries.map((item) => (
          <a key={item.label} className={`ceter-dashboard-summary ${item.tone}`} href={item.href}>
            <DashboardMetricIcon tone={item.tone} label={item.label} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small className={item.deltaTone}>{item.delta} from last month</small>
          </a>
        ))}
      </section>

      <section className="ceter-dashboard-records">
        <SimpleTable title="Recent Invoices" columns={["Invoice", "Customer", "Status", "Balance", "Date"]} rows={dashboard.recent.invoices} empty="No invoices available." />
        <SimpleTable title="Recent Expenses" columns={["Expense", "Category", "Supplier", "Amount", "Date"]} rows={dashboard.recent.expenses} empty="No expenses available." />
      </section>

    </div>
  );
}

function AnalyticsPanel({ title, subtitle, series, stats, insights }: { title: string; subtitle: string; series: DashboardSeries[]; stats: Array<[string, string]>; insights?: string[] }) {
  return (
    <article className="ceter-admin-panel ceter-dashboard-chart-panel">
      <div className="ceter-dashboard-panel-title"><div><h2>{title}</h2><span>{subtitle}</span></div></div>
      <MultiLineChart series={series} />
      <dl className="ceter-dashboard-inline-stats">
        {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      {insights?.length ? <div className="ceter-dashboard-insights"><strong>Key Insights</strong>{insights.map((item) => <p key={item}>{item}</p>)}</div> : null}
    </article>
  );
}

function RankPanel({ title, subtitle, items }: { title: string; subtitle: string; items: DashboardRank[] }) {
  return (
    <article className="ceter-admin-panel ceter-dashboard-rank-panel">
      <div className="ceter-dashboard-panel-title"><div><h2>{title}</h2><span>{subtitle}</span></div></div>
      <MiniRank items={items} />
    </article>
  );
}

function MiniRank({ title, items }: { title?: string; items: DashboardRank[] }) {
  return (
    <div className="ceter-dashboard-rank-list">
      {title ? <strong>{title}</strong> : null}
      {items.length ? items.map((item, index) => (
        <div key={`${item.label}-${index}`} className={`ceter-dashboard-rank-item ${item.tone ?? "gray"}`}>
          <span>{index + 1}</span>
          <div><b>{item.label}</b><small>{item.detail}</small></div>
          <strong>{item.value}</strong>
        </div>
      )) : <p>No records in the selected period.</p>}
    </div>
  );
}

function TopSoldItemsPanel({ items }: { items: DashboardRank[] }) {
  const totals = items.reduce((sum, item) => ({
    revenue: sum.revenue + (item.revenue ?? currencyNumber(item.value)),
    qty: sum.qty + (item.quantity ?? quantityNumber(item.detail)),
    profit: sum.profit + (item.profit ?? 0)
  }), { revenue: 0, qty: 0, profit: 0 });
  return (
    <article className="ceter-admin-panel ceter-dashboard-top-sold">
      <div className="ceter-dashboard-panel-title"><div><h2>Top Sold Items</h2><span>Product performance by revenue</span></div></div>
      <dl className="ceter-dashboard-top-sold-summary">
        <div><dt>Total Revenue</dt><dd>{formatLocalKes(totals.revenue)}</dd></div>
        <div><dt>Units Sold</dt><dd>{formatLocalNumber(totals.qty)}</dd></div>
        <div><dt>Total Profit</dt><dd>{formatLocalKes(totals.profit)}</dd></div>
      </dl>
      <HorizontalBarChart items={items} />
      <div className="ceter-dashboard-breakdown">
        <table>
          <thead>
            <tr><th>Rank</th><th>Item</th><th>Quantity</th><th>Revenue</th><th>Average Price</th><th>Profit</th><th>Margin</th></tr>
          </thead>
          <tbody>
            {items.length ? items.map((item, index) => {
              const qty = item.quantity ?? quantityNumber(item.detail);
              const revenue = item.revenue ?? currencyNumber(item.value);
              const profit = item.profit ?? 0;
              return (
                <tr key={`${item.label}-${index}`}>
                  <td>{index + 1}</td>
                  <td>{item.label}</td>
                  <td>{formatLocalNumber(qty)}</td>
                  <td>{formatLocalKes(revenue)}</td>
                  <td>{formatLocalKes(qty > 0 ? revenue / qty : 0)}</td>
                  <td>{formatLocalKes(profit)}</td>
                  <td>{item.margin ?? "0.0%"}</td>
                </tr>
              );
            }) : <tr><td colSpan={7}><EmptyState message="No sold items in the selected period." /></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="ceter-dashboard-insights">
        <strong>Product Insights</strong>
        {items.length ? (
          <>
            <p>{items[0].label} leads selected-period item revenue at {items[0].value}.</p>
            <p>{formatLocalNumber(totals.qty)} units were sold across the ranked items.</p>
          </>
        ) : <p>No item movement is available for this date range.</p>}
      </div>
    </article>
  );
}

function HorizontalBarChart({ items }: { items: DashboardRank[] }) {
  const max = Math.max(...items.map((item) => item.revenue ?? currencyNumber(item.value)), 1);
  return (
    <div className="ceter-dashboard-bar-chart" role="img" aria-label="Top sold items horizontal bar chart">
      {items.length ? items.map((item, index) => {
        const revenue = item.revenue ?? currencyNumber(item.value);
        const qty = item.quantity ?? quantityNumber(item.detail);
        const width = `${Math.max(6, (revenue / max) * 100)}%`;
        return (
          <div className="ceter-dashboard-bar-row" key={`${item.label}-${index}`} title={`${item.label} - ${formatLocalKes(revenue)} revenue, ${formatLocalNumber(qty)} units, ${item.margin ?? "0.0%"} margin`}>
            <span>{item.label}</span>
            <div><i style={{ width }} /></div>
            <strong>{formatLocalKes(revenue)}</strong>
          </div>
        );
      }) : <EmptyState message="No sold items in the selected period." />}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="ceter-dashboard-empty"><span aria-hidden="true">○</span><p>{message}</p></div>;
}

function SimpleTable({ title, columns, rows, empty }: { title: string; columns: string[]; rows: string[][]; empty: string }) {
  return (
    <article className="ceter-admin-panel">
      <div className="ceter-admin-panel-header"><div><span>Latest records</span><h2>{title}</h2></div></div>
      <div className="ceter-admin-table-wrap">
        <table className="compact">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}>{empty}</td></tr>}</tbody>
        </table>
      </div>
    </article>
  );
}

function collectionRate(collections: string, receivables: string) {
  const paid = Number(collections.replace(/[^\d.-]/g, ""));
  const open = Number(receivables.replace(/[^\d.-]/g, ""));
  const total = paid + open;
  return total > 0 ? `${((paid / total) * 100).toFixed(1)}%` : "0.0%";
}

function currencyNumber(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function quantityNumber(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function formatLocalKes(value: number) {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(value).replace("KES", "KSh");
}

function formatLocalNumber(value: number) {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

function DashboardMetricIcon({ tone, label }: { tone: string; label: string }) {
  const Icon = metricIconFor(tone, label);
  return <div className="ceter-dashboard-card-icon"><Icon size={18} strokeWidth={2.2} /></div>;
}

function metricIconFor(tone: string, label: string): LucideIcon {
  if (/customer/i.test(label)) return Users;
  if (/product/i.test(label)) return Package;
  if (/inventory|stock/i.test(label)) return Warehouse;
  if (/collection|cash|payment/i.test(label)) return WalletCards;
  if (/expense/i.test(label)) return Receipt;
  if (/purchase|supplier/i.test(label)) return ShoppingBasket;
  if (/profit|loss/i.test(label)) return TrendingUp;
  if (/revenue|sale/i.test(label)) return ShoppingCart;
  const icons: Record<string, LucideIcon> = {
    sales: ShoppingCart,
    expenses: Receipt,
    purchases: ShoppingBasket,
    profit: TrendingUp,
    customers: Users,
    products: Boxes,
    pending: CreditCard,
    cash: WalletCards
  };
  return icons[tone] ?? CreditCard;
}

function WorkspaceView({ data }: { data: WorkspaceData }) {
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>{data.crumb}</p>
          <h1>{data.title}</h1>
          <span>{data.intro}</span>
        </div>
        <div className="ceter-admin-safe-mode">
          <CheckCircle2 size={17} />
          Live Ceter data
        </div>
      </div>

      <section className="ceter-admin-kpis" aria-label={`${data.title} metrics`}>
        {data.metrics.map((metric) => (
          <article key={metric.label} className={`ceter-admin-kpi ${metric.tone ?? "gray"}`}>
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
            {metric.note ? <p>{metric.note}</p> : null}
          </article>
        ))}
      </section>

      <section className="ceter-admin-grid">
        <div className="ceter-admin-stack">
          {data.tables.map((table) => (
            <article key={table.title} className="ceter-admin-panel">
              <div className="ceter-admin-panel-header">
                <div>
                  <span>Detailed breakdown</span>
                  <h2>{table.title}</h2>
                </div>
              </div>
              <AdminDataTable table={table} />
            </article>
          ))}
        </div>
        <aside className="ceter-admin-stack">
          {data.panels.map((panel) => (
            <article key={panel.title} className="ceter-admin-side-panel">
              <div className="ceter-admin-side-title">
                <Database size={17} />
                <h2>{panel.title}</h2>
              </div>
              <p>{panel.body}</p>
              <dl>
                {panel.items.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
          <Link href="/" className="ceter-admin-storefront-card">
            <span>Open storefront</span>
            <ArrowUpRight size={17} />
          </Link>
        </aside>
      </section>
    </div>
  );
}
