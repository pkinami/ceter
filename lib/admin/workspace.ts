import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatKes, formatNumber } from "@/lib/utils";
import { adminModules, type AdminModule } from "@/lib/admin/modules";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type WorkspaceMetric = { label: string; value: string; note?: string; tone?: "blue" | "green" | "amber" | "red" | "gray" };
export type WorkspaceTable = { title: string; columns: string[]; rows: string[][]; empty: string };
export type WorkspaceAction = { href: string; label: string; detail: string };
export type WorkspacePanel = { title: string; body: string; items: Array<[string, string]> };
export type DashboardMetric = { label: string; value: string; delta: string; deltaTone: "up" | "down"; tone: "sales" | "expenses" | "purchases" | "profit" | "customers" | "products" | "pending" | "cash"; href: string; icon: string; progress?: string; note?: string };
export type DashboardSeries = { name: string; points: Array<{ label: string; value: number; key?: string }> };
export type DashboardRank = {
  label: string;
  value: string;
  detail: string;
  tone?: "green" | "amber" | "red" | "blue" | "gray";
  quantity?: number;
  revenue?: number;
  averagePrice?: number;
  profit?: number;
  margin?: string;
};
export type DashboardAging = { label: string; value: string; amount: number };
export type DashboardData = {
  startDate: string;
  endDate: string;
  periodLabel: string;
  chartMonth: string;
  metrics: DashboardMetric[];
  summaries: DashboardMetric[];
  salesTrend: Array<{ label: string; value: number }>;
  financialSeries: DashboardSeries[];
  collectionSeries: DashboardSeries[];
  debtorsTotal: string;
  debtorsPercent: number;
  aging: DashboardAging[];
  inventory: {
    totalProducts: string;
    stockValue: string;
    stockCost: string;
    lowStock: string;
    units: string;
    fastMoving: DashboardRank[];
    slowMoving: DashboardRank[];
    movements: DashboardRank[];
  };
  sales: {
    today: string;
    month: string;
    dailyAverage: string;
    productPerformance: DashboardRank[];
    categoryPerformance: DashboardRank[];
    salespersonPerformance: DashboardRank[];
  };
  finance: {
    revenue: string;
    expenses: string;
    costOfGoods: string;
    grossProfit: string;
    netProfit: string;
    receivables: string;
    payables: string;
    collections: string;
    cashIndicator: string;
    insights: string[];
  };
  customers: {
    total: string;
    newCustomers: string;
    debtors: string;
    topBalances: DashboardRank[];
    purchaseHistory: DashboardRank[];
  };
  suppliers: {
    total: string;
    balances: string;
    purchases: string;
    outstandingInvoices: string;
    topBalances: DashboardRank[];
  };
  recent: {
    invoices: string[][];
    expenses: string[][];
  };
};
export type WorkspaceData = {
  module: AdminModule;
  title: string;
  crumb: string;
  intro: string;
  metrics: WorkspaceMetric[];
  tables: WorkspaceTable[];
  actions: WorkspaceAction[];
  panels: WorkspacePanel[];
  dashboard?: DashboardData;
};

