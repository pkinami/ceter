import { MpsPage } from "@/components/admin/ServicePages";

export default async function ServiceMpsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MpsPage id={id} />;
}
