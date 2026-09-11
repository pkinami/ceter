import { AdministrationPage } from "@/components/admin/AdministrationPages";

export default async function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdministrationPage view="branches" id={(await params).id} />;
}
