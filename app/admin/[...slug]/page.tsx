import { notFound, redirect } from "next/navigation";
import { requireRouteAccess } from "@/lib/admin/auth";

type AdminCatchAllPageProps = {
  params: Promise<{ slug?: string[] }>;
};

const legacyRedirects: Record<string, string> = {
  banners: "/admin/storefront/banners",
  homepage: "/admin/storefront/homepage",
  "storefront/templates": "/admin/storefront/homepage",
  quotations: "/admin/quotes",
  "customers/categories": "/admin/customer-categories",
  "settings/business-profile": "/admin/settings/business",
  "settings/customization": "/admin/settings/templates",
  customization: "/admin/settings/templates",
  onboard: "/admin/users/invitations",
  "sales-people": "/admin/sales-team"
};

export default async function AdminCatchAllPage({ params }: AdminCatchAllPageProps) {
  const slug = (await params).slug?.join("/") ?? "";
  const target = legacyRedirects[slug];
  if (target) {
    await requireRouteAccess(target.split("?")[0]);
    redirect(target);
  }
  notFound();
}
