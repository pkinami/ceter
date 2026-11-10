import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";
import { approveExpenseAction, createAccountAction, createAccountingPeriodAction, createAccountingReconciliationSnapshotAction, createCollectionCaseAction, createExpenseAction, createManualJournalAction, postAccountingSourceEventAction, reverseJournalAction } from "@/app/admin/accounting/actions";
import { getAccountingReconciliation, getPayablesAging, getReceivablesAging, getTrialBalance } from "@/lib/admin/accounting";

type ReportView =
  | "inventory" | "stock-movements" | "sales" | "sales-by-item" | "customers" | "customer-balances"
  | "debtors" | "creditors" | "collections" | "purchases" | "profit-loss" | "service-sla" | "mps"
  | "warranties" | "etims-tax" | "audit";

export async function TransactionsPage({ id, integrations = false }: { id?: string; integrations?: boolean }) {
  await requirePermission("accounting.transactions.view");
  const [transactions, payments, etims] = await Promise.all([
    prisma.transaction.findMany({ where: id ? { id } : undefined, include: { customer: true, invoice: true, payment: true, expense: true, supplier_invoice: true, supplier_payment: true }, orderBy: { created_at: "desc" }, take: 150 }),
    prisma.paymentTransaction.findMany({ orderBy: { created_at: "desc" }, take: integrations ? 100 : 20 }),
    prisma.etimsRecord.findMany({ orderBy: { created_at: "desc" }, take: integrations ? 100 : 20, include: { invoice: true } })
  ]);
  if (integrations) {
    return <Shell eyebrow="Transactions" title="Integration Transactions" subtitle="Real gateway and eTIMS records only; secret payloads remain redacted.">
      <Kpis items={[["Gateway records", payments.length], ["eTIMS records", etims.length], ["Feature flag", payments.length || etims.length ? "Enabled" : "No records"]]} />
      <Table columns={["Date", "Integration", "Reference", "Amount", "Status", "Source"]} rows={[
        ...payments.map((row) => [date(row.created_at), row.provider, row.provider_reference ?? row.merchant_reference, formatKes(row.amount_kes), <Badge key={row.id} value={row.status} />, row.order_id]),
        ...etims.map((row) => [date(row.created_at), row.provider_mode, row.external_invoice_id ?? row.original_invoice_reference ?? row.id.slice(0, 8), formatKes(row.invoice?.total_kes ?? 0), <Badge key={row.id} value={row.internal_state} />, row.invoice?.invoice_number ?? "-"])
      ]} empty="No integration transaction records exist." />
    </Shell>;
  }
  return <Shell eyebrow="Transactions" title={id ? "Transaction Detail" : "All Transactions"} subtitle="Aggregated operational transactions without duplicating invoices, payments or supplier records.">
    <Kpis items={[["Transactions", transactions.length], ["Payments", payments.length], ["Accounting source", "Existing records"], ["Secrets", "Redacted"]]} />
    <FilterBar placeholder="Search source, customer, reference or status..." />
    <Table columns={["Date", "Type", "Party", "Source", "Amount", "Direction", "Accounting", "Open"]} rows={transactions.map((row) => [
      date(row.created_at),
      label(row.transaction_type),
      row.customer?.name ?? row.supplier_invoice?.supplier_id ?? "-",
      row.invoice?.invoice_number ?? row.payment?.payment_number ?? row.expense?.expense_number ?? row.supplier_payment?.payment_number ?? row.id.slice(0, 8),
      formatKes(row.amount_kes),
      <Badge key={`${row.id}-d`} value={row.direction} />,
      row.expense?.accounting_status ?? "source",
      <Link key="a" href={`/admin/transactions/${row.id}`}>Open</Link>
    ])} empty="No transactions found." />
  </Shell>;
}

