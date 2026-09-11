import { CeterAdminWorkspace } from "@/components/admin/CeterAdminWorkspace";

export default async function AdminDashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return <CeterAdminWorkspace module="dashboard" searchParams={await searchParams} />;
}
