import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CeterAdminShell } from "@/components/admin/CeterAdminShell";
import { getAdminSession } from "@/lib/admin/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const pathname = (await headers()).get("x-ceter-pathname") ?? "";
  if (!session) {
    if (pathname === "/admin/login") return <>{children}</>;
    redirect("/admin/login");
  }
  return <CeterAdminShell session={{ name: session.name, email: session.email, permissions: session.permissions }}>{children}</CeterAdminShell>;
}
