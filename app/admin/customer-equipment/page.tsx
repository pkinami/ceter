import { ContractsPage, EquipmentPage } from "@/components/admin/ServicePages";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CustomerEquipmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = single(params?.tab) === "contracts" ? "contracts" : "equipment";
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Customer equipment and contracts">
        <a className={tab === "equipment" ? "active" : ""} href="/admin/customer-equipment">Equipment</a>
        <a className={tab === "contracts" ? "active" : ""} href="/admin/customer-equipment?tab=contracts">Contracts</a>
      </nav>
      {tab === "contracts" ? <ContractsPage /> : <EquipmentPage />}
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
