import { TicketsPage } from "@/components/admin/ServicePages";

export default async function ServiceTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TicketsPage id={id} />;
}
