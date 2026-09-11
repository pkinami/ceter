import { AdministrationPage } from "@/components/admin/AdministrationPages";

export default async function ComplianceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdministrationPage view="compliance" id={(await params).id} />;
}
