import { ServiceReportsPage } from "@/components/admin/ServicePages";

export default async function ServiceReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ServiceReportsPage id={id} />;
}
