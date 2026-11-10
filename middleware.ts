import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  if (request.nextUrl.hostname === "cetertechnologies.com") {
    const url = request.nextUrl.clone();
    url.hostname = "www.cetertechnologies.com";
    return NextResponse.redirect(url, 308);
  }

  const adminRedirect = mergedAdminRoute(request.nextUrl.pathname);
  if (adminRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = adminRedirect.pathname;
    url.search = adminRedirect.search;
    return NextResponse.redirect(url, 307);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-ceter-pathname", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return response;
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  try {
    await supabase.auth.getUser();
  } catch {
    return response;
  }

  return response;
}

function mergedAdminRoute(pathname: string) {
  const exact: Record<string, string> = {
    "/admin/banners": "/admin/storefront/homepage?tab=banners",
    "/admin/homepage": "/admin/storefront/homepage",
    "/admin/brands": "/admin/categories?tab=brands",
    "/admin/orders": "/admin/sales",
    "/admin/receipts": "/admin/payments?tab=receipts",
    "/admin/delivery-notes": "/admin/deliveries?tab=notes",
    "/admin/order-tracking": "/admin/sales?tab=tracking",
    "/admin/customer-categories": "/admin/customers?tab=categories",
    "/admin/customer-statements": "/admin/documents?tab=statements",
    "/admin/contracts": "/admin/customer-equipment?tab=contracts",
    "/admin/debit-notes": "/admin/credit-notes?tab=debit-notes",
    "/admin/recurring-invoices": "/admin/invoices?tab=recurring",
    "/admin/fiscalization": "/admin/settings/integrations?tab=etims",
    "/admin/documents/verification": "/admin/documents?tab=verification",
    "/admin/transactions": "/admin/reports/profit-loss?tab=transactions",
    "/admin/expenses": "/admin/reports/profit-loss?tab=expenses",
    "/admin/expense-categories": "/admin/reports/profit-loss?tab=expense-categories",
    "/admin/accounting": "/admin/reports/profit-loss?tab=accounting",
    "/admin/users": "/admin/settings/security?tab=users",
    "/admin/roles": "/admin/settings/security?tab=roles",
    "/admin/branches": "/admin/settings/business?tab=branches",
    "/admin/compliance": "/admin/settings/legal?tab=compliance",
    "/admin/activity": "/admin/settings/security?tab=activity",
    "/admin/notices": "/admin/settings/notifications?tab=notices",
    "/admin/settings/payment-methods": "/admin/settings/integrations?tab=payment-methods",
    "/admin/settings/tax": "/admin/settings/integrations?tab=tax",
    "/admin/settings/sms": "/admin/settings/integrations?tab=sms",
    "/admin/settings/mpesa": "/admin/settings/integrations?tab=mpesa",
    "/admin/settings/etims": "/admin/settings/integrations?tab=etims",
    "/admin/settings/signing": "/admin/settings/integrations?tab=signing",
    "/admin/settings/security": "/admin/settings/integrations?tab=security",
    "/admin/settings/notifications": "/admin/settings/integrations?tab=notifications",
    "/admin/settings/legal": "/admin/settings/templates?tab=legal"
  };
  const prefixes: Array<[RegExp, string]> = [
    [/^\/admin\/service(?:\/.*)?$/, "/admin/customer-equipment?tab=service"],
    [/^\/admin\/accounting\/(?:debtors|creditors|periods|posting-rules|reconciliation)(?:\/.*)?$/, "/admin/reports/profit-loss?tab=accounting"],
    [/^\/admin\/fiscalization\/(?:queue|reconciliation)(?:\/.*)?$/, "/admin/settings/integrations?tab=etims"],
    [/^\/admin\/reports\/(?:stock-movements|sales-by-item)$/, "/admin/reports/inventory"],
    [/^\/admin\/reports\/(?:customer-balances|debtors|creditors|collections)$/, "/admin/reports/customers"],
    [/^\/admin\/reports\/(?:purchases|etims-tax|audit|service-sla|mps|warranties)$/, "/admin/reports/profit-loss"],
    [/^\/admin\/expenses\/recurring(?:\/.*)?$/, "/admin/reports/profit-loss?tab=recurring-expenses"],
    [/^\/admin\/transactions\/integrations(?:\/.*)?$/, "/admin/settings/integrations?tab=transactions"],
    [/^\/admin\/users\/(?:new|invitations)(?:\/.*)?$/, "/admin/settings/security?tab=users"],
    [/^\/admin\/roles(?:\/.*)?$/, "/admin/settings/security?tab=roles"],
    [/^\/admin\/branches(?:\/.*)?$/, "/admin/settings/business?tab=branches"],
    [/^\/admin\/compliance(?:\/.*)?$/, "/admin/settings/templates?tab=compliance"],
    [/^\/admin\/notices(?:\/.*)?$/, "/admin/settings/integrations?tab=notifications"]
  ];
  const target = exact[pathname] ?? prefixes.find(([pattern]) => pattern.test(pathname))?.[1];
  if (!target) return null;
  const url = new URL(target, "http://localhost");
  return { pathname: url.pathname, search: url.search };
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
