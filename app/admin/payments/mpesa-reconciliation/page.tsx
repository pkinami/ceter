import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { mpesaAdminMessage } from "@/lib/business/mpesa";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
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
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Transactions</p>
          <h1>M-Pesa Reconciliation</h1>
          <span>Invoice-level M-Pesa transactions. Receipts are generated only after verified or manually reconciled references.</span>
        </div>
        <Link className="ceter-admin-secondary-button" href="/admin/business?tab=payments">Business payments</Link>
      </div>
      {params.error ? <div className="ceter-admin-message error">{params.error}</div> : null}
      {params.success ? <div className="ceter-admin-message success">{params.success}</div> : null}
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header">
          <div>
            <span>Detailed breakdown</span>
            <h2>Callback And Receipt Status</h2>
          </div>
        </div>
        {!transactions.length ? <div className="ceter-admin-empty">No M-Pesa transactions. Invoice STK requests will appear here after they are initiated.</div> : null}
        {transactions.length ? (
          <div className="ceter-admin-table-wrap">
            <table>
              <thead>
                <tr>
                  {["Date", "Customer", "Invoice", "Amount", "Transaction code", "Status", "Admin message", "Receipt", "Actions"].map((header) => <th key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.created_at.toLocaleString("en-KE")}</td>
                    <td>{transaction.customer.name}</td>
                    <td>{transaction.invoice.invoice_number}</td>
                    <td>{formatKes(transaction.amount)}</td>
                    <td>{transaction.transaction_reference ?? transaction.checkout_request_id ?? "Pending"}</td>
                    <td><span className={`ceter-admin-status ${transaction.payment_status === "completed" ? "green" : transaction.payment_status === "failed" ? "red" : "amber"}`}>{transaction.payment_status}</span></td>
                    <td>{mpesaAdminMessage(transaction.payment_status, transaction.failure_reason)}</td>
                    <td>{transaction.payment?.receipt?.receipt_number ?? "Not receipted"}</td>
                    <td>
                      <details className="ceter-admin-details">
                        <summary>Callback</summary>
                        <pre>{JSON.stringify(transaction.callback_payload ?? {}, null, 2)}</pre>
                      </details>
                      {transaction.payment_status !== "completed" ? (
                        <form action={manualReconcileMpesaAction} className="ceter-admin-inline-form">
                          <input type="hidden" name="id" value={transaction.id} />
                          <input name="receipt_reference" placeholder="M-Pesa receipt code" />
                          <button className="ceter-admin-primary-button">Manual reconcile</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>
    </div>
  );
}
