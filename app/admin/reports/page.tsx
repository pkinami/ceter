import { ReportPage } from "@/components/admin/AccountingPages";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const reportTabs = [
  { key: "sales", label: "Sales Reports", view: "sales" },
  { key: "stock", label: "Stock Reports", view: "inventory" },
  { key: "customers", label: "Customer Reports", view: "customers" },
  { key: "finance", label: "Finance Reports", view: "profit-loss" }
] as const;

export default async function ReportsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const active = reportTabs.find((tab) => tab.key === single(params?.tab)) ?? reportTabs[0];
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Reports">
        {reportTabs.map((tab) => (
          <a key={tab.key} className={active.key === tab.key ? "active" : ""} href={`/admin/reports?tab=${tab.key}`}>
            {tab.label}
          </a>
        ))}
      </nav>
      <ReportPage view={active.view} />
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
