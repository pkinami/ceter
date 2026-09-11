import { InstallationsPage } from "@/components/admin/ServicePages";

export default async function ServiceInstallationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <InstallationsPage id={id} />;
}