export async function ExpensesPage({ id, form = false, categories = false, recurring = false }: { id?: string; form?: boolean; categories?: boolean; recurring?: boolean }) {
  await requirePermission(categories ? "expenses.categories.manage" : recurring ? "expenses.recurring.manage" : form ? "expenses.create" : "expenses.view");
  const expenseCategories = await prisma.expenseCategory.findMany({ include: { _count: { select: { expenses: true } } }, orderBy: { name: "asc" }, take: 200 });
  if (form) return <Shell eyebrow="Expenses" title="New Expense" subtitle="Creates a draft expense only; approval, posting and payment remain separate."><ExpenseForm categories={expenseCategories} /></Shell>;
  if (categories) return <Shell eyebrow="Expenses" title="Expense Categories" subtitle="Expense categories keep finance-review account defaults and safe archive state.">
    <Kpis items={[["Categories", expenseCategories.length], ["Active", expenseCategories.filter((item) => item.is_active && !item.archived_at).length], ["Require approval", expenseCategories.filter((item) => item.approval_required).length]]} />
    <Table columns={["Name", "Code", "Default account", "Tax", "Approval", "Expenses", "Status"]} rows={expenseCategories.map((item) => [item.name, item.code ?? "-", item.default_account_id?.slice(0, 8) ?? "Unmapped", item.default_tax_treatment ?? "Review", item.approval_required ? "Required" : "Standard", item._count.expenses, <Badge key={item.id} value={item.archived_at ? "archived" : item.is_active ? "active" : "inactive"} />])} empty="No expense categories found." />
  </Shell>;
  if (recurring) {
    const schedules = await prisma.recurringExpenseSchedule.findMany({ include: { category: true }, orderBy: { next_run_at: "asc" }, take: 100 });
    return <Shell eyebrow="Expenses" title={id ? "Recurring Expense Detail" : "Recurring Expenses"} subtitle="Feature-flagged draft generation; schedules never create approved or paid expenses automatically.">
      <Kpis items={[["Schedules", schedules.length], ["Active", schedules.filter((item) => item.status === "active").length], ["Next due", schedules[0]?.next_run_at ? date(schedules[0].next_run_at) : "None"]]} />
      <Table columns={["Schedule", "Payee", "Category", "Amount", "Frequency", "Next generation", "Status"]} rows={schedules.map((item) => [item.schedule_number ?? item.name, item.payee ?? item.supplier ?? "-", item.category?.name ?? "Uncategorised", formatKes(item.amount_kes), item.frequency, date(item.next_run_at), <Badge key={item.id} value={item.status} />])} empty="No recurring expense schedules found." />
    </Shell>;
  }
  const expenses = await prisma.expense.findMany({ where: id ? { id } : undefined, include: { category: true, journal_entries: true, documents: true }, orderBy: { expense_date: "desc" }, take: 100 });
  return <Shell eyebrow="Expenses" title={id ? expenses[0]?.expense_number ?? "Expense Detail" : "Expense List"} subtitle="Expense approval, accounting posting and payment status are independent.">
    <Kpis items={[["Expenses", expenses.length], ["Draft", expenses.filter((item) => item.status === "draft").length], ["Approved", expenses.filter((item) => item.status === "approved").length], ["Unposted", expenses.filter((item) => item.accounting_status !== "posted").length]]} />
    <FilterBar placeholder="Search payee, category, reference or status..." />
    <Table columns={["Expense", "Date", "Payee", "Category", "Gross", "Payment", "Accounting", "Actions"]} rows={expenses.map((item) => [
      item.expense_number,
      date(item.expense_date),
      item.payee ?? item.supplier ?? "-",
      item.category.name,
      formatKes(item.gross_amount ? Number(item.gross_amount) : item.amount_kes),
      <Badge key={`${item.id}-p`} value={item.payment_status} />,
      <Badge key={`${item.id}-a`} value={item.accounting_status} />,
      <AdminActionMenu key="a" label={`Actions for expense ${item.expense_number}`}><Link href={`/admin/expenses/${item.id}`}>Open</Link><ApproveExpense id={item.id} /></AdminActionMenu>
    ])} empty="No expenses found." />
  </Shell>;
}

