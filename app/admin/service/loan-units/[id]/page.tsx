import { LoanUnitsPage } from "@/components/admin/ServicePages";

export default async function LoanUnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LoanUnitsPage id={id} />;
}
