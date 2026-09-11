import { UsersPage } from "@/components/admin/AdministrationPages";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return <UsersPage view="list" id={(await params).id} />;
}