export async function AccountingPage({ view, id, form = false }: { view: "dashboard" | "accounts" | "journals" | "ledger" | "trial" | "balance" | "profit" | "cashflow" | "debtors" | "creditors" | "collections" | "periods" | "rules" | "reconciliation"; id?: string; form?: boolean }) {
  await requirePermission(view === "debtors" ? "accounting.debtors.view" : view === "creditors" ? "accounting.creditors.view" : view === "collections" ? "accounting.collections.manage" : "accounting.view");
  if (view === "debtors") return <Debtors />;
  if (view === "creditors") return <Creditors />;
  if (view === "collections") return <Collections />;
  if (view === "trial") return <TrialBalance />;
  if (view === "reconciliation") return <Reconciliation />;
  const [accounts, journals, periods, rules] = await Promise.all([
    prisma.account.findMany({ where: id && view === "accounts" ? { id } : undefined, include: { lines: true }, orderBy: { code: "asc" }, take: 200 }),
    prisma.journalEntry.findMany({ where: id && view === "journals" ? { id } : undefined, include: { lines: { include: { account: true } } }, orderBy: { entry_date: "desc" }, take: 100 }),
    prisma.accountingPeriod.findMany({ orderBy: { start_date: "desc" }, take: 60 }),
    prisma.accountingPostingRule.findMany({ orderBy: [{ rule_key: "asc" }, { version: "desc" }], take: 100 })
  ]);
  if (form && view === "accounts") return <Shell eyebrow="Accounting" title="New Account" subtitle="Creates a finance-review draft account without opening balances."><AccountForm accounts={accounts} /></Shell>;
  if (form && view === "journals") return <Shell eyebrow="Accounting" title="New Manual Journal" subtitle="Balanced, posted manual journal with period-lock validation."><JournalForm accounts={accounts} /></Shell>;
  if (view === "accounts") return <Shell eyebrow="Accounting" title={id ? accounts[0]?.code ?? "Account Detail" : "Chart of Accounts"} subtitle="Draft configurable chart; opening balances and production mappings require finance review." action={<Link className="ceter-admin-primary-button" href="/admin/accounting/chart-of-accounts/new">New account</Link>}>
    <Kpis items={[["Accounts", accounts.length], ["Posting accounts", accounts.filter((a) => a.is_posting_account).length], ["Review required", accounts.filter((a) => a.finance_review_status.includes("review")).length], ["Opening balances", "Not fabricated"]]} />
    <Table columns={["Code", "Name", "Class", "Subtype", "Posting", "Review", "Status", "Open"]} rows={accounts.map((a) => [a.code, a.name, label(a.type), a.subtype ?? "-", a.is_posting_account ? "Yes" : "Header", a.finance_review_status, <Badge key={a.id} value={a.archived_at ? "archived" : a.is_active ? "active" : "inactive"} />, <Link key="a" href={`/admin/accounting/chart-of-accounts/${a.id}`}>Open</Link>])} empty="No chart of account records." />
  </Shell>;
  if (view === "journals") return <Shell eyebrow="Accounting" title={id ? journals[0]?.entry_number ?? "Journal Detail" : "Journal Entries"} subtitle="Posted journals are immutable; corrections use linked reversals." action={<Link className="ceter-admin-primary-button" href="/admin/accounting/journals/new">New journal</Link>}>
    <Kpis items={[["Journals", journals.length], ["Posted", journals.filter((j) => j.status === "posted").length], ["Reversed", journals.filter((j) => j.status === "reversed").length], ["Lines", journals.reduce((s, j) => s + j.lines.length, 0)]]} />
    <Table columns={["Journal", "Date", "Source", "Debit", "Credit", "Status", "Actions"]} rows={journals.map((j) => [j.entry_number, date(j.entry_date), label(j.source_type), formatMoney(j.total_debit), formatMoney(j.total_credit), <Badge key={j.id} value={j.status} />, <AdminActionMenu key="a" label={`Actions for journal ${j.entry_number}`}><Link href={`/admin/accounting/journals/${j.id}`}>Open</Link><ReverseJournal id={j.id} /></AdminActionMenu>])} empty="No journal entries found." />
  </Shell>;
  if (view === "periods") return <Shell eyebrow="Accounting" title="Accounting Periods" subtitle="Posting dates must fall in an open period; locked periods reject postings."><PeriodForm /><Table columns={["Fiscal year", "Period", "Start", "End", "Status", "Reason"]} rows={periods.map((p) => [p.fiscal_year, p.period_name, date(p.start_date), date(p.end_date), <Badge key={p.id} value={p.status} />, p.reason ?? "-"])} empty="No accounting periods configured." /></Shell>;
  if (view === "rules") return <Shell eyebrow="Accounting" title="Posting Rules" subtitle="Rules are versioned and require finance activation; missing mappings queue source events instead of suspense posting."><Table columns={["Rule", "Event", "Version", "Status", "Activated", "Preview"]} rows={rules.map((r) => [r.rule_key, r.source_event_type, r.version, <Badge key={r.id} value={r.status} />, r.activated_at ? date(r.activated_at) : "Not active", r.preview_snapshot ? "Available" : "Required"])} empty="No posting rules configured." /></Shell>;
  return <FinancialStatement view={view} accounts={accounts} journals={journals} />;
}

