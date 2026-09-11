import { MeterReadingsPage } from "@/components/admin/ServicePages";

export default async function MeterReadingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MeterReadingsPage id={id} />;
}
