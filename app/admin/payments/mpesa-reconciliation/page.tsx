import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/auth";
import { mpesaAdminMessage } from "@/lib/business/mpesa";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { manualReconcileMpesaAction } from "./actions";

export default async function MpesaReconciliationPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireAdminSession();
  const params = await searchParams;
  const [transactions, etimsRecords, gatewayPayments] = await Promise.all([prisma.mpesaTransaction.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: { customer: true, invoice: true, payment: { include: { receipt: true } } }
  }),
  prisma.etimsRecord.findMany({ orderBy: { created_at: "desc" }, take: 80, include: { invoice: { include: { customer: true } }, logs: { orderBy: { created_at: "desc" }, take: 1 } } }),
  prisma.paymentTransaction.findMany({ orderBy: { created_at: "desc" }, take: 80, include: { order: { include: { customer: true } } } })
  ]);

  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Transactions</p>
          <h1>M-Pesa Reconciliation</h1>
          <span>Integration transaction status across M-Pesa, payment providers and eTIMS without exposing credentials or raw secret payloads.</span>
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
        {!transactions.length && !etimsRecords.length && !gatewayPayments.length ? <div className="ceter-admin-empty">No integration transactions have been recorded.</div> : null}
        {transactions.length || etimsRecords.length || gatewayPayments.length ? (
          <div className="ceter-admin-table-wrap">
            <table>
              <thead>
                <tr>
                  {["Date", "Source", "External Reference", "Internal Reference", "Type", "Customer", "Amount", "Status", "Retry / Error", "Related Record", "Actions"].map((header) => <th key={header}>{header}</th>)}
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.created_at.toLocaleString("en-KE")}</td>
                    <td>M-Pesa</td>
                    <td>{transaction.transaction_reference ?? transaction.checkout_request_id ?? "Pending"}</td>
                    <td>{transaction.payment?.payment_number ?? transaction.invoice.invoice_number}</td>
                    <td>Customer payment</td>
                    <td>{transaction.customer.name}</td>
                    <td>{formatKes(transaction.amount)}</td>
                    <td><span className={`ceter-admin-status ${transaction.payment_status === "completed" ? "green" : transaction.payment_status === "failed" ? "red" : "amber"}`}>{transaction.payment_status}</span></td>
                    <td>{mpesaAdminMessage(transaction.payment_status, transaction.failure_reason)}</td>
                    <td>{transaction.payment?.receipt?.receipt_number ?? "Not receipted"}</td>
                    <td>
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
                {gatewayPayments.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.created_at.toLocaleString("en-KE")}</td>
                    <td>{transaction.provider}</td>
                    <td>{transaction.provider_reference ?? transaction.checkout_request_id ?? transaction.merchant_reference}</td>
                    <td>{transaction.merchant_reference}</td>
                    <td>{transaction.method}</td>
                    <td>{transaction.order.customer?.name ?? transaction.order.delivery_name ?? "Storefront customer"}</td>
                    <td>{formatKes(transaction.amount_kes)}</td>
                    <td><span className={`ceter-admin-status ${transaction.status === "paid" ? "green" : transaction.status === "failed" ? "red" : "amber"}`}>{transaction.status}</span></td>
                    <td>{transaction.failure_reason ?? "Idempotent provider reference retained"}</td>
                    <td>{transaction.order.order_number}</td>
                    <td>-</td>
                  </tr>
                ))}
                {etimsRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.created_at.toLocaleString("en-KE")}</td>
                    <td>eTIMS</td>
                    <td>{record.external_invoice_id ?? record.control_number ?? "Not submitted"}</td>
                    <td>{record.invoice.invoice_number}</td>
                    <td>Tax invoice</td>
                    <td>{record.invoice.customer.name}</td>
                    <td>{formatKes(record.invoice.total_kes)}</td>
                    <td><span className={`ceter-admin-status ${record.status === "accepted" ? "green" : record.status === "failed" || record.status === "rejected" ? "red" : "amber"}`}>{record.status}</span></td>
                    <td>{record.last_error ?? record.logs[0]?.message ?? "Safe retry through eTIMS service"}</td>
                    <td>{record.invoice.invoice_number}</td>
                    <td>{record.retry_count.toLocaleString("en-KE")} retries</td>
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
