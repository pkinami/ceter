import { AdministrationPage } from "@/components/admin/AdministrationPages";

export default async function SalesTeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdministrationPage view="sales-team" id={(await params).id} />;
}
