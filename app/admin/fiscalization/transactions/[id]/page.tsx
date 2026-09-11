import { FiscalizationPage } from "@/components/admin/SalesBillingPages";

export default async function FiscalizationTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  return <FiscalizationPage view="transaction" id={(await params).id} />;
}
