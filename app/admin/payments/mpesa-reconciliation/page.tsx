import Link from "next/link";
import { Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { requireAdminSession } from "@/lib/admin/auth";
import { mpesaAdminMessage } from "@/lib/business/mpesa";
import { prisma } from "@/lib/prisma";
import { manualReconcileMpesaAction } from "./actions";

export default async function MpesaReconciliationPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const transactions = await prisma.mpesaTransaction.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: { customer: true, invoice: true, payment: { include: { receipt: true } } }
  });

  return (
    <>
      <PageHeader
        title="M-Pesa Reconciliation"
        copy="Invoice-level M-Pesa transactions. Receipts are generated only after verified or manually reconciled references."
        actions={<Link className="btn-lite" href="/admin/business#payments">Business payments</Link>}
      />
      {params.error ? <div className="business-message error">{params.error}</div> : null}
      {params.success ? <div className="business-message success">{params.success}</div> : null}
      <Table headers={["Date", "Customer", "Invoice", "Amount", "Transaction code", "Status", "Admin message", "Receipt", "Actions"]} minWidth={1380}>
        {transactions.map((transaction) => (
          <tr key={transaction.id}>
            <td>{transaction.created_at.toLocaleString("en-KE")}</td>
            <td>{transaction.customer.name}</td>
            <td>{transaction.invoice.invoice_number}</td>
            <td><Money value={transaction.amount} /></td>
            <td>{transaction.transaction_reference ?? transaction.checkout_request_id ?? "Pending"}</td>
            <td><Pill tone={transaction.payment_status === "completed" ? "green" : transaction.payment_status === "failed" ? "red" : "amber"}>{transaction.payment_status}</Pill></td>
            <td>{mpesaAdminMessage(transaction.payment_status, transaction.failure_reason)}</td>
            <td>{transaction.payment?.receipt?.receipt_number ?? "Not receipted"}</td>
            <td className="business-actions-cell">
              <details>
                <summary className="btn-lite">Callback</summary>
                <pre className="business-json">{JSON.stringify(transaction.callback_payload ?? {}, null, 2)}</pre>
              </details>
              {transaction.payment_status !== "completed" ? (
                <form action={manualReconcileMpesaAction} className="business-status-form">
                  <input type="hidden" name="id" value={transaction.id} />
                  <input className="admin-input" name="receipt_reference" placeholder="M-Pesa receipt code" />
                  <button className="btn-dark">Manual reconcile</button>
                </form>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
      {!transactions.length ? <div className="admin-card admin-empty"><strong>No M-Pesa transactions</strong><p>Invoice STK requests will appear here after they are initiated.</p></div> : null}
    </>
  );
}