export async function getWorkspaceData(module: AdminModule, searchParams?: Record<string, string | string[] | undefined>): Promise<WorkspaceData> {
  noStore();
  const [
    products,
    publishedProducts,
    lowStockProducts,
    orders,
    paidPayments,
    customers,
    quoteRequests,
    businessCustomers,
    invoices,
    payments,
    suppliers,
    purchaseOrders,
    expenses,
    accounts,
    journals,
    users,
    banners,
    sections,
    documents,
    etims
  ] = await Promise.all([
    prisma.product.count({ where: { archived_at: null } }),
    prisma.product.count({ where: { archived_at: null, is_published: true } }),
    prisma.product.count({ where: { archived_at: null, reorder_level: { gt: 0 }, stock_quantity: { lte: prisma.product.fields.reorder_level } } }),
    prisma.order.findMany({ orderBy: { created_at: "desc" }, take: 8, include: { profile: true, order_items: true, payments: true } }),
    prisma.paymentTransaction.aggregate({ where: { status: "paid" }, _sum: { amount_kes: true }, _count: true }),
    prisma.profile.count({ where: { role: "customer" } }),
    prisma.quoteRequest.findMany({ orderBy: { created_at: "desc" }, take: 8 }),
    prisma.customer.findMany({ orderBy: { updated_at: "desc" }, take: 8, include: { invoices: true, payments: true, orders: true } }),
    prisma.invoice.findMany({ orderBy: { created_at: "desc" }, take: 8, include: { customer: true } }),
    prisma.payment.findMany({ orderBy: { paid_at: "desc" }, take: 8, include: { customer: true, invoice: true, receipt: true } }),
    prisma.supplier.findMany({ orderBy: { company_name: "asc" }, take: 8 }),
    prisma.purchaseOrder.findMany({ orderBy: { created_at: "desc" }, take: 8, include: { supplier: true, items: true } }),
    prisma.expense.findMany({ orderBy: { expense_date: "desc" }, take: 8, include: { category: true, customer: true } }),
    prisma.account.findMany({ orderBy: { code: "asc" }, take: 12 }),
    prisma.journalEntry.findMany({ orderBy: { entry_date: "desc" }, take: 8, include: { lines: true } }),
    prisma.profile.findMany({ orderBy: { created_at: "desc" }, take: 8 }),
    prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { sort_order: "asc" }], take: 8, include: { category: true } }),
    prisma.homepageSection.findMany({ orderBy: [{ sort_order: "asc" }, { title: "asc" }], take: 8, include: { category: true } }),
    prisma.document.findMany({ orderBy: { created_at: "desc" }, take: 8, include: { customer: true, company_document: true } }),
    prisma.etimsRecord.findMany({ orderBy: { created_at: "desc" }, take: 8, include: { invoice: { include: { customer: true } } } })
  ]);

  const stock = await prisma.$queryRaw<Array<{ units: bigint | number; selling_value: bigint | number; cost_value: bigint | number }>>`
    select coalesce(sum(stock_quantity), 0) as units,
      coalesce(sum(stock_quantity * price_kes), 0) as selling_value,
      coalesce(sum(stock_quantity * coalesce(cost_price_kes, 0)), 0) as cost_value
    from public.products where archived_at is null
  `;
  const totals = stock[0] ?? { units: 0, selling_value: 0, cost_value: 0 };
  const orderRevenue = orders.reduce((sum, order) => sum + order.total_kes, 0);
  const invoiceBalance = invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0);
  const purchaseOpen = purchaseOrders.filter((order) => !["completed", "cancelled"].includes(order.status)).length;

  const commonMetrics: WorkspaceMetric[] = [
    { label: "Sales", value: formatKes(orderRevenue), note: `${orders.length} latest storefront orders`, tone: "blue" },
    { label: "Expenses", value: formatKes(expenses.reduce((sum, item) => sum + item.amount_kes, 0)), note: "Latest recorded expense batch", tone: "red" },
    { label: "Purchases", value: formatKes(purchaseOrders.reduce((sum, item) => sum + item.total_kes, 0)), note: `${purchaseOpen} open purchase orders`, tone: "amber" },
    { label: "Profit/Loss", value: formatKes(orderRevenue - toNumber(totals.cost_value)), note: `COGS basis ${formatKes(toNumber(totals.cost_value))}`, tone: "green" }
  ];

  const dashboard = module === "dashboard" ? await getDashboardAnalytics(searchParams) : undefined;

  const dashboardTables: WorkspaceTable[] = [
    {
      title: "Recent Storefront Orders",
      columns: ["Order", "Customer", "Status", "Payment", "Total"],
      rows: orders.map((order) => [order.order_number, order.profile?.full_name ?? order.delivery_name ?? "Guest checkout", label(order.status), order.payments[0]?.status ? label(order.payments[0].status) : "No payment", formatKes(order.total_kes)]),
      empty: "No storefront orders have been created yet."
    },
    {
      title: "Outstanding Business Invoices",
      columns: ["Invoice", "Customer", "Status", "Balance", "Created"],
      rows: invoices.map((invoice) => [invoice.invoice_number, invoice.customer.name, label(invoice.status), formatKes(invoice.balance_kes), date(invoice.created_at)]),
      empty: "No business invoices are available."
    }
  ];

  const moduleConfig = moduleMeta(module);
  return {
    module,
    title: moduleConfig.title,
    crumb: moduleConfig.crumb,
    intro: moduleConfig.intro,
    metrics: metricsFor(module, commonMetrics, {
      products,
      publishedProducts,
      lowStockProducts,
      stockUnits: toNumber(totals.units),
      stockValue: toNumber(totals.selling_value),
      customers,
      businessCustomers: businessCustomers.length,
      paidRevenue: paidPayments._sum.amount_kes ?? 0,
      paidCount: paidPayments._count,
      invoiceBalance,
      purchaseOpen,
      users: users.length,
      documents: documents.length,
      etims: etims.length,
      banners: banners.length
    }),
    tables: tablesFor(module, dashboardTables, {
      orders,
      quotes: quoteRequests,
      customers: businessCustomers,
      invoices,
      payments,
      suppliers,
      purchaseOrders,
      expenses,
      accounts,
      journals,
      users,
      banners,
      sections,
      documents,
      etims
    }),
    actions: actionsFor(module),
    panels: panelsFor(module, {
      products,
      publishedProducts,
      lowStockProducts,
      customers,
      paidRevenue: paidPayments._sum.amount_kes ?? 0,
      stockValue: toNumber(totals.selling_value)
    }),
    dashboard
  };
}

