export type AdminModule =
  | "dashboard"
  | "inventory"
  | "sales"
  | "customers"
  | "transactions"
  | "purchases"
  | "expenses"
  | "accounting"
  | "reports"
  | "users"
  | "sales-people"
  | "branches"
  | "customization"
  | "billing"
  | "settings"
  | "etims"
  | "storefront"
  | "documents";

export const adminModules: Array<{
  module: AdminModule;
  href: string;
  label: string;
  group: string;
  summary: string;
}> = [
  { module: "dashboard", href: "/admin", label: "Dashboard", group: "Home", summary: "Operating snapshot and work queue" },
  { module: "inventory", href: "/admin/inventory", label: "Inventory", group: "Operations", summary: "Stock, reorder, serial and movement control" },
  { module: "sales", href: "/admin/orders", label: "Sales", group: "Operations", summary: "Storefront orders, quotations and invoices" },
  { module: "customers", href: "/admin/customers", label: "Customers", group: "Operations", summary: "Customer accounts and receivables" },
  { module: "transactions", href: "/admin/payments", label: "Transactions", group: "Finance", summary: "Payments, receipts and M-Pesa callbacks" },
  { module: "purchases", href: "/admin/business?tab=procurement", label: "Purchases", group: "Finance", summary: "Suppliers, purchase orders and goods received" },
  { module: "expenses", href: "/admin/business?tab=expenses", label: "Expenses", group: "Finance", summary: "Expense capture and attachments" },
  { module: "accounting", href: "/admin/business?tab=accounting", label: "Accounting", group: "Finance", summary: "Chart of accounts and journal entries" },
  { module: "reports", href: "/admin/reports", label: "Reports", group: "Insight", summary: "Financial and operational reporting" },
  { module: "users", href: "/admin/users", label: "User Management", group: "Company", summary: "Admin roles and access" },
  { module: "sales-people", href: "/admin/business?tab=sales-people", label: "Sales People", group: "Company", summary: "Sales ownership and commissions" },
  { module: "branches", href: "/admin/settings?tab=branches", label: "Branches", group: "Company", summary: "Business locations and delivery settings" },
  { module: "customization", href: "/admin/homepage", label: "Customization", group: "Storefront", summary: "Homepage, banners and services" },
  { module: "billing", href: "/admin/pricing", label: "Billing", group: "Storefront", summary: "Catalogue prices and payment configuration" },
  { module: "settings", href: "/admin/settings", label: "Settings", group: "System", summary: "Delivery, business and compliance settings" },
  { module: "etims", href: "/admin/business?tab=etims", label: "eTIMS", group: "System", summary: "Tax invoice submission readiness" },
  { module: "storefront", href: "/admin/products", label: "Storefront", group: "Storefront", summary: "Products, categories, brands and visibility" },
  { module: "documents", href: "/admin/business?tab=vault", label: "Documents", group: "System", summary: "Customer and company document vault" }
];