export async function ReportPage({ view }: { view: ReportView }) {
  await requirePermission(view === "audit" ? "reports.audit.view" : view.includes("profit") || view === "etims-tax" ? "reports.financial.view" : "reports.operational.view");
  const reconciliation = await getAccountingReconciliation();
  const title = label(view);
  return <Shell eyebrow="Reports" title={title} subtitle="Authoritative report surface with filters, drill-down and unresolved-event warnings where applicable.">
    <Kpis items={[["Generated", dateTime(new Date())], ["Unposted events", reconciliation.unpostedEvents], ["Mapping exceptions", reconciliation.mappingExceptions], ["Export audit", "Required"]]} />
    <FilterBar placeholder={`Search ${title.toLowerCase()} report...`} />
    <ReportTable view={view} />
  </Shell>;
}

async function Debtors() {
  const rows = await getReceivablesAging();
  return <Shell eyebrow="Accounting" title="Debtors" subtitle="Customer aging uses invoice due dates and real payment allocations.">
    <Kpis items={[["Customers", rows.length], ["Outstanding", formatKes(rows.reduce((s, r) => s + r.total, 0))], ["Over 90", formatKes(rows.reduce((s, r) => s + r.buckets.over_90, 0))]]} />
    <Table columns={["Customer", "Total", "Current", "1-30", "31-60", "61-90", "Over 90", "Last payment"]} rows={rows.map((r) => [r.customer.name, formatKes(r.total), formatKes(r.buckets.current), formatKes(r.buckets.b1_30), formatKes(r.buckets.b31_60), formatKes(r.buckets.b61_90), formatKes(r.buckets.over_90), r.lastPayment ? date(r.lastPayment) : "-"])} empty="No debtor balances." />
  </Shell>;
}

async function Creditors() {
  const rows = await getPayablesAging();
  return <Shell eyebrow="Accounting" title="Creditors" subtitle="Supplier aging uses supplier invoice due dates and supplier payment allocations.">
    <Kpis items={[["Suppliers", rows.length], ["Outstanding", formatKes(rows.reduce((s, r) => s + r.total, 0))], ["Over 90", formatKes(rows.reduce((s, r) => s + r.buckets.over_90, 0))]]} />
    <Table columns={["Supplier", "Total", "Current", "1-30", "31-60", "61-90", "Over 90", "Last payment"]} rows={rows.map((r) => [r.supplier.company_name, formatKes(r.total), formatKes(r.buckets.current), formatKes(r.buckets.b1_30), formatKes(r.buckets.b31_60), formatKes(r.buckets.b61_90), formatKes(r.buckets.over_90), r.lastPayment ? date(r.lastPayment) : "-"])} empty="No creditor balances." />
  </Shell>;
}

async function Collections() {
  const [cases, invoices] = await Promise.all([
    prisma.collectionCase.findMany({ orderBy: { updated_at: "desc" }, take: 100 }),
    prisma.invoice.findMany({ where: { balance_kes: { gt: 0 } }, include: { customer: true }, orderBy: { due_date: "asc" }, take: 100 })
  ]);
  return <Shell eyebrow="Accounting" title="Collections" subtitle="Promises to pay are tracked separately from actual payment allocations.">
    <Kpis items={[["Cases", cases.length], ["Open", cases.filter((c) => !["paid", "closed"].includes(c.status)).length], ["Outstanding invoices", invoices.length]]} />
    <CollectionForm invoices={invoices} />
    <Table columns={["Case", "Customer", "Invoice", "Outstanding", "Bucket", "Promise", "Status"]} rows={cases.map((c) => [c.case_number, c.customer_id.slice(0, 8), c.invoice_id?.slice(0, 8) ?? "-", formatMoney(c.outstanding_amount), c.aging_bucket, c.promised_amount ? formatMoney(c.promised_amount) : "-", <Badge key={c.id} value={c.status} />])} empty="No collection cases." />
  </Shell>;
}

async function TrialBalance() {
  const trial = await getTrialBalance();
  return <Shell eyebrow="Accounting" title="Trial Balance" subtitle="Derived from posted journals only; no artificial balancing values.">
    <Kpis items={[["Total debits", formatMoney(trial.totalDebit)], ["Total credits", formatMoney(trial.totalCredit)], ["Difference", formatMoney(trial.difference)]]} />
    <Table columns={["Code", "Account", "Debit", "Credit", "Balance"]} rows={trial.rows.map((r) => [r.account.code, r.account.name, formatMoney(r.debit), formatMoney(r.credit), formatMoney(r.balance)])} empty="No posted journal lines." />
  </Shell>;
}

