import { SalesDetailPage } from "@/components/admin/SalesBillingPages";

export default async function SalesDetailRoutePage({ params }: { params: Promise<{ id: string }> }) {
  return <SalesDetailPage id={(await params).id} />;
}
