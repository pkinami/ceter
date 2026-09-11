import { EquipmentPage } from "@/components/admin/ServicePages";

export default async function CustomerEquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentPage id={id} />;
}
