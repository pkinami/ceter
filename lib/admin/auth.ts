import { forbidden, notFound, redirect } from "next/navigation";
import type { ProfileRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { legacyRoleMapping, rolePermissions, type AdminRole, type PermissionKey } from "@/lib/admin/roles";

export type { AdminRole, PermissionKey } from "@/lib/admin/roles";

export type AdminSession = {
  userId: string;
  email: string | null;
  name: string | null;
  role: AdminRole;
  legacyRole: ProfileRole;
  permissions: PermissionKey[];
};

const routePermissions: Array<[RegExp, PermissionKey]> = [
  [/^\/admin$/, "dashboard.view"],
  [/^\/admin\/users/, "users.view"],
  [/^\/admin\/roles/, "roles.view"],
  [/^\/admin\/activity/, "audit.view"],
  [/^\/admin\/products(?:\/new)?$/, "products.view"],
  [/^\/admin\/products\/[^/]+(?:\/edit)?$/, "products.view"],
  [/^\/admin\/categories/, "categories.view"],
  [/^\/admin\/brands/, "brands.view"],
  [/^\/admin\/import/, "products.import"],
  [/^\/admin\/storefront\/banners/, "storefront.banners.manage"],
  [/^\/admin\/storefront\/homepage/, "storefront.homepage.manage"],
  [/^\/admin\/storefront\/featured/, "storefront.featured.manage"],
  [/^\/admin\/storefront\/visibility/, "storefront.visibility.manage"],
  [/^\/admin\/inventory/, "inventory.view"],
  [/^\/admin\/sales|^\/admin\/orders|^\/admin\/quotes|^\/admin\/quote-requests|^\/admin\/payments|^\/admin\/deliveries|^\/admin\/delivery-notes|^\/admin\/order-tracking/, "sales.view"],
  [/^\/admin\/invoices|^\/admin\/receipts|^\/admin\/credit-notes|^\/admin\/debit-notes|^\/admin\/recurring-invoices|^\/admin\/fiscalization|^\/admin\/documents/, "fiscalization.view"],
  [/^\/admin\/customer-equipment/, "service.equipment.view"],
  [/^\/admin\/contracts/, "service.contracts.view"],
  [/^\/admin\/customers|^\/admin\/customer-categories|^\/admin\/customer-statements/, "customers.view"],
  [/^\/admin\/service/, "service.view"],
  [/^\/admin\/transactions/, "accounting.view"],
  [/^\/admin\/purchases|^\/admin\/suppliers/, "purchases.view"],
  [/^\/admin\/expenses|^\/admin\/expense-categories/, "accounting.view"],
  [/^\/admin\/accounting/, "accounting.view"],
  [/^\/admin\/reports/, "accounting.reports.view"],
  [/^\/admin\/branches/, "branches.view"],
  [/^\/admin\/compliance/, "compliance.view"],
  [/^\/admin\/notices/, "notices.view"],
  [/^\/admin\/sales-team/, "sales_team.view"],
  [/^\/admin\/settings\/business/, "settings.business.manage"],
  [/^\/admin\/settings\/branding/, "settings.branding.manage"],
  [/^\/admin\/settings\/payment-methods/, "settings.payments.manage"],
  [/^\/admin\/settings\/tax/, "settings.tax.manage"],
  [/^\/admin\/settings\/sms/, "settings.sms.manage"],
  [/^\/admin\/settings\/integrations/, "settings.integrations.manage"],
  [/^\/admin\/settings\/mpesa/, "settings.mpesa.manage"],
  [/^\/admin\/settings\/etims/, "settings.etims.manage"],
  [/^\/admin\/settings\/signing/, "settings.signing.manage"],
  [/^\/admin\/settings\/security/, "settings.security.manage"],
  [/^\/admin\/settings\/notifications/, "settings.notifications.manage"],
  [/^\/admin\/settings\/templates/, "settings.templates.manage"],
  [/^\/admin\/settings\/legal/, "settings.legal.manage"],
  [/^\/admin\/settings/, "settings.view"],
  [/^\/admin\/help/, "help.view"]
];

export function isAdminAuthBypassed() {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ADMIN_AUTH_BYPASS === "true";
}

const bypassedAdminSession: AdminSession = {
  userId: "00000000-0000-0000-0000-000000000000",
  email: "admin@ceter.local",
  name: "Ceter Admin",
  role: "super_administrator",
  legacyRole: "admin",
  permissions: rolePermissions.super_administrator
};

async function retryAdminRead<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientAdminReadError(error) || attempt === 2) break;
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function isTransientAdminReadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "P2039" || /EAUTHTIMEOUT|timeout while waiting|timeout exceeded|Connection terminated|Can't reach database|ECONNRESET|ETIMEDOUT/i.test(message);
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (isAdminAuthBypassed()) return bypassedAdminSession;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const profile = await retryAdminRead(() => prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true, full_name: true, email: true }
  }));
  if (!profile) return null;

  const role = legacyRoleMapping[profile.role] ?? null;
  if (!role) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? profile.email ?? null,
    name: profile.full_name,
    role,
    legacyRole: profile.role,
    permissions: rolePermissions[role]
  };
}

