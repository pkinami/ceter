import { PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getAdminUsers } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function UsersPage() {
  await requireAdminSession();
  const users = await getAdminUsers();
  return (
    <>
      <PageHeader title="Users & Roles" copy="Admin access is server-protected through Supabase Auth profiles and role capabilities." />
      <Table headers={["Profile", "Role", "Phone", "Created", "Access"]}>
        {users.map((user) => (
          <tr key={user.id}>
            <td><strong>{user.full_name ?? user.id.slice(0, 8)}</strong><br /><span className="text-slate-500">{user.id}</span></td>
            <td>{user.role}</td>
            <td>{user.phone ?? "No phone"}</td>
            <td>{user.created_at.toLocaleDateString("en-KE")}</td>
            <td><Pill tone="green">Server authorized</Pill></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
