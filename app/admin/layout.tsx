import type { Metadata } from "next";
import { CeterAdminShell } from "@/components/admin/CeterAdminShell";
import { getAdminSession } from "@/lib/admin/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false }
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  if (!session) return <>{children}</>;
  return <CeterAdminShell session={{ name: session.name, email: session.email }}>{children}</CeterAdminShell>;
}
