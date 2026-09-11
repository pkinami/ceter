import { redirect } from "next/navigation";
import { requireRouteAccess } from "@/lib/admin/auth";

export default async function LegacyHomepagePage() {
  await requireRouteAccess("/admin/storefront/homepage");
  redirect("/admin/storefront/homepage");
}