export async function requireAuthenticatedUser() {
  if (isAdminAuthBypassed()) {
    return {
      id: bypassedAdminSession.userId,
      email: bypassedAdminSession.email
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/admin/login");
  return data.user;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function getUserPermissions(userId?: string) {
  if (isAdminAuthBypassed()) return rolePermissions.super_administrator;

  if (userId) {
    const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
    const role = profile ? legacyRoleMapping[profile.role] : null;
    return role ? rolePermissions[role] : [];
  }
  return (await getAdminSession())?.permissions ?? [];
}

export function hasPermission(session: Pick<AdminSession, "permissions"> | null, permission: PermissionKey) {
  return Boolean(session?.permissions.includes(permission));
}

export async function requirePermission(permission: PermissionKey) {
  const session = await requireAdminSession();
  if (!hasPermission(session, permission)) forbidden();
  return session;
}

export async function requireAnyPermission(permissions: PermissionKey[]) {
  const session = await requireAdminSession();
  if (!permissions.some((permission) => hasPermission(session, permission))) forbidden();
  return session;
}

export async function requireAllPermissions(permissions: PermissionKey[]) {
  const session = await requireAdminSession();
  if (!permissions.every((permission) => hasPermission(session, permission))) forbidden();
  return session;
}

export async function requireCapability(capability: "stock" | "price" | "cost" | "quotes" | "orders", allowed: readonly string[]) {
  const map: Record<typeof capability, PermissionKey> = {
    stock: "inventory.adjust",
    price: "products.update",
    cost: "products.cost_price.view",
    quotes: "quotations.manage",
    orders: "sales.update"
  };
  const permission = map[capability];
  const session = await requirePermission(permission);
  if (!allowed.length) forbidden();
  return session;
}

export function canAccessRoute(session: Pick<AdminSession, "permissions"> | null, pathname: string) {
  const normalized = pathname.split("?")[0].replace(/\/$/, "") || "/admin";
  if (normalized === "/admin/payments/mpesa-reconciliation") return hasPermission(session, "payments.mpesa.reconcile");
  if (normalized === "/admin/settings/integrations") {
    return ["settings.integrations.manage", "settings.etims.manage", "settings.mpesa.manage", "settings.sms.manage", "settings.signing.manage", "settings.notifications.manage"].some((permission) => hasPermission(session, permission as PermissionKey));
  }
  const match = routePermissions.find(([pattern]) => pattern.test(normalized));
  return match ? hasPermission(session, match[1]) : false;
}

export async function requireRouteAccess(pathname: string) {
  const session = await requireAdminSession();
  if (!canAccessRoute(session, pathname)) notFound();
  return session;
}