async function getDashboardAnalytics(searchParams?: Record<string, string | string[] | undefined>): Promise<DashboardData> {
  const now = new Date();
  const defaultEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const defaultStart = new Date(defaultEnd.getFullYear(), defaultEnd.getMonth(), 1);
  const start = parseDate(singleParam(searchParams?.start)) ?? defaultStart;
  const endDate = parseDate(singleParam(searchParams?.end)) ?? defaultEnd;
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const previousStart = new Date(start);
  previousStart.setMonth(previousStart.getMonth() - 1);
  const previousEnd = new Date(end);
  previousEnd.setMonth(previousEnd.getMonth() - 1);

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [orders, previousOrders, invoices, previousInvoices, expenses, previousExpenses, purchases, customers, previousCustomers, products, previousProducts, payments, previousPayments, supplierPayments, previousSupplierPayments, stock, supplierInvoices, topInvoiceItems, topOrderItems, categories, stockMovements, recentInvoices, recentExpenses, allInvoices] = await Promise.all([
    prisma.order.findMany({
      where: { created_at: { gte: start, lte: end }, status: { not: "cancelled" } },
      select: {
        total_kes: true,
        created_at: true,
        order_items: {
          select: {
            quantity: true,
            price_at_purchase_kes: true,
            service_label: true,
            product: { select: { name: true, category: { select: { name: true } } } }
          }
        }
      }
    }),
    prisma.order.findMany({ where: { created_at: { gte: previousStart, lte: previousEnd } }, select: { total_kes: true } }),
    prisma.invoice.findMany({
      where: { created_at: { gte: start, lte: end }, status: { not: "cancelled" } },
      select: {
        total_kes: true,
        subtotal_kes: true,
        vat_kes: true,
        balance_kes: true,
        paid_kes: true,
        created_at: true,
        customer: { select: { name: true } },
        items: {
          select: {
            description: true,
            quantity: true,
            line_total_kes: true,
            product: { select: { name: true, category: { select: { name: true } } } }
          }
        }
      }
    }),
    prisma.invoice.findMany({ where: { created_at: { gte: previousStart, lte: previousEnd }, status: { not: "cancelled" } }, select: { total_kes: true, balance_kes: true } }),
    prisma.expense.findMany({ where: { expense_date: { gte: start, lte: end } }, select: { amount_kes: true, expense_date: true, category: { select: { name: true } }, supplier: true, expense_number: true } }),
    prisma.expense.findMany({ where: { expense_date: { gte: previousStart, lte: previousEnd } }, select: { amount_kes: true } }),
    prisma.purchaseOrder.findMany({ where: { created_at: { gte: start, lte: end } }, select: { total_kes: true } }),
    prisma.customer.count({ where: { created_at: { lte: end } } }),
    prisma.customer.count({ where: { created_at: { lte: previousEnd } } }),
    prisma.product.count({ where: { archived_at: null, created_at: { lte: end } } }),
    prisma.product.count({ where: { archived_at: null, created_at: { lte: previousEnd } } }),
    prisma.payment.findMany({ where: { paid_at: { gte: start, lte: end } }, select: { amount_kes: true, paid_at: true, customer: { select: { name: true } } } }),
    prisma.payment.findMany({ where: { paid_at: { gte: previousStart, lte: previousEnd } }, select: { amount_kes: true } }),
    prisma.supplierPayment.findMany({ where: { paid_at: { gte: start, lte: end } }, select: { amount_kes: true } }),
    prisma.supplierPayment.findMany({ where: { paid_at: { gte: previousStart, lte: previousEnd } }, select: { amount_kes: true } }),
    prisma.$queryRaw<Array<{ units: bigint | number; selling_value: bigint | number; cost_value: bigint | number; low_stock: bigint | number }>>`
      select coalesce(sum(stock_quantity), 0) as units,
        coalesce(sum(stock_quantity * price_kes), 0) as selling_value,
        coalesce(sum(stock_quantity * coalesce(cost_price_kes, 0)), 0) as cost_value,
        count(*) filter (where reorder_level > 0 and stock_quantity <= reorder_level) as low_stock
      from public.products where archived_at is null
    `,
    prisma.supplierInvoice.findMany({ where: { status: { not: "cancelled" } }, select: { total_kes: true, balance_kes: true, supplier: { select: { company_name: true } } } }),
    prisma.invoiceItem.findMany({ where: { invoice: { created_at: { gte: start, lte: end }, status: { not: "cancelled" } } }, include: { product: { select: { name: true, cost_price_kes: true, category: { select: { name: true } } } } } }),
    prisma.orderItem.findMany({ where: { order: { created_at: { gte: start, lte: end }, status: { not: "cancelled" } } }, include: { product: { select: { name: true, cost_price_kes: true, category: { select: { name: true } } } } } }),
    prisma.category.findMany({ select: { id: true, name: true, products: { select: { id: true, stock_quantity: true, price_kes: true } } }, orderBy: { name: "asc" }, take: 12 }),
    prisma.stockMovement.findMany({ orderBy: { created_at: "desc" }, take: 12, include: { product: { select: { name: true } } } }),
    prisma.invoice.findMany({ where: { status: { not: "cancelled" } }, orderBy: { created_at: "desc" }, take: 5, include: { customer: true } }),
    prisma.expense.findMany({ orderBy: { expense_date: "desc" }, take: 5, include: { category: true } }),
    prisma.invoice.findMany({ where: { status: { not: "cancelled" } }, select: { total_kes: true, balance_kes: true, paid_kes: true, created_at: true, customer: { select: { name: true } } } })
  ]);

  const sales = sum(orders, "total_kes") + sum(invoices, "total_kes");
  const previousSales = sum(previousOrders, "total_kes") + sum(previousInvoices, "total_kes");
  const expenseTotal = sum(expenses, "amount_kes");
  const previousExpenseTotal = sum(previousExpenses, "amount_kes");
  const purchaseTotal = sum(purchases, "total_kes");
  const inventoryCost = toNumber(stock[0]?.cost_value);
  const inventoryValue = toNumber(stock[0]?.selling_value);
  const costOfGoods = soldCost(topInvoiceItems, topOrderItems);
  const grossProfit = sales - costOfGoods;
  const profit = sales - expenseTotal - costOfGoods;
  const previousProfit = previousSales - previousExpenseTotal - costOfGoods;
  const pendingPayments = allInvoices.reduce((total, invoice) => total + invoice.balance_kes, 0);
  const previousPendingPayments = sum(previousInvoices, "balance_kes");
  const payableBalance = supplierInvoices.reduce((total, invoice) => total + invoice.balance_kes, 0);
  const collections = sum(payments, "amount_kes");
  const cashBalance = sum(payments, "amount_kes") - expenseTotal - sum(supplierPayments, "amount_kes");
  const previousCashBalance = sum(previousPayments, "amount_kes") - previousExpenseTotal - sum(previousSupplierPayments, "amount_kes");
  const salesTrend = buildSalesTrend(start, end, [...orders.map((item) => ({ value: item.total_kes, date: item.created_at })), ...invoices.map((item) => ({ value: item.total_kes, date: item.created_at }))]);
  const expenseTrend = buildSalesTrend(start, end, expenses.map((item) => ({ value: item.amount_kes, date: item.expense_date })));
  const profitTrend = salesTrend.map((point, index) => ({ label: point.label, value: point.value - (expenseTrend[index]?.value ?? 0) }));
  const collectionTrend = buildSalesTrend(start, end, payments.map((item) => ({ value: item.amount_kes, date: item.paid_at })));
  const outstandingTrend = buildSalesTrend(start, end, invoices.map((item) => ({ value: item.balance_kes, date: item.created_at })));
  const todaySales = [...orders, ...invoices].filter((item) => item.created_at >= todayStart && item.created_at <= todayEnd).reduce((total, item) => total + item.total_kes, 0);
  const monthSales = [...orders, ...invoices].filter((item) => item.created_at >= monthStart).reduce((total, item) => total + item.total_kes, 0);
  const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const productPerformance = rankProducts(topInvoiceItems, topOrderItems);
  const categoryPerformance = rankCategories(topInvoiceItems, topOrderItems, categories);
  const customerBalances = rankByMap(allInvoices.reduce((map, invoice) => addToMap(map, invoice.customer.name, invoice.balance_kes), new Map<string, number>()), "Outstanding");
  const customerPurchases = rankByMap(allInvoices.reduce((map, invoice) => addToMap(map, invoice.customer.name, invoice.total_kes), new Map<string, number>()), "Purchases");
  const supplierBalances = rankByMap(supplierInvoices.reduce((map, invoice) => addToMap(map, invoice.supplier.company_name, invoice.balance_kes), new Map<string, number>()), "Outstanding");
  const ageNow = end.getTime();
  const aging = [
    agingBucket("30 Days", allInvoices, ageNow, 0, 30),
    agingBucket("60 Days", allInvoices, ageNow, 31, 60),
    agingBucket("90 Days", allInvoices, ageNow, 61, 90),
    agingBucket("Over 90 Days", allInvoices, ageNow, 91, 9999)
  ];

  const metrics: DashboardMetric[] = [
    { ...card("Sales", sales, previousSales, "sales", "/admin/business?tab=sales", "KES"), note: undefined },
    { ...card("Expenses", expenseTotal, previousExpenseTotal, "expenses", "/admin/business?tab=expenses", "KES"), note: "Selected period costs" },
    { ...card("Purchases", purchaseTotal, 0, "purchases", "/admin/business?tab=procurement", "KES"), note: undefined },
    { ...card("Profit/Loss", profit, previousProfit, "profit", "/admin/reports?view=profits", "KES"), progress: `${Math.max(0, Math.min(100, Math.round((profit / Math.max(sales, 1)) * 100)))}%`, note: `Cost of Goods: ${formatKes(costOfGoods)}` },
    { ...card("Today's Sales", todaySales, 0, "sales", "/admin/business?tab=sales", "KES"), note: "Orders and invoices dated today" },
    { ...card("Monthly Sales", monthSales, previousSales, "sales", "/admin/orders", "KES"), note: "Current calendar month" },
    { ...card("Revenue", sales, previousSales, "cash", "/admin/reports?view=revenue", "KES"), note: "Selected period revenue" },
    { ...card("Gross Profit", grossProfit, previousSales - costOfGoods, "profit", "/admin/reports?view=profits", "KES"), progress: `${Math.max(5, Math.min(100, Math.round((grossProfit / Math.max(sales, 1)) * 100)))}%`, note: "Revenue less selected-period COGS" },
    { ...card("Net Profit", profit, previousProfit, "profit", "/admin/reports?view=profits", "KES"), note: "Revenue less expenses and COGS" },
    { ...card("Outstanding Customers", pendingPayments, previousPendingPayments, "pending", "/admin/business?tab=customers", "KES"), note: "Open customer receivables" },
    { ...card("Supplier Balances", payableBalance, 0, "purchases", "/admin/business?tab=pay-purchase", "KES"), note: "Open supplier invoices" },
    { ...card("Stock Value", inventoryValue, inventoryValue, "products", "/admin/inventory", "KES"), note: "Current catalogue stock value" }
  ];
  const summaries: DashboardMetric[] = [
    countCard("Total Customers", customers, previousCustomers, "customers", "/admin/customers"),
    countCard("Total Products", products, previousProducts, "products", "/admin/products"),
    card("Collections", collections, sum(previousPayments, "amount_kes"), "cash", "/admin/business?tab=payments", "KES"),
    card("Cash Balance", cashBalance, previousCashBalance, "cash", "/admin/payments", "KES")
  ];

  return {
    startDate: inputDate(start),
    endDate: inputDate(endDate),
    periodLabel: `${humanDate(start)} - ${humanDate(endDate)}`,
    chartMonth: new Intl.DateTimeFormat("en-KE", { month: "long", year: "numeric" }).format(endDate),
    metrics,
    summaries,
    salesTrend,
    financialSeries: [
      { name: "Revenue", points: salesTrend },
      { name: "Expenses", points: expenseTrend },
      { name: "Net Profit", points: profitTrend }
    ],
    collectionSeries: [
      { name: "New Outstanding", points: outstandingTrend },
      { name: "Collections", points: collectionTrend }
    ],
    debtorsTotal: formatKes(pendingPayments),
    debtorsPercent: pendingPayments > 0 ? Math.min(100, Math.max(12, Math.round((pendingPayments / Math.max(sales, pendingPayments)) * 100))) : 0,
    aging,
    inventory: {
      totalProducts: formatNumber(products),
      stockValue: formatKes(inventoryValue),
      stockCost: formatKes(inventoryCost),
      lowStock: formatNumber(toNumber(stock[0]?.low_stock)),
      units: formatNumber(toNumber(stock[0]?.units)),
      fastMoving: productPerformance,
      slowMoving: slowMovingProducts(productPerformance, products),
      movements: stockMovements.slice(0, 6).map((movement) => ({ label: movement.product.name, value: `${movement.delta > 0 ? "+" : ""}${movement.delta}`, detail: `${label(movement.reason)} - ${date(movement.created_at)}`, tone: movement.delta >= 0 ? "green" : "amber" }))
    },
    sales: {
      today: formatKes(todaySales),
      month: formatKes(monthSales),
      dailyAverage: formatKes(Math.round(sales / dayCount)),
      productPerformance,
      categoryPerformance,
      salespersonPerformance: [{ label: "Ceter Admin", value: formatKes(sales), detail: "All system-recorded sales", tone: "blue" }]
    },
    finance: {
      revenue: formatKes(sales),
      expenses: formatKes(expenseTotal),
      costOfGoods: formatKes(costOfGoods),
      grossProfit: formatKes(grossProfit),
      netProfit: formatKes(profit),
      receivables: formatKes(pendingPayments),
      payables: formatKes(payableBalance),
      collections: formatKes(collections),
      cashIndicator: formatKes(cashBalance),
      insights: financeInsights(sales, expenseTotal, profit, pendingPayments, collections)
    },
    customers: {
      total: formatNumber(customers),
      newCustomers: formatNumber(Math.max(0, customers - previousCustomers)),
      debtors: formatNumber(customerBalances.filter((item) => item.value !== formatKes(0)).length),
      topBalances: customerBalances,
      purchaseHistory: customerPurchases
    },
    suppliers: {
      total: formatNumber(await prisma.supplier.count()),
      balances: formatKes(payableBalance),
      purchases: formatKes(purchaseTotal),
      outstandingInvoices: formatNumber(supplierInvoices.filter((invoice) => invoice.balance_kes > 0).length),
      topBalances: supplierBalances
    },
    recent: {
      invoices: recentInvoices.map((invoice) => [invoice.invoice_number, invoice.customer.name, label(invoice.status), formatKes(invoice.balance_kes), date(invoice.created_at)]),
      expenses: recentExpenses.map((expense) => [expense.expense_number, expense.category.name, expense.supplier ?? "-", formatKes(expense.amount_kes), date(expense.expense_date)])
    }
  };
}

