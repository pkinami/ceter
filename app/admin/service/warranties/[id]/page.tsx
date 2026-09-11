import { WarrantyPage } from "@/components/admin/ServicePages";

export default async function ServiceWarrantyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WarrantyPage id={id} />;
}