async function Reconciliation() {
  const data = await getAccountingReconciliation();
  return <Shell eyebrow="Accounting" title="Accounting Reconciliation" subtitle="Differences are exposed for investigation; this page does not create balancing journals.">
    <Kpis items={[["Journal debits", formatMoney(data.journalDebit)], ["Journal credits", formatMoney(data.journalCredit)], ["Trial difference", formatMoney(data.trialDifference)], ["Unposted events", data.unpostedEvents], ["Mapping exceptions", data.mappingExceptions], ["Failed", data.failedPostings]]} />
    <ReconciliationSnapshotForm />
    <Table columns={["Area", "Source total", "Ledger total", "Difference", "Exception"]} rows={[
      ["Source events", data.sourceEvents.length, "-", "-", `${data.unpostedEvents} unposted`],
      ["Accounts receivable", formatKes(data.debtorTotal), "Requires control mapping", "Review", "Opening balances not fabricated"],
      ["Accounts payable", formatKes(data.creditorTotal), "Requires control mapping", "Review", "Supplier mappings pending"],
      ["Expenses", formatKes(data.unpostedExpenseTotal), "Posted journals only", "Review", "Unposted expenses excluded from statements"]
    ]} empty="No reconciliation rows." />
    <Table columns={["Event", "Source", "Amount", "Tax", "Status", "Rule", "Error", "Action"]} rows={data.sourceEvents.map((event) => [
      event.event_type,
      `${event.source_type}:${event.source_id.slice(0, 12)}`,
      formatMoney(event.amount),
      formatMoney(event.tax_amount),
      <Badge key={event.id} value={event.status} />,
      event.posting_rule_key ? `${event.posting_rule_key} v${event.posting_rule_version ?? "-"}` : "Mapping review",
      event.error_message ?? "-",
      event.status === "posted" ? "Posted" : <PostSourceEvent key={event.id} id={event.id} />
    ])} empty="No accounting source events queued." />
  </Shell>;
}

function FinancialStatement({ view, accounts, journals }: { view: string; accounts: Array<{ type: string; lines: unknown[] }>; journals: Array<{ status: string }> }) {
  const message = view === "balance" ? "Balance sheet requires approved opening balances; none are fabricated." : view === "cashflow" ? "Cashflow requires configured cashflow mappings." : view === "profit" ? "Profit and loss is derived from posted income and expense journals." : "General ledger is derived from posted journal lines.";
  return <Shell eyebrow="Accounting" title={label(view)} subtitle={message}>
    <Kpis items={[["Accounts", accounts.length], ["Posted journals", journals.filter((j) => j.status === "posted").length], ["Business-data blocker", view === "balance" ? "Opening balances" : view === "cashflow" ? "Cashflow mappings" : "None hidden"]]} />
    <Table columns={["Section", "Basis", "Status", "Drill-down"]} rows={accounts.slice(0, 80).map((a) => [label(a.type), `${a.lines.length} lines`, "Posted journals only", "Open account"])} empty="No financial-statement data." />
  </Shell>;
}

