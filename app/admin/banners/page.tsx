import { redirect } from "next/navigation";
import { requireRouteAccess } from "@/lib/admin/auth";

export default async function LegacyBannersPage() {
  await requireRouteAccess("/admin/storefront/banners");
  redirect("/admin/storefront/banners");
}
