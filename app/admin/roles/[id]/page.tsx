import { RolesPage } from "@/components/admin/AdministrationPages";

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <RolesPage id={(await params).id} />;
}