function moduleMeta(module: AdminModule) {
  const found = adminModules.find((item) => item.module === module);
  return {
    title: found?.label ?? "Dashboard",
    crumb: found?.group ?? "Home",
    intro: found?.summary ?? "Ceter Technologies business workspace."
  };
}

function metricsFor(module: AdminModule, common: WorkspaceMetric[], values: Record<string, number>): WorkspaceMetric[] {
  const stockMetrics = [
    { label: "Products", value: formatNumber(values.products), note: `${formatNumber(values.publishedProducts)} visible on storefront`, tone: "blue" as const },
    { label: "Stock Units", value: formatNumber(values.stockUnits), note: `${formatNumber(values.lowStockProducts)} below reorder level`, tone: values.lowStockProducts ? "amber" as const : "green" as const },
    { label: "Stock Value", value: formatKes(values.stockValue), note: "Authoritative catalogue selling value", tone: "green" as const },
    { label: "Paid Revenue", value: formatKes(values.paidRevenue), note: `${formatNumber(values.paidCount)} paid payment records`, tone: "blue" as const }
  ];
  if (module === "inventory") return stockMetrics;
  if (["customers", "sales", "transactions"].includes(module)) {
    return [
      { label: "Customers", value: formatNumber(values.customers + values.businessCustomers), note: "Storefront and business contacts", tone: "blue" },
      { label: "Receivables", value: formatKes(values.invoiceBalance), note: "Latest invoice balances", tone: values.invoiceBalance ? "amber" : "green" },
      { label: "Paid Revenue", value: formatKes(values.paidRevenue), note: `${formatNumber(values.paidCount)} payments`, tone: "green" },
      { label: "Open Purchases", value: formatNumber(values.purchaseOpen), note: "Procurement items awaiting completion", tone: "gray" }
    ];
  }
  if (["users", "settings", "branches"].includes(module)) {
    return [
      { label: "Admin Users", value: formatNumber(values.users), note: "Authorized operating users", tone: "blue" },
      { label: "Documents", value: formatNumber(values.documents), note: "Latest vault and customer documents", tone: "gray" },
      { label: "eTIMS Queue", value: formatNumber(values.etims), note: "Recent submission records", tone: "amber" },
      { label: "Live Banners", value: formatNumber(values.banners), note: "Storefront presentation records", tone: "green" }
    ];
  }
  return common;
}

