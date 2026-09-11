import { MaintenancePage } from "@/components/admin/ServicePages";

export default async function ServiceMaintenanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MaintenancePage id={id} />;
}
