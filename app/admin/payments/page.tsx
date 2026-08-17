import type { PaymentStatus } from "@prisma/client";
import { Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { getPayments, searchParam } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

const statuses: PaymentStatus[] = ["pending", "initiated", "processing", "paid", "failed", "cancelled"];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await requireAdminSession();
  const status = searchParam(params.status) as PaymentStatus | "all" | undefined;
  const payments = await getPayments(status ?? "all");
  return (
    <>
      <PageHeader title="Payments" copy="PaymentTransaction records for M-Pesa Daraja, Pesapal/card and Pay on Delivery providers. Secrets are never rendered." />
      <form className="admin-toolbar" action="/admin/payments">
        <label className="sr-only" htmlFor="payments-status-filter">Payment status filter</label>
        <select id="payments-status-filter" className="admin-input" name="status" autoComplete="off" defaultValue={status ?? "all"}>
          <option value="all">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="btn-dark">Filter</button>
      </form>
      <Table headers={["Transaction", "Provider", "Order", "Customer", "Amount", "Status", "Reference", "Date"]} minWidth={1040}>
        {payments.map((payment) => (
          <tr key={payment.id}>
            <td>{payment.id.slice(0, 8)}</td>
            <td>{payment.provider}<br /><span className="text-slate-500">{payment.method}</span></td>
            <td>{payment.order_id.slice(0, 8)}</td>
            <td>{payment.order.profile?.full_name ?? "Guest"}</td>
            <td><Money value={payment.amount_kes} /></td>
            <td><Pill tone={payment.status === "paid" ? "green" : payment.status === "failed" ? "red" : "amber"}>{payment.status}</Pill></td>
            <td>{payment.provider_reference ?? payment.checkout_request_id ?? payment.merchant_reference}</td>
            <td>{payment.created_at.toLocaleString("en-KE")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
