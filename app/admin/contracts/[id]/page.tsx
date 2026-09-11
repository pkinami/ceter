import { ContractsPage } from "@/components/admin/ServicePages";

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractsPage id={id} />;
}