async function ReportTable({ view }: { view: ReportView }) {
  if (view === "stock-movements") {
    const rows = await prisma.inventoryMovement.findMany({ include: { product: true, location: true }, orderBy: { created_at: "desc" }, take: 100 });
    return <Table columns={["Date", "Product", "Location", "Type", "Quantity", "Source", "Correlation"]} rows={rows.map((r) => [date(r.created_at), r.product.name, r.location?.name ?? "-", label(r.movement_type), String(r.quantity), r.source_document_type, r.correlation_id ?? "-"])} empty="No stock movements." />;
  }
  if (view === "inventory") {
    const rows = await prisma.inventoryBalance.findMany({ include: { product: true, location: true }, orderBy: { updated_at: "desc" }, take: 100 });
    return <Table columns={["Product", "SKU", "Location", "On hand", "Reserved", "Available", "Status"]} rows={rows.map((r) => [r.product.name, r.product.sku ?? "-", r.location.name, String(r.on_hand_quantity), String(r.reserved_quantity), String(r.available_quantity), r.available_quantity.gt(0) ? "Available" : "Review"])} empty="No inventory balances." />;
  }
  if (view === "audit") {
    const rows = await prisma.auditLog.findMany({ orderBy: { created_at: "desc" }, take: 100 });
    return <Table columns={["Date", "User", "Action", "Target", "Outcome", "Correlation"]} rows={rows.map((r) => [date(r.created_at), r.user_id?.slice(0, 8) ?? "system", r.action, `${r.entity}:${r.entity_id.slice(0, 8)}`, "recorded", "-"])} empty="No audit events." />;
  }
  const rows = await prisma.invoice.findMany({ include: { customer: true, items: true }, orderBy: { created_at: "desc" }, take: 100 });
  return <Table columns={["Record", "Customer", "Date", "Net", "Tax", "Gross", "Status"]} rows={rows.map((r) => [r.invoice_number, r.customer.name, date(r.created_at), formatKes(r.subtotal_kes), formatKes(r.vat_kes), formatKes(r.total_kes), <Badge key={r.id} value={r.status} />])} empty={`No ${label(view).toLowerCase()} report rows.`} />;
}

function ExpenseForm({ categories }: { categories: Array<{ id: string; name: string }> }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><form className="ceter-admin-form" action={createExpenseAction}><Select name="category_id" labelText="Category *" items={categories} /><label>Payee<input name="payee" /></label><label>Date<input name="expense_date" type="date" /></label><label>Currency<input name="currency" defaultValue="KES" /></label><label>Net<input name="net_amount" type="number" min="0" step="0.01" /></label><label>Tax<input name="tax_amount" type="number" min="0" step="0.01" /></label><label>Gross *<input name="gross_amount" type="number" min="0.01" step="0.01" required /></label><label>Method<select name="method"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mpesa">M-Pesa</option><option value="card">Card</option></select></label><label>Transaction reference<input name="transaction_reference" /></label><label className="wide">Notes<textarea name="notes" /></label><Actions href="/admin/expenses" labelText="Save draft expense" /></form></article>;
}

function AccountForm({ accounts }: { accounts: Array<{ id: string; code: string; name: string }> }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><form className="ceter-admin-form" action={createAccountAction}><label>Code *<input name="code" required /></label><label>Name *<input name="name" required /></label><label>Class<select name="type"><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="income">Revenue</option><option value="expense">Expense</option></select></label><label>Subtype<input name="subtype" /></label><Select name="parent_account_id" labelText="Parent" items={accounts.map((a) => ({ id: a.id, name: `${a.code} ${a.name}` }))} optional /><label>Normal balance<select name="normal_balance"><option value="debit">Debit</option><option value="credit">Credit</option></select></label><label>Posting<select name="is_posting_account"><option value="true">Posting account</option><option value="false">Header account</option></select></label><label className="wide">Description<textarea name="description" /></label><Actions href="/admin/accounting/chart-of-accounts" labelText="Create account" /></form></article>;
}

function JournalForm({ accounts }: { accounts: Array<{ id: string; code: string; name: string; is_posting_account: boolean }> }) {
  const posting = accounts.filter((a) => a.is_posting_account);
  return <article className="ceter-admin-panel ceter-admin-form-panel"><form className="ceter-admin-form" action={createManualJournalAction}><label>Date<input name="entry_date" type="date" /></label><label>Reference<input name="reference" /></label><label className="wide">Memo<textarea name="memo" required /></label>{[0, 1].map((index) => <div key={index} className="ceter-admin-form-row wide"><Select name="account_id" labelText={`Line ${index + 1} account`} items={posting.map((a) => ({ id: a.id, name: `${a.code} ${a.name}` }))} /><label>Direction<select name="direction" defaultValue={index === 0 ? "debit" : "credit"}><option value="debit">Debit</option><option value="credit">Credit</option></select></label><label>Amount<input name="amount" type="number" min="0.01" step="0.01" required /></label><label>Line memo<input name="line_memo" /></label></div>)}<input type="hidden" name="idempotency_key" value={`manual-${Date.now()}`} /><Actions href="/admin/accounting/journals" labelText="Post journal" /></form></article>;
}

function PeriodForm() {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><form className="ceter-admin-form" action={createAccountingPeriodAction}><label>Fiscal year *<input name="fiscal_year" required placeholder="Finance reviewed" /></label><label>Period name *<input name="period_name" required /></label><label>Start *<input name="start_date" type="date" required /></label><label>End *<input name="end_date" type="date" required /></label><button className="ceter-admin-secondary-button">Create period</button></form></article>;
}