function tablesFor(module: AdminModule, dashboardTables: WorkspaceTable[], data: any): WorkspaceTable[] {
  if (module === "inventory") {
    return [
      dashboardTables[0],
      {
        title: "Recent Quotes",
        columns: ["Request", "Contact", "Status", "Value", "Created"],
        rows: data.quotes.map((quote: any) => [shortId(quote.id), quote.name, label(quote.status), quote.quoted_value_kes ? formatKes(quote.quoted_value_kes) : "Not quoted", date(quote.created_at)]),
        empty: "No quote requests have arrived from the storefront."
      }
    ];
  }
  if (module === "customers" || module === "sales") {
    return [
      {
        title: "Customer Accounts",
        columns: ["Customer", "Company", "Email", "Orders", "Balance"],
        rows: data.customers.map((customer: any) => [customer.name, customer.company_name ?? "-", customer.email ?? "-", String(customer.orders.length), formatKes(customer.invoices.reduce((sum: number, invoice: any) => sum + invoice.balance_kes, 0))]),
        empty: "No business customer accounts exist."
      },
      dashboardTables[0]
    ];
  }
  if (module === "transactions") {
    return [
      {
        title: "Payments And Receipts",
        columns: ["Payment", "Customer", "Invoice", "Method", "Amount"],
        rows: data.payments.map((payment: any) => [payment.payment_number, payment.customer.name, payment.invoice?.invoice_number ?? "-", label(payment.method), formatKes(payment.amount_kes)]),
        empty: "No business payments have been recorded."
      },
      dashboardTables[0]
    ];
  }
  if (module === "purchases") {
    return [
      {
        title: "Purchase Orders",
        columns: ["PO", "Supplier", "Status", "Items", "Total"],
        rows: data.purchaseOrders.map((po: any) => [po.po_number, po.supplier.company_name, label(po.status), String(po.items.length), formatKes(po.total_kes)]),
        empty: "No purchase orders exist."
      },
      {
        title: "Suppliers",
        columns: ["Supplier", "Contact", "Email", "Phone"],
        rows: data.suppliers.map((supplier: any) => [supplier.company_name, supplier.contact_name ?? "-", supplier.email ?? "-", supplier.phone ?? "-"]),
        empty: "No suppliers exist."
      }
    ];
  }
  if (module === "expenses") {
    return [{
      title: "Expenses",
      columns: ["Expense", "Supplier", "Category", "Status", "Total"],
      rows: data.expenses.map((expense: any) => [expense.expense_number, expense.supplier ?? expense.customer?.name ?? "-", expense.category?.name ?? "-", label(expense.method), formatKes(expense.amount_kes)]),
      empty: "No expenses have been recorded."
    }];
  }
  if (module === "accounting" || module === "reports") {
    return [
      {
        title: "Journal Entries",
        columns: ["Entry", "Source", "Date", "Lines", "Memo"],
        rows: data.journals.map((entry: any) => [entry.entry_number, label(entry.source_type), date(entry.entry_date), String(entry.lines.length), entry.memo ?? "-"]),
        empty: "No journal entries exist."
      },
      {
        title: "Chart Of Accounts",
        columns: ["Code", "Name", "Type", "Active"],
        rows: data.accounts.map((account: any) => [account.code, account.name, label(account.type), account.is_active ? "Yes" : "No"]),
        empty: "No chart of accounts records exist."
      }
    ];
  }
  if (module === "users") {
    return [{
      title: "Authorized Users",
      columns: ["Name", "Email", "Role", "Created"],
      rows: data.users.map((user: any) => [user.full_name ?? "Unnamed", user.email ?? "-", label(user.role), date(user.created_at)]),
      empty: "No admin users exist."
    }];
  }
  if (module === "settings" || module === "branches") {
    return [
      {
        title: "Banners",
        columns: ["Title", "Placement", "Category", "Enabled"],
        rows: data.banners.map((banner: any) => [banner.title, label(banner.placement), banner.category?.name ?? "-", banner.is_enabled ? "Yes" : "No"]),
        empty: "No banners exist."
      },
      {
        title: "Homepage Sections",
        columns: ["Title", "Type", "Category", "Limit"],
        rows: data.sections.map((section: any) => [section.title, label(section.section_type), section.category?.name ?? "-", String(section.product_limit)]),
        empty: "No homepage sections exist."
      }
    ];
  }
  return dashboardTables;
}

