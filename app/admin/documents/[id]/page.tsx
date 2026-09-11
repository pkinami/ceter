import { DocumentsPage } from "@/components/admin/SalesBillingPages";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <DocumentsPage id={(await params).id} />;
}
