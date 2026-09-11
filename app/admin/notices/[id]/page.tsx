import { AdministrationPage } from "@/components/admin/AdministrationPages";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <AdministrationPage view="notices" id={(await params).id} />;
}