function actionsFor(module: AdminModule): WorkspaceAction[] {
  const create = [
    { href: "/admin/business?tab=sales", label: "Create Sale", detail: "Issue invoice or quotation" },
    { href: "/admin/products/new", label: "Add Item", detail: "Create a storefront product" },
    { href: "/admin/business?tab=expenses", label: "Create Expense", detail: "Record cost and attachment" },
    { href: "/admin/business?tab=sales", label: "Create Quotation", detail: "Build a customer quote" },
    { href: "/admin/business?tab=customers", label: "Create Customer", detail: "Add account and address" }
  ];
  if (module === "inventory") return [{ href: "/admin/products/new", label: "Add Item", detail: "Add stock-backed product" }, { href: "/admin/import", label: "Import Items", detail: "Upload catalogue workbook" }, ...create.slice(0, 1)];
  if (module === "transactions") return [{ href: "/admin/payments/mpesa-reconciliation", label: "M-Pesa Reconciliation", detail: "Verify callback payments" }, ...create.slice(0, 1)];
  return create;
}

function panelsFor(module: AdminModule, values: Record<string, number>): WorkspacePanel[] {
  return [
    {
      title: "Storefront Synchronization",
      body: "This workspace reads and writes the same Product, Order, Customer, Payment, Banner and Document records used by the public Ceter storefront.",
      items: [
        ["Published products", formatNumber(values.publishedProducts ?? 0)],
        ["Catalogue value", formatKes(values.stockValue ?? 0)],
        ["Customer profiles", formatNumber(values.customers ?? 0)],
        ["Paid revenue", formatKes(values.paidRevenue ?? 0)]
      ]
    },
    {
      title: "Controls Ready For Work",
      body: "Tables in this workspace support in-browser search, compact row density, printing and CSV export without changing business records.",
      items: [
        ["Module", label(module)],
        ["Search", "Enabled"],
        ["Print", "Enabled"],
        ["Export", "CSV"]
      ]
    }
  ];
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseDate(value: string | undefined) {
  if (!value) return null;
  const dateValue = new Date(`${value}T00:00:00`);
  return Number.isNaN(dateValue.getTime()) ? null : dateValue;
}

function inputDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function humanDate(value: Date) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(value);
}