function CollectionForm({ invoices }: { invoices: Array<{ id: string; invoice_number: string; balance_kes: number; customer: { name: string } }> }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><form className="ceter-admin-form" action={createCollectionCaseAction}><Select name="invoice_id" labelText="Outstanding invoice" items={invoices.map((i) => ({ id: i.id, name: `${i.invoice_number} - ${i.customer.name} - ${formatKes(i.balance_kes)}` }))} /><label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option><option value="escalated">Escalated</option></select></label><button className="ceter-admin-secondary-button">Create collection case</button></form></article>;
}

function ApproveExpense({ id }: { id: string }) {
  return <form action={approveExpenseAction} className="ceter-admin-inline-form"><input type="hidden" name="expense_id" value={id} /><input type="hidden" name="return_to" value="/admin/expenses" /><button className="ceter-admin-secondary-button">Approve</button></form>;
}

function ReverseJournal({ id }: { id: string }) {
  return <form action={reverseJournalAction} className="ceter-admin-inline-form"><input type="hidden" name="journal_id" value={id} /><input name="reason" placeholder="Reason" /><input type="hidden" name="return_to" value="/admin/accounting/journals" /><button className="ceter-admin-secondary-button">Reverse</button></form>;
}

function PostSourceEvent({ id }: { id: string }) {
  return <form action={postAccountingSourceEventAction} className="ceter-admin-inline-form"><input type="hidden" name="event_id" value={id} /><input name="reason" placeholder="Posting reason" required /><button className="ceter-admin-secondary-button">Post mapped event</button></form>;
}

function ReconciliationSnapshotForm() {
  return <form action={createAccountingReconciliationSnapshotAction} className="ceter-admin-filter-bar"><input type="hidden" name="reconciliation_type" value="accounting_reconciliation" /><span>Record a non-mutating reconciliation snapshot for finance review.</span><button className="ceter-admin-secondary-button">Record snapshot</button></form>;
}

function Shell({ eyebrow, title, action, children }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="ceter-admin-page"><div className="ceter-admin-greeting"><div><p>{eyebrow}</p><h1>{title}</h1></div>{action}</div>{children}</div>;
}

function Kpis({ items }: { items: Array<[string, React.ReactNode]> }) {
  return <section className="ceter-admin-kpis">{items.map(([labelText, value]) => <article key={labelText} className="ceter-admin-kpi"><span>{labelText}</span><strong>{value}</strong></article>)}</section>;
}

function FilterBar({ placeholder }: { placeholder: string }) {
  return <form className="ceter-admin-filter-bar"><input name="q" placeholder={placeholder} /><select name="status"><option value="">All statuses</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="open">Open</option><option value="closed">Closed</option></select><input type="date" name="from" /><input type="date" name="to" /><button className="ceter-admin-secondary-button">Search</button></form>;
}

function Table({ title = "Records", columns, rows, empty }: { title?: string; columns: string[]; rows: React.ReactNode[][]; empty: string }) {
  return <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Records</span><h2>{title}</h2></div><a className="ceter-admin-secondary-button" href="/api/admin/exports?kind=reports">Export CSV</a></div><div className="ceter-admin-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="ceter-admin-empty">{empty}<br /><button className="ceter-admin-secondary-button">Retry</button></div></td></tr>}</tbody></table></div></article>;
}

function Select({ name, labelText, items, optional = false }: { name: string; labelText: string; items: Array<{ id: string; name: string }>; optional?: boolean }) {
  return <label>{labelText}<select name={name} required={!optional}>{optional ? <option value="">Not selected</option> : null}{items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;
}

function Actions({ href, labelText }: { href: string; labelText: string }) {
  return <div className="ceter-admin-form-actions"><Link className="ceter-admin-secondary-button" href={href}>Cancel</Link><button className="ceter-admin-primary-button">{labelText}</button></div>;
}

function Badge({ value }: { value: string }) {
  const tone = /posted|paid|active|open|accepted|balanced/.test(value) ? "green" : /failed|locked|cancel|reject|over/.test(value) ? "red" : "amber";
  return <span className={`ceter-admin-status ${tone}`}>{label(value)}</span>;
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatMoney(value: { toString(): string } | number) {
  return `KES ${Number(value).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
