import { CustomerDetailPage } from "@/components/admin/SalesBillingPages";

export default async function CustomerDetailRoutePage({ params }: { params: Promise<{ id: string }> }) {
  return <CustomerDetailPage id={(await params).id} />;
}