function sum<T, K extends keyof T>(items: T[], key: K) {
  return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
}

function card(labelText: string, value: number, previous: number, tone: DashboardMetric["tone"], href: string, prefix: "KES"): DashboardMetric {
  const percent = percentChange(value, previous);
  return {
    label: labelText,
    value: prefix === "KES" ? formatKes(value) : formatNumber(value),
    delta: percent,
    deltaTone: value >= previous ? "up" : "down",
    tone,
    href,
    icon: iconFor(tone)
  };
}

function countCard(labelText: string, value: number, previous: number, tone: DashboardMetric["tone"], href: string): DashboardMetric {
  const percent = percentChange(value, previous);
  return {
    label: labelText,
    value: formatNumber(value),
    delta: percent,
    deltaTone: value >= previous ? "up" : "down",
    tone,
    href,
    icon: iconFor(tone)
  };
}

function percentChange(value: number, previous: number) {
  if (!previous && !value) return "0.0%";
  if (!previous) return "100.0%";
  return `${Math.abs(((value - previous) / previous) * 100).toFixed(1)}%`;
}

function iconFor(tone: DashboardMetric["tone"]) {
  const icons: Record<DashboardMetric["tone"], string> = {
    sales: "sales",
    expenses: "expenses",
    purchases: "purchases",
    profit: "profit",
    customers: "customers",
    products: "products",
    pending: "pending",
    cash: "cash"
  };
  return icons[tone];
}

