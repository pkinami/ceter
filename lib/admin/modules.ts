export type AdminModule =
  | "dashboard"
  | "inventory"
  | "storefront"
  | "sales"
  | "billing"
  | "customers"
  | "service"
  | "transactions"
  | "purchases"
  | "expenses"
  | "accounting"
  | "reports"
  | "administration"
  | "settings"
  | "help"
  | "users"
  | "branches"
  | "customization";

export type AdminNavChild = {
  href?: string;
  label: string;
  summary: string;
  children?: AdminNavChild[];
  featureFlag?: string;
};

export const adminModules: Array<{
  module: AdminModule;
  href: string;
  label: string;
  group: string;
  summary: string;
  badge?: string;
  children?: AdminNavChild[];
}> = [
  { module: "dashboard", href: "/admin", label: "Dashboard", group: "Home", summary: "Operating snapshot and work queue" },
  { module: "storefront", href: "/admin/storefront/homepage", label: "Storefront", group: "Operations", summary: "Public storefront content and merchandising", children: [
    { href: "/admin/storefront/homepage", label: "Homepage & Banners", summary: "Homepage sections and responsive banners" },
    { href: "/admin/storefront/featured", label: "Featured Products", summary: "Featured product selection" }
  ] },
  { module: "inventory", href: "/admin/products", label: "Catalog", group: "Operations", summary: "Products, categories, brands and imports", children: [
    { href: "/admin/products", label: "Products & Services", summary: "Create, edit and publish products and services" },
    { href: "/admin/categories", label: "Categories & Brands", summary: "Category hierarchy and brand records" },
    { href: "/admin/import", label: "Import Products", summary: "Safe product imports" }
  ] },
  { module: "inventory", href: "/admin/inventory", label: "Stock", group: "Operations", summary: "Stock controls and replenishment", children: [
    { href: "/admin/inventory", label: "Stock Control", summary: "On-hand, reserved, available and movement history" },
    { href: "/admin/inventory/transfers", label: "Stock Transfers", summary: "Transfer stock between locations" },
    { href: "/admin/inventory/stock-takes", label: "Stock Takes", summary: "Physical count and reconciliation" },
    { href: "/admin/inventory/low-stock", label: "Low Stock", summary: "Reorder and backorder review" }
  ] },
  { module: "sales", href: "/admin/sales", label: "Sales", group: "Operations", summary: "Orders, quotes and deliveries", children: [
    { href: "/admin/sales", label: "Orders", summary: "Storefront and counter sales orders" },
    { href: "/admin/sales/new", label: "Make Sale", summary: "Create a sale or invoice" },
    { href: "/admin/quotes", label: "Quotes", summary: "Quote requests and internal quotations" },
    { href: "/admin/deliveries", label: "Deliveries", summary: "Dispatch and delivery status" }
  ] },
  { module: "billing", href: "/admin/invoices", label: "Billing & Documents", group: "Finance", summary: "Invoices, receipts, credit notes and downloads", children: [
    { href: "/admin/invoices", label: "Invoices", summary: "Business invoices" },
    { href: "/admin/payments", label: "Payments & Receipts", summary: "Customer payments and receipts" },
    { href: "/admin/credit-notes", label: "Credit Notes", summary: "Customer credit notes" },
    { href: "/admin/documents", label: "Downloads/Documents", summary: "Issued documents and verification" }
  ] },
  { module: "customers", href: "/admin/customers", label: "Customers", group: "Operations", summary: "Customers, equipment and contracts", children: [
    { href: "/admin/customers", label: "Customers", summary: "Customer accounts and balances" },
    { href: "/admin/customer-equipment", label: "Equipment & Contracts", summary: "Installed assets and customer contracts" }
  ] },
  { module: "purchases", href: "/admin/purchases/orders", label: "Purchasing", group: "Finance", summary: "Suppliers, orders and goods received", children: [
    { href: "/admin/suppliers", label: "Suppliers", summary: "Supplier accounts" },
    { href: "/admin/purchases/orders", label: "Purchase Orders", summary: "Supplier purchase orders" },
    { href: "/admin/purchases/goods-received", label: "Goods Received", summary: "Goods received notes" }
  ] },
  { module: "reports", href: "/admin/reports", label: "Reports", group: "Insight", summary: "Operational and financial reports", children: [
    { href: "/admin/reports?tab=sales", label: "Sales Reports", summary: "Sales totals and item sales" },
    { href: "/admin/reports?tab=stock", label: "Stock Reports", summary: "Inventory status and movements" },
    { href: "/admin/reports?tab=customers", label: "Customer Reports", summary: "Customer activity" },
    { href: "/admin/reports?tab=finance", label: "Finance Reports", summary: "Profit, collections and balances" }
  ] },
  { module: "settings", href: "/admin/settings/integrations", label: "Integrations", group: "System", summary: "Connected services and operating controls", children: [
    { href: "/admin/settings/integrations?tab=etims", label: "eTIMS KRA", summary: "Fiscalization provider setup" },
    { href: "/admin/settings/integrations?tab=mpesa", label: "M-Pesa", summary: "M-Pesa reconciliation settings" },
    { href: "/admin/settings/integrations?tab=payment-methods", label: "Payment Methods", summary: "Accepted payment channels" },
    { href: "/admin/settings/integrations?tab=tax", label: "Tax Types", summary: "Tax rates and mapping" },
    { href: "/admin/settings/integrations?tab=sms", label: "SMS", summary: "SMS notification settings" },
    { href: "/admin/settings/integrations?tab=signing", label: "Document Signing", summary: "Certificate and signing status" },
    { href: "/admin/settings/integrations?tab=security", label: "Security", summary: "Security controls" },
    { href: "/admin/settings/integrations?tab=notifications", label: "Notifications", summary: "Notification preferences" }
  ] },
  { module: "settings", href: "/admin/settings/business", label: "Settings", group: "System", summary: "Business profile, branding and templates", children: [
    { href: "/admin/settings/business", label: "Business Profile", summary: "Company identity and contacts" },
    { href: "/admin/settings/branding", label: "Branding", summary: "Logo and colour configuration" },
    { href: "/admin/settings/templates", label: "Templates & Legal", summary: "Document templates and legal content" }
  ] }
];
