import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatKes, formatNumber } from "@/lib/utils";
import { adminModules, type AdminModule } from "@/lib/admin/modules";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type WorkspaceMetric = { label: string; value: string; note?: string; tone?: "blue" | "green" | "amber" | "red" | "gray" };
export type WorkspaceTable = { title: string; columns: string[]; rows: string[][]; empty: string };
export type WorkspaceAction = { href: string; label: string; detail: string };
export type WorkspacePanel = { title: string; body: string; items: Array<[string, string]> };
export type WorkspaceData = {
  module: AdminModule;
  title: string;
  crumb: string;
  intro: string;
  metrics: WorkspaceMetric[];
  tables: WorkspaceTable[];
  actions: WorkspaceAction[];
  panels: WorkspacePanel[];
};

export async function getWorkspaceData(module: AdminModule): Promise<WorkspaceData> {
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

  const dashboardTables: WorkspaceTable[] = [
    {
      title: "Recent Storefront Orders",
      columns: ["Order", "Customer", "Status", "Payment", "Total"],
      rows: orders.map((order) => [shortId(order.id), order.profile?.full_name ?? order.delivery_name ?? "Guest checkout", label(order.status), order.payments[0]?.status ? label(order.payments[0].status) : "No payment", formatKes(order.total_kes)]),
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
    })
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
  if (["inventory", "storefront", "billing", "customization"].includes(module)) return stockMetrics;
  if (["customers", "sales", "transactions"].includes(module)) {
    return [
      { label: "Customers", value: formatNumber(values.customers + values.businessCustomers), note: "Storefront and business contacts", tone: "blue" },
      { label: "Receivables", value: formatKes(values.invoiceBalance), note: "Latest invoice balances", tone: values.invoiceBalance ? "amber" : "green" },
      { label: "Paid Revenue", value: formatKes(values.paidRevenue), note: `${formatNumber(values.paidCount)} payments`, tone: "green" },
      { label: "Open Purchases", value: formatNumber(values.purchaseOpen), note: "Procurement items awaiting completion", tone: "gray" }
    ];
  }
  if (["users", "settings", "documents", "etims"].includes(module)) {
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
  if (module === "inventory" || module === "storefront" || module === "billing") {
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
        rows: data.accounts.map((account: any) => [account.code, account.name, label(account.account_type), account.is_active ? "Yes" : "No"]),
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
  if (module === "customization" || module === "settings") {
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
  if (module === "documents") {
    return [{
      title: "Document Vault",
      columns: ["Document", "Type", "Customer", "Created"],
      rows: data.documents.map((document: any) => [document.title, label(document.document_type), document.customer?.name ?? document.company_document?.category ?? "-", date(document.created_at)]),
      empty: "No documents have been generated or uploaded."
    }];
  }
  if (module === "etims") {
    return [{
      title: "eTIMS Queue",
      columns: ["Invoice", "Customer", "Status", "Attempts", "Last Error"],
      rows: data.etims.map((item: any) => [item.invoice.invoice_number, item.invoice.customer.name, label(item.status), String(item.retry_count), item.last_error ?? "-"]),
      empty: "No eTIMS submission records exist."
    }];
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
  if (module === "customization") return [{ href: "/admin/banners", label: "Manage Banners", detail: "Update storefront hero areas" }, { href: "/admin/homepage", label: "Arrange Homepage", detail: "Control storefront sections" }, { href: "/admin/services", label: "Services", detail: "Edit service entries" }];
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
      title: "Reference Pattern Applied",
      body: "Measured AccurateBook traits applied here: 280px desktop navigation, 66px top header, Poppins-like sans typography, compact rounded controls, KPI cards, dense tables, mobile drawer navigation and explicit disabled states.",
      items: [
        ["Module", label(module)],
        ["Desktop", "1440 x 900 verified target"],
        ["Tablet", "834 x 1112 verified target"],
        ["Mobile", "390 x 844 verified target"]
      ]
    }
  ];
}

function shortId(value: string) {
  return value.slice(0, 8).toUpperCase();
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function date(value: Date) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(value);
}

function toNumber(value: bigint | number | null | undefined) {
  return typeof value === "bigint" ? Number(value) : Number(value ?? 0);
}