function buildSalesTrend(start: Date, end: Date, records: Array<{ date: Date; value: number }>) {
  const days: Array<{ label: string; value: number; key: string }> = [];
  const cursor = new Date(start);
  while (cursor <= end && days.length < 45) {
    days.push({ label: String(cursor.getDate()), key: inputDate(cursor), value: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  for (const record of records) {
    const key = inputDate(record.date);
    const day = days.find((item) => item.key === key);
    if (day) day.value += record.value;
  }
  return days.length ? days : [{ label: "1", key: inputDate(start), value: 0 }];
}

function addToMap(map: Map<string, number>, key: string | null | undefined, value: number) {
  const labelText = key || "Unassigned";
  map.set(labelText, (map.get(labelText) ?? 0) + value);
  return map;
}

function rankByMap(map: Map<string, number>, detail: string, take = 6): DashboardRank[] {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([labelText, value], index) => ({ label: labelText, value: formatKes(value), detail, tone: index === 0 ? "green" : "gray" }));
}

function rankProducts(
  invoiceItems: Array<{ description: string; quantity: number; line_total_kes: number; product: { name: string; cost_price_kes: number | null } | null }>,
  orderItems: Array<{ quantity: number; price_at_purchase_kes: number; service_label: string | null; product: { name: string; cost_price_kes: number | null } | null }>
): DashboardRank[] {
  const map = new Map<string, { revenue: number; qty: number; cost: number }>();
  for (const item of invoiceItems) {
    const name = item.product?.name ?? item.description;
    const current = map.get(name) ?? { revenue: 0, qty: 0, cost: 0 };
    current.revenue += item.line_total_kes;
    current.qty += item.quantity;
    current.cost += item.quantity * (item.product?.cost_price_kes ?? 0);
    map.set(name, current);
  }
  for (const item of orderItems) {
    const name = item.product?.name ?? item.service_label ?? "Storefront item";
    const current = map.get(name) ?? { revenue: 0, qty: 0, cost: 0 };
    current.revenue += item.quantity * item.price_at_purchase_kes;
    current.qty += item.quantity;
    current.cost += item.quantity * (item.product?.cost_price_kes ?? 0);
    map.set(name, current);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 7)
    .map(([labelText, item], index) => {
      const profit = item.revenue - item.cost;
      const margin = item.revenue > 0 ? `${((profit / item.revenue) * 100).toFixed(1)}%` : "0.0%";
      return {
        label: labelText,
        value: formatKes(item.revenue),
        detail: `${formatNumber(item.qty)} units sold`,
        tone: index === 0 ? "green" : "blue",
        quantity: item.qty,
        revenue: item.revenue,
        averagePrice: item.qty > 0 ? item.revenue / item.qty : 0,
        profit,
        margin
      };
    });
}

function soldCost(
  invoiceItems: Array<{ quantity: number; product: { cost_price_kes: number | null } | null }>,
  orderItems: Array<{ quantity: number; product: { cost_price_kes: number | null } | null }>
) {
  const invoiceCost = invoiceItems.reduce((total, item) => total + item.quantity * (item.product?.cost_price_kes ?? 0), 0);
  const orderCost = orderItems.reduce((total, item) => total + item.quantity * (item.product?.cost_price_kes ?? 0), 0);
  return invoiceCost + orderCost;
}

function rankCategories(
  invoiceItems: Array<{ line_total_kes: number; product: { category: { name: string } | null } | null }>,
  orderItems: Array<{ quantity: number; price_at_purchase_kes: number; product: { category: { name: string } | null } | null }>,
  categories: Array<{ name: string; products: Array<{ stock_quantity: number; price_kes: number }> }>
): DashboardRank[] {
  const map = new Map<string, number>();
  for (const item of invoiceItems) addToMap(map, item.product?.category?.name ?? "Services", item.line_total_kes);
  for (const item of orderItems) addToMap(map, item.product?.category?.name ?? "Storefront", item.quantity * item.price_at_purchase_kes);
  for (const category of categories) {
    if (!map.has(category.name)) {
      const stockValue = category.products.reduce((sum, product) => sum + product.stock_quantity * product.price_kes, 0);
      if (stockValue > 0) map.set(category.name, 0);
    }
  }
  return rankByMap(map, "Category revenue", 6);
}

function slowMovingProducts(top: DashboardRank[], totalProducts: number): DashboardRank[] {
  if (top.length) {
    return top.slice(-4).reverse().map((item) => ({ ...item, detail: "Lower movement in selected period", tone: "amber" }));
  }
  return [{ label: "No sales movement", value: formatNumber(totalProducts), detail: "Products without selected-period sales", tone: "amber" }];
}

function agingBucket(labelText: string, invoices: Array<{ balance_kes: number; created_at: Date }>, referenceTime: number, minDays: number, maxDays: number): DashboardAging {
  const amount = invoices.reduce((total, invoice) => {
    if (invoice.balance_kes <= 0) return total;
    const ageDays = Math.floor((referenceTime - invoice.created_at.getTime()) / 86_400_000);
    return ageDays >= minDays && ageDays <= maxDays ? total + invoice.balance_kes : total;
  }, 0);
  return { label: labelText, value: formatKes(amount), amount };
}

function financeInsights(sales: number, expenses: number, profit: number, receivables: number, collections: number) {
  const insights = [];
  if (sales > 0) insights.push(`Net margin is ${((profit / sales) * 100).toFixed(1)}% for the selected period.`);
  if (expenses > sales * 0.65 && sales > 0) insights.push("Expenses are above 65% of revenue; review operating costs.");
  if (receivables > collections && receivables > 0) insights.push("Receivables are higher than collections; prioritize customer follow-up.");
  if (!insights.length) insights.push("No revenue pressure detected from the selected period data.");
  return insights;
}

function label(value: string | null | undefined) {
  return String(value ?? "-").replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(value);
}

function toNumber(value: bigint | number | null | undefined) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}
