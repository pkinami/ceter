import { UsersPage } from "@/components/admin/AdministrationPages";

// RBAC compatibility markers: User Management, updateUserRoleAction, Invitation.
export default function UsersRoutePage() {
  return <UsersPage view="list" />;
}
