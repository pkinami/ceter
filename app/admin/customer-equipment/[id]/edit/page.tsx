import { EquipmentPage } from "@/components/admin/ServicePages";

export default async function CustomerEquipmentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EquipmentPage id={id} form />;
}
