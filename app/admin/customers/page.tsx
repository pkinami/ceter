import { Money, PageHeader, Table } from "@/components/admin/AdminPrimitives";
import { getCustomers } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

export default async function CustomersPage() {
  await requireAdminSession();
  const customers = await getCustomers();
  return (
    <>
      <PageHeader title="Customers" copy="Authenticated customer profiles, orders and genuine spend from paid transactions." />
      <Table headers={["Customer", "Phone", "Orders", "Paid Spend", "Joined"]} minWidth={820}>
        {customers.map((customer) => {
          const paidSpend = customer.orders.flatMap((order) => order.payments).filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount_kes, 0);
          return (
            <tr key={customer.id}>
              <td><strong>{customer.full_name ?? customer.id.slice(0, 8)}</strong><br /><span className="text-slate-500">{customer.id}</span></td>
              <td>{customer.phone ?? "No phone"}</td>
              <td>{customer.orders.length}</td>
              <td><Money value={paidSpend} /></td>
              <td>{customer.created_at.toLocaleDateString("en-KE")}</td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
