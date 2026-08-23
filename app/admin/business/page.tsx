import { CeterAdminWorkspace } from "@/components/admin/CeterAdminWorkspace";
import type { AdminModule } from "@/lib/admin/modules";

const tabModules: Record<string, AdminModule> = {
  procurement: "purchases",
  expenses: "expenses",
  accounting: "accounting",
  reports: "reports",
  users: "users",
  "sales-people": "sales-people",
  customers: "customers",
  payments: "transactions",
  etims: "etims",
  vault: "documents",
  tenders: "documents"
};

export default async function BusinessPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawTab = Array.isArray(params?.tab) ? params?.tab[0] : params?.tab;
  return <CeterAdminWorkspace module={tabModules[rawTab ?? ""] ?? "sales"} />;
}
