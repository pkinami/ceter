const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey
  },
  async redirects() {
    return [
      { source: "/admin/brands", destination: "/admin/categories?tab=brands", permanent: false },
      { source: "/admin/storefront/banners", destination: "/admin/storefront/homepage?tab=banners", permanent: false },
      { source: "/admin/banners", destination: "/admin/storefront/homepage?tab=banners", permanent: false },
      { source: "/admin/homepage", destination: "/admin/storefront/homepage", permanent: false },
      { source: "/admin/receipts", destination: "/admin/payments?tab=receipts", permanent: false },
      { source: "/admin/payments/mpesa-reconciliation", destination: "/admin/settings/integrations?tab=mpesa", permanent: false },
      { source: "/admin/contracts", destination: "/admin/customer-equipment?tab=contracts", permanent: false },
      { source: "/admin/documents/verification", destination: "/admin/documents?tab=verification", permanent: false },
      { source: "/admin/customer-categories", destination: "/admin/customers", permanent: false },
      { source: "/admin/customers/categories", destination: "/admin/customers", permanent: false },
      { source: "/admin/customer-statements", destination: "/admin/documents", permanent: false },
      { source: "/admin/order-tracking", destination: "/admin/sales", permanent: false },
      { source: "/admin/delivery-notes", destination: "/admin/deliveries", permanent: false },
      { source: "/admin/recurring-invoices", destination: "/admin/invoices", permanent: false },
      { source: "/admin/debit-notes", destination: "/admin/credit-notes", permanent: false },
      { source: "/admin/transactions", destination: "/admin/settings/integrations", permanent: false },
      { source: "/admin/transactions/integrations", destination: "/admin/settings/integrations", permanent: false },
      { source: "/admin/expenses/recurring", destination: "/admin/expenses", permanent: false },
      { source: "/admin/accounting/periods", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/accounting/posting-rules", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/accounting/reconciliation", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/accounting/debtors", destination: "/admin/reports?tab=customers", permanent: false },
      { source: "/admin/accounting/creditors", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/reports/debtors", destination: "/admin/reports?tab=customers", permanent: false },
      { source: "/admin/reports/creditors", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/fiscalization", destination: "/admin/settings/integrations?tab=etims", permanent: false },
      { source: "/admin/fiscalization/queue", destination: "/admin/settings/integrations?tab=etims", permanent: false },
      { source: "/admin/fiscalization/reconciliation", destination: "/admin/settings/integrations?tab=etims", permanent: false },
      { source: "/admin/settings/etims", destination: "/admin/settings/integrations?tab=etims", permanent: false },
      { source: "/admin/settings/mpesa", destination: "/admin/settings/integrations?tab=mpesa", permanent: false },
      { source: "/admin/settings/payment-methods", destination: "/admin/settings/integrations?tab=payment-methods", permanent: false },
      { source: "/admin/settings/tax", destination: "/admin/settings/integrations?tab=tax", permanent: false },
      { source: "/admin/settings/sms", destination: "/admin/settings/integrations?tab=sms", permanent: false },
      { source: "/admin/settings/signing", destination: "/admin/settings/integrations?tab=signing", permanent: false },
      { source: "/admin/settings/security", destination: "/admin/settings/integrations?tab=security", permanent: false },
      { source: "/admin/settings/notifications", destination: "/admin/settings/integrations?tab=notifications", permanent: false },
      { source: "/admin/settings/legal", destination: "/admin/settings/templates", permanent: false },
      { source: "/admin/reports/sales", destination: "/admin/reports?tab=sales", permanent: false },
      { source: "/admin/reports/inventory", destination: "/admin/reports?tab=stock", permanent: false },
      { source: "/admin/reports/stock-movements", destination: "/admin/reports?tab=stock", permanent: false },
      { source: "/admin/reports/customers", destination: "/admin/reports?tab=customers", permanent: false },
      { source: "/admin/reports/customer-balances", destination: "/admin/reports?tab=customers", permanent: false },
      { source: "/admin/reports/profit-loss", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/reports/collections", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/reports/purchases", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/reports/etims-tax", destination: "/admin/reports?tab=finance", permanent: false },
      { source: "/admin/service", destination: "/admin/customer-equipment", permanent: false },
      { source: "/admin/service/:path*", destination: "/admin/customer-equipment", permanent: false },
      { source: "/admin/administration", destination: "/admin/settings/business", permanent: false },
      { source: "/admin/users", destination: "/admin/settings/security", permanent: false },
      { source: "/admin/roles", destination: "/admin/settings/security", permanent: false },
      { source: "/admin/branches", destination: "/admin/settings/business", permanent: false },
      { source: "/admin/compliance", destination: "/admin/documents", permanent: false },
      { source: "/admin/activity", destination: "/admin/settings/security", permanent: false },
      { source: "/admin/notices", destination: "/admin/settings/notifications", permanent: false }
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co"
      }
    ]
  },
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@fontsource/arimo/files/arimo-latin-400-normal.woff",
      "./node_modules/@fontsource/arimo/files/arimo-latin-500-normal.woff",
      "./node_modules/@fontsource/arimo/files/arimo-latin-600-normal.woff",
      "./node_modules/@fontsource/arimo/files/arimo-latin-700-normal.woff",
      "./node_modules/@fontsource/poppins/files/poppins-latin-400-normal.woff",
      "./node_modules/@fontsource/poppins/files/poppins-latin-500-normal.woff",
      "./node_modules/@fontsource/poppins/files/poppins-latin-600-normal.woff",
      "./node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff",
      "./public/templates/ceter-quotation-first-page-art.pdf",
      "./public/templates/ceter-quotation-continuation-art.pdf"
    ]
  }
};

export default nextConfig;
