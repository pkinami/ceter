import { ContractsPage } from "@/components/admin/ServicePages";

export default async function ContractEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractsPage id={id} form />;
}
