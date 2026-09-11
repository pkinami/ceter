import { WarrantyPage } from "@/components/admin/ServicePages";

export default async function WarrantyClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WarrantyPage claims id={id} />;
}
