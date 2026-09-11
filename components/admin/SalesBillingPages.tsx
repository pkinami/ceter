import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { allocatePaymentAction, cancelOrderReservationAction, confirmOrderReservationAction, createDeliveryAction, fulfillOrderAction, reversePaymentAction } from "@/app/admin/sales/actions";
import { generateCustomerStatementAction, upsertCustomerAction, upsertCustomerCategoryAction } from "@/app/admin/business/actions";
import { AdminActionMenu } from "@/components/admin/AdminActionMenu";

export async function CustomersPage() {
  await requirePermission("customers.view");
  const [customers, categories] = await Promise.all([
    prisma.customer.findMany({ where: { archived_at: null }, include: { category: true, invoices: true, payments: true, receipts: true, orders: true }, orderBy: { updated_at: "desc" }, take: 100 }),
    prisma.customerCategory.findMany({ where: { archived_at: null }, include: { _count: { select: { customers: true } } }, orderBy: { name: "asc" } })
  ]);
  return <PageShell eyebrow="Customers" title="Customer Accounts" subtitle="Authoritative customer records shared by storefront, sales, invoices, payments and statements." action={<Link className="ceter-admin-primary-button" href="/admin/customers/new">New customer</Link>}>
    <Kpis items={[
      ["Active customers", customers.length],
      ["Categories", categories.length],
      ["Outstanding", formatKes(customers.reduce((sum, customer) => sum + customer.invoices.reduce((s, invoice) => s + invoice.balance_kes, 0), 0))],
      ["Receipts", customers.reduce((sum, customer) => sum + customer.receipts.length, 0)]
    ]} />
    <FilterBar action="/admin/customers" placeholder="Search customer number, name, email or phone..." />
    <Table columns={["Customer", "Type", "Category", "Contact", "Sales", "Outstanding", "Status", "Actions"]} rows={customers.map((customer) => [
      <Cell key="c" title={customer.customer_number ?? customer.id.slice(0, 8)} note={customer.name} />,
      label(customer.customer_type),
      customer.category?.name ?? "Uncategorised",
      customer.email ?? customer.phone ?? "Walk-in / not supplied",
      customer.orders.length + customer.invoices.length,
      formatKes(customer.invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0)),
      <Badge key="s" value={customer.archived_at ? "archived" : "active"} />,
      <AdminActionMenu key="a" label={`Actions for ${customer.name}`}><Link href={`/admin/customers/${customer.id}`}>View</Link><Link href={`/admin/customers/${customer.id}/edit`}>Edit</Link><Statement customerId={customer.id} /></AdminActionMenu>
    ])} empty="No customer accounts found." />
  </PageShell>;
}

export async function CustomerFormPage({ customerId }: { customerId?: string }) {
  await requirePermission(customerId ? "customers.update" : "customers.create");
  const [customer, categories] = await Promise.all([
    customerId ? prisma.customer.findUnique({ where: { id: customerId }, include: { addresses: true } }) : null,
    prisma.customerCategory.findMany({ where: { archived_at: null }, orderBy: { name: "asc" } })
  ]);
  return <PageShell eyebrow="Customers" title={customer ? `Edit ${customer.name}` : "New Customer"} subtitle="Email and telephone are optional; possible duplicates are reviewed instead of auto-merged.">
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <form className="ceter-admin-form" action={upsertCustomerAction}>
        <input type="hidden" name="return_to" value="/admin/customers" />
        {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
        <label>Customer name *<input name="name" required defaultValue={customer?.name ?? ""} /></label>
        <label>Company name<input name="company_name" defaultValue={customer?.company_name ?? ""} /></label>
        <label>Customer type<select name="customer_type" defaultValue={customer?.customer_type ?? "individual"}>{["individual", "business", "government", "ngo"].map((item) => <option key={item} value={item}>{label(item)}</option>)}</select></label>
        <label>Category<select name="category_id" defaultValue={customer?.category_id ?? ""}><option value="">Uncategorised</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Email<input type="email" name="email" defaultValue={customer?.email ?? ""} /></label>
        <label>Telephone<input name="phone" defaultValue={customer?.phone ?? ""} /></label>
        <label>KRA PIN<input name="tax_pin" defaultValue={customer?.tax_pin ?? ""} /></label>
        <label className="wide">Address<input name="address_line_1" defaultValue={customer?.addresses[0]?.address_line_1 ?? ""} /></label>
        <label className="wide">Internal notes<textarea name="notes" defaultValue={customer?.notes ?? ""} /></label>
        <div className="ceter-admin-form-actions"><Link className="ceter-admin-secondary-button" href="/admin/customers">Cancel</Link><button className="ceter-admin-primary-button">Save customer</button></div>
      </form>
    </article>
  </PageShell>;
}

export async function CustomerDetailPage({ id }: { id: string }) {
  await requirePermission("customers.view");
  const customer = await prisma.customer.findUnique({ where: { id }, include: { category: true, addresses: true, quotes: true, invoices: true, payments: true, receipts: true, orders: true, documents: true } });
  if (!customer) return <Missing title="Customer not found" />;
  return <PageShell eyebrow="Customers / Detail" title={customer.customer_number ?? customer.name} subtitle={customer.name} action={<Link className="ceter-admin-primary-button" href={`/admin/customers/${customer.id}/edit`}>Edit</Link>}>
    <Kpis items={[["Outstanding", formatKes(customer.invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0))], ["Orders", customer.orders.length], ["Invoices", customer.invoices.length], ["Documents", customer.documents.length]]} />
    <Tabs tabs={["Overview", "Quotations", "Sales orders", "Invoices", "Payments", "Receipts", "Deliveries", "Documents", "Activity"]} />
    <Table columns={["Record", "Date", "Amount", "Status"]} rows={customer.invoices.map((invoice) => [invoice.invoice_number, date(invoice.created_at), formatKes(invoice.total_kes), <Badge key={invoice.id} value={invoice.status} />])} empty="No invoice history." />
  </PageShell>;
}

export async function CustomerCategoriesPage() {
  await requirePermission("customers.categories.manage");
  const categories = await prisma.customerCategory.findMany({ include: { _count: { select: { customers: true } } }, orderBy: { name: "asc" } });
  return <PageShell eyebrow="Customers" title="Customer Categories" subtitle="Segment customer accounts and archive only after safe reassignment.">
    <Kpis items={[["Categories", categories.length], ["Active", categories.filter((item) => item.is_active && !item.archived_at).length], ["Archived", categories.filter((item) => item.archived_at).length]]} />
    <article className="ceter-admin-panel ceter-admin-form-panel"><form className="ceter-admin-form" action={upsertCustomerCategoryAction}><label>Name *<input name="name" required /></label><label>Code<input name="code" /></label><label className="wide">Description<textarea name="description" /></label><button className="ceter-admin-primary-button">Save category</button></form></article>
    <Table columns={["Name", "Code", "Description", "Customers", "Status"]} rows={categories.map((category) => [category.name, category.code ?? "-", category.description ?? "-", category._count.customers, <Badge key={category.id} value={category.archived_at ? "archived" : category.is_active ? "active" : "inactive"} />])} empty="No customer categories found." />
  </PageShell>;
}

export async function SalesPage() {
  await requirePermission("sales.view");
  const orders = await prisma.order.findMany({ include: { customer: true, order_items: true, payments: true, deliveries: true }, orderBy: { created_at: "desc" }, take: 100 });
  return <PageShell eyebrow="Sales" title="Sales Orders" subtitle="Storefront and admin order demand with separate payment, fulfilment, delivery and fiscalization statuses." action={<Link className="ceter-admin-primary-button" href="/admin/sales/new">Make sale</Link>}>
    <Kpis items={[["Orders", orders.length], ["Pending", orders.filter((o) => o.status === "pending").length], ["Reserved", orders.filter((o) => o.fulfilment_status === "reserved").length], ["Backorders", await prisma.salesBackorder.count({ where: { status: "open" } })]]} />
    <FilterBar action="/admin/sales" placeholder="Search order, customer, source or status..." />
    <Table columns={["Order", "Source", "Customer", "Amount", "Payment", "Fulfilment", "Delivery", "eTIMS", "Actions"]} rows={orders.map((order) => [
      order.order_number,
      label(order.source),
      order.customer?.name ?? order.delivery_name ?? "Storefront customer",
      formatKes(order.total_kes),
      <Badge key="p" value={order.payment_status} />,
      <Badge key="f" value={order.fulfilment_status} />,
      <Badge key="d" value={order.delivery_status} />,
      <Badge key="e" value={order.fiscalization_status} />,
      <OrderActions key="a" orderId={order.id} />
    ])} empty="No sales orders found." />
  </PageShell>;
}

export async function SalesDetailPage({ id }: { id: string }) {
  await requirePermission("sales.view");
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, order_items: { include: { product: true } }, deliveries: true, sales_backorders: true, payments: true } });
  if (!order) return <Missing title="Order not found" />;
  return <PageShell eyebrow="Sales / Detail" title={order.order_number} subtitle="Order, reservation, fulfilment, delivery and payment states remain independent." action={<OrderActions orderId={order.id} />}>
    <Kpis items={[["Amount", formatKes(order.total_kes)], ["Items", order.order_items.length], ["Backorders", order.sales_backorders.length], ["Deliveries", order.deliveries.length]]} />
    <Tabs tabs={["Overview", "Items", "Payments", "Delivery", "Fiscalization", "Documents", "Activity"]} />
    <Table columns={["Item", "Ordered", "Reserved", "Fulfilled", "Backordered"]} rows={order.order_items.map((line) => [line.product?.name ?? line.service_label ?? "Order line", line.quantity, Number(line.reserved_quantity), Number(line.fulfilled_quantity), Number(line.backordered_quantity)])} empty="No order items." />
  </PageShell>;
}

export async function QuoteRequestsPage() {
  await requirePermission("quote_requests.view");
  const requests = await prisma.quoteRequest.findMany({ include: { lines: { include: { product: true } } }, orderBy: { created_at: "desc" }, take: 100 });
  return <PageShell eyebrow="Sales" title="Quotation Requests" subtitle="Original storefront requests with internal lifecycle, assignment and conversion tracking.">
    <Kpis items={[["New", requests.filter((request) => request.internal_status === "new").length], ["Under review", requests.filter((request) => request.internal_status === "under_review").length], ["Converted", requests.filter((request) => request.converted_at).length]]} />
    <FilterBar action="/admin/quote-requests" placeholder="Search requester, service, notes or source..." />
    <Table columns={["Request", "Customer", "Service", "Source", "Status", "Items", "Actions"]} rows={requests.map((request) => [request.id.slice(0, 8), request.name, request.service_needed, request.source, <Badge key={request.id} value={request.internal_status} />, request.lines.length, <Link key="a" href={`/admin/quote-requests/${request.id}`}>View</Link>])} empty="No quote requests found." />
  </PageShell>;
}

export async function QuotesPage() {
  await requirePermission("quotations.view");
  const quotes = await prisma.quote.findMany({ include: { customer: true, items: true, documents: true }, orderBy: { created_at: "desc" }, take: 100 });
  return <PageShell eyebrow="Sales" title="Quotations" subtitle="Versioned quotation records with server-calculated line snapshots and conversion links." action={<Link className="ceter-admin-primary-button" href="/admin/quotes/new">New quotation</Link>}>
    <Kpis items={[["Quotations", quotes.length], ["Draft", quotes.filter((q) => q.status === "draft").length], ["Accepted", quotes.filter((q) => q.status === "accepted").length], ["Documents", quotes.reduce((sum, q) => sum + q.documents.length, 0)]]} />
    <Table columns={["Quotation", "Customer", "Version", "Amount", "Status", "Documents", "Download", "Actions"]} rows={quotes.map((quote) => [quote.quote_number, quote.customer.name, quote.version, formatKes(quote.total_kes), <Badge key={quote.id} value={quote.status} />, quote.documents.length, <DocumentLinks key="d" documents={quote.documents} />, <Link key="a" href={`/admin/quotes/${quote.id}`}>View</Link>])} empty="No quotations found." />
  </PageShell>;
}

export async function BillingPage({ kind }: { kind: "invoices" | "receipts" | "credit-notes" | "debit-notes" | "recurring-invoices" }) {
  await requirePermission("billing.view");
  const [invoices, receipts, creditNotes] = await Promise.all([
    prisma.invoice.findMany({ include: { customer: true, documents: true }, orderBy: { created_at: "desc" }, take: 100 }),
    prisma.receipt.findMany({ include: { customer: true, payment: true, documents: true }, orderBy: { created_at: "desc" }, take: 100 }),
    prisma.salesCreditNote.findMany({ include: { customer: true, invoice: true }, orderBy: { created_at: "desc" }, take: 100 })
  ]);
  if (kind === "receipts") return <SimpleRecords eyebrow="Billing" title="Receipts" rows={receipts.map((r) => [r.receipt_number, r.customer.name, formatKes(r.amount_kes), <Badge key={r.id} value={r.status} />, r.documents.length, <DocumentLinks key="d" documents={r.documents} />, <Link key="a" href={`/admin/receipts/${r.id}`}>View</Link>])} columns={["Receipt", "Customer", "Amount", "Status", "Documents", "Download", "Actions"]} />;
  if (kind === "credit-notes") return <SimpleRecords eyebrow="Billing" title="Credit Notes" rows={creditNotes.map((n) => [n.credit_note_number, n.customer.name, n.invoice?.invoice_number ?? "-", formatKes(n.amount_kes), <Badge key={n.id} value={n.status} />, <Link key="a" href={`/admin/credit-notes/${n.id}`}>View</Link>])} columns={["Note", "Customer", "Invoice", "Amount", "Status", "Actions"]} />;
  if (kind === "debit-notes") return <SimpleRecords eyebrow="Billing" title="Debit Notes" rows={[]} columns={["Note", "Original invoice", "Customer", "Amount", "Status", "Actions"]} empty="Sales debit notes are feature-flagged until the business confirms ordinary use." />;
  if (kind === "recurring-invoices") return <SimpleRecords eyebrow="Billing" title="Recurring Invoices" rows={(await prisma.recurringInvoiceSchedule.findMany({ include: { customer: true }, orderBy: { next_run_at: "asc" }, take: 100 })).map((s) => [s.name, s.customer.name, formatKes(s.amount_kes), s.frequency, date(s.next_run_at), <Badge key={s.id} value={s.status} />])} columns={["Schedule", "Customer", "Amount", "Frequency", "Next run", "Status"]} />;
  return <SimpleRecords eyebrow="Billing" title="Invoices" rows={invoices.map((invoice) => [invoice.invoice_number, invoice.customer.name, date(invoice.created_at), formatKes(invoice.total_kes), formatKes(invoice.balance_kes), <Badge key="p" value={invoice.payment_status} />, <Badge key="f" value={invoice.fiscalization_status} />, <DocumentLinks key="d" documents={invoice.documents} />, <Link key="a" href={`/admin/invoices/${invoice.id}`}>View</Link>])} columns={["Invoice", "Customer", "Date", "Gross", "Balance", "Payment", "eTIMS", "Download", "Actions"]} />;
}

export async function PaymentsPage() {
  await requirePermission("payments.view");
  const [payments, invoices] = await Promise.all([
    prisma.payment.findMany({ include: { customer: true, invoice: true, allocations: true, receipt: true }, orderBy: { paid_at: "desc" }, take: 100 }),
    prisma.invoice.findMany({ where: { balance_kes: { gt: 0 } }, select: { id: true, invoice_number: true, balance_kes: true, customer_id: true }, take: 100 })
  ]);
  return <PageShell eyebrow="Sales" title="Payments" subtitle="Posted payment records with allocations, receipt links and controlled reversals.">
    <Kpis items={[["Payments", payments.length], ["Posted", payments.filter((p) => p.status === "posted").length], ["Unallocated", formatKes(payments.reduce((sum, p) => sum + p.unallocated_kes, 0))], ["Receipted", payments.filter((p) => p.receipt).length]]} />
    <Table columns={["Payment", "Customer", "Amount", "Unallocated", "Method", "Status", "Allocation / reversal"]} rows={payments.map((payment) => [
      payment.payment_number,
      payment.customer.name,
      formatKes(payment.amount_kes),
      formatKes(payment.unallocated_kes),
      label(payment.method),
      <Badge key="s" value={payment.status} />,
      <PaymentActions key="a" paymentId={payment.id} invoices={invoices.filter((invoice) => invoice.customer_id === payment.customer_id)} />
    ])} empty="No payments found." />
  </PageShell>;
}

export async function DeliveriesPage({ notes = false }: { notes?: boolean }) {
  await requirePermission("deliveries.view");
  const deliveries = await prisma.delivery.findMany({ include: { order: true, customer: true, lines: true, documents: true }, orderBy: { created_at: "desc" }, take: 100 });
  return <PageShell eyebrow="Sales" title={notes ? "Delivery Notes" : "Deliveries"} subtitle="Delivery workflow linked to sales orders and stock fulfilment.">
    <Kpis items={[["Deliveries", deliveries.length], ["Scheduled", deliveries.filter((d) => d.status === "scheduled").length], ["Delivered", deliveries.filter((d) => d.status === "delivered").length], ["Documents", deliveries.reduce((sum, d) => sum + d.documents.length, 0)]]} />
    <Table columns={["Delivery", "Order", "Customer", "Items", "Status", "Document", "Download", "Actions"]} rows={deliveries.map((delivery) => [delivery.delivery_number, delivery.order.order_number, delivery.customer?.name ?? "Storefront customer", delivery.lines.length, <Badge key="s" value={delivery.status} />, delivery.documents.length ? "Issued" : "Pending", <DocumentLinks key="d" documents={delivery.documents} />, <Link key="a" href={`/${notes ? "admin/delivery-notes" : "admin/deliveries"}/${delivery.id}`}>View</Link>])} empty="No deliveries found." />
  </PageShell>;
}

export async function FiscalizationPage({ view = "dashboard", id }: { view?: "dashboard" | "queue" | "reconciliation" | "tax-mappings" | "transaction"; id?: string }) {
  await requirePermission("fiscalization.view");
  const records = await prisma.etimsRecord.findMany({ include: { invoice: { include: { customer: true } }, logs: true }, orderBy: { created_at: "desc" }, take: 100 });
  if (view === "tax-mappings") {
    const products = await prisma.product.findMany({ where: { archived_at: null }, include: { category: true, brand: true }, orderBy: { name: "asc" }, take: 200 });
    return <SimpleRecords eyebrow="Fiscalization" title="Tax Mappings" rows={products.map((product) => [product.name, product.sku ?? "-", product.tax_type_code ?? "Missing", product.etims_classification_code ?? "Missing", product.etims_unit_code ?? "Missing", <Badge key={product.id} value={product.tax_mapping_status} />])} columns={["Product", "SKU", "Tax type", "Classification", "Unit", "Status"]} />;
  }
  if (view === "transaction") {
    const record = id ? records.find((item) => item.id === id) ?? await prisma.etimsRecord.findUnique({ where: { id }, include: { invoice: { include: { customer: true } }, logs: true } }) : null;
    return record ? <SimpleRecords eyebrow="Fiscalization / Transaction" title={record.invoice.invoice_number} rows={record.logs.map((log) => [date(log.created_at), log.status, log.message ?? "-", JSON.stringify(log.response_payload ?? {})])} columns={["Time", "Status", "Message", "Sanitized response"]} /> : <Missing title="Fiscalization transaction not found" />;
  }
  const rows = records.map((record) => [record.invoice.invoice_number, record.invoice.customer.name, formatKes(record.invoice.total_kes), formatKes(record.invoice.vat_kes), date(record.created_at), record.attempt_number, <Badge key="s" value={record.internal_state} />, record.response_message ?? record.last_error ?? "-", <Link key="a" href={`/admin/fiscalization/transactions/${record.id}`}>View</Link>]);
  return <SimpleRecords eyebrow="Fiscalization" title={view === "queue" ? "Fiscalization Queue" : view === "reconciliation" ? "eTIMS Reconciliation" : "eTIMS Dashboard"} subtitle="Provider-neutral OSCU/VSCU/legacy/manual service. Production is disabled until legitimate credentials and certification are configured." rows={rows} columns={["Invoice", "Customer", "Amount", "Tax", "Queued", "Attempts", "State", "Last response", "Actions"]} />;
}

export async function DocumentsPage({ id, verification = false }: { id?: string; verification?: boolean }) {
  await requirePermission("documents.view");
  if (verification) return <SimpleRecords eyebrow="Documents" title="Document Verification" subtitle="Search by document number, Ceter verification token hash or operational barcode without exposing private customer data." rows={(await prisma.documentVerificationEvent.findMany({ include: { document: true }, orderBy: { created_at: "desc" }, take: 100 })).map((event) => [date(event.created_at), event.document?.document_number ?? "Unknown", event.result, event.token_hash?.slice(0, 12) ?? "-"])} columns={["Date", "Document", "Result", "Token hash"]} />;
  const documents = await prisma.document.findMany({ where: id ? { id } : undefined, include: { customer: true, invoice: true, receipt: true, delivery: true, signing_certificate: true, verification_events: true }, orderBy: { created_at: "desc" }, take: 100 });
  return <SimpleRecords eyebrow="Documents" title={id ? documents[0]?.document_number ?? "Document Detail" : "Issued Documents"} rows={documents.map((document) => [document.document_number ?? document.title, label(document.document_type), document.customer?.name ?? document.invoice?.invoice_number ?? document.receipt?.receipt_number ?? document.delivery?.delivery_number ?? "-", document.version, <Badge key="l" value={document.lifecycle_status} />, <Badge key="s" value={document.signature_status} />, <Badge key="v" value={document.verification_status} />, document.operational_barcode ?? "-", document.verification_events.length, <DocumentLinks key="d" documents={[document]} />])} columns={["Document", "Type", "Related", "Version", "Lifecycle", "Signature", "Verification", "Barcode", "Checks", "Download"]} />;
}

export async function IntegrationSettingsPage({ kind }: { kind: "mpesa" | "etims" | "signing" }) {
  await requirePermission(kind === "signing" ? "documents.signing.configure" : kind === "etims" ? "fiscalization.configure" : "payments.mpesa.reconcile");
  const certs = kind === "signing" ? await prisma.signingCertificate.findMany({ orderBy: { valid_to: "asc" }, take: 10 }) : [];
  const title = kind === "mpesa" ? "M-Pesa Settings" : kind === "etims" ? "eTIMS Settings" : "Document Signing";
  const subtitle = kind === "signing" ? "Production signing certificate not configured unless a real protected certificate is active." : kind === "etims" ? "Production eTIMS remains disabled until legitimate credentials, onboarding and certification are configured." : "M-Pesa production status is driven by server-side credentials only; secrets are not displayed.";
  return <SimpleRecords eyebrow="Settings" title={title} subtitle={subtitle} rows={kind === "signing" ? certs.map((cert) => [cert.environment, cert.provider, cert.subject, cert.issuer, cert.serial_number, date(cert.valid_to), cert.is_active ? "Active" : "Inactive"]) : [[kind.toUpperCase(), process.env.NODE_ENV === "production" ? "Production" : "Local", "Credentials redacted", "Live action disabled until configured"]]} columns={kind === "signing" ? ["Environment", "Provider", "Subject", "Issuer", "Serial", "Valid to", "Status"] : ["Integration", "Environment", "Credential display", "Status"]} />;
}

function PageShell({ eyebrow, title, subtitle, action, children }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="ceter-admin-page"><div className="ceter-admin-greeting"><div><p>{eyebrow}</p><h1>{title}</h1><span>{subtitle}</span></div>{action}</div>{children}</div>;
}

function SimpleRecords({ eyebrow, title, subtitle, rows, columns, empty }: { eyebrow: string; title: string; subtitle?: string; rows: React.ReactNode[][]; columns: string[]; empty?: string }) {
  return <PageShell eyebrow={eyebrow} title={title} subtitle={subtitle ?? "Dedicated administrative workflow."}><FilterBar action="#" placeholder="Search records..." /><Table title={title} columns={columns} rows={rows} empty={empty ?? "No records found."} /></PageShell>;
}

function DocumentLinks({ documents }: { documents: Array<{ id: string; document_type?: string }> }) {
  const pdfs = documents.filter((document) => document.id);
  if (!pdfs.length) return <span className="text-slate-500">No PDF</span>;
  return <div className="ceter-admin-inline-links">{pdfs.map((document) => <a key={document.id} href={`/api/admin/documents/${document.id}/download`} target="_blank" rel="noreferrer">{label(document.document_type ?? "PDF")}</a>)}</div>;
}

function Kpis({ items }: { items: Array<[string, React.ReactNode, string?]> }) {
  return <section className="ceter-admin-kpis">{items.map(([labelText, value, note]) => <article key={labelText} className="ceter-admin-kpi"><span>{labelText}</span><strong>{value}</strong>{note ? <p>{note}</p> : null}</article>)}</section>;
}

function FilterBar({ action, placeholder }: { action: string; placeholder: string }) {
  return <form className="ceter-admin-filter-bar" action={action}><input name="q" placeholder={placeholder} /><select name="status"><option value="">All statuses</option><option value="pending">Pending</option><option value="issued">Issued</option><option value="cancelled">Cancelled</option></select><input type="date" name="from" /><input type="date" name="to" /><button className="ceter-admin-secondary-button">Search</button></form>;
}

function Table({ title = "Records", columns, rows, empty }: { title?: string; columns: string[]; rows: React.ReactNode[][]; empty: string }) {
  return <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Records</span><h2>{title}</h2></div><a className="ceter-admin-secondary-button" href={`/api/admin/exports?kind=${exportKind(title)}`}>Export CSV</a></div><div className="ceter-admin-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="ceter-admin-empty">{empty}<br /><button className="ceter-admin-secondary-button">Retry</button></div></td></tr>}</tbody></table></div></article>;
}

function exportKind(title: string) {
  if (/audit|activity/i.test(title)) return "audit";
  if (/user/i.test(title)) return "users";
  if (/compliance/i.test(title)) return "compliance";
  if (/business profile/i.test(title)) return "settings-business";
  if (/sales orders?|orders?/i.test(title)) return "orders";
  if (/quotations?|quotes?/i.test(title)) return "quotes";
  if (/invoices?/i.test(title)) return "invoices";
  if (/receipts?/i.test(title)) return "receipts";
  if (/payments?/i.test(title)) return "payments";
  if (/delivery|deliveries/i.test(title)) return "deliveries";
  if (/documents?/i.test(title)) return "documents";
  if (/customers?/i.test(title)) return "customers";
  if (/product|inventory/i.test(title)) return "products";
  return "reports";
}

function Cell({ title, note }: { title: string; note: string }) {
  return <><strong>{title}</strong><small>{note}</small></>;
}

function Badge({ value }: { value: string }) {
  const tone = /paid|complete|fulfilled|ready|sent|active|valid|issued|accepted|matched/.test(value) ? "green" : /cancel|failed|overdue|rejected|revoked|invalid/.test(value) ? "red" : "amber";
  return <span className={`ceter-admin-status ${tone}`}>{label(value)}</span>;
}

function OrderActions({ orderId }: { orderId: string }) {
  return <AdminActionMenu label={`Actions for order ${orderId}`}><Link href={`/admin/sales/${orderId}`}>View Order</Link><WorkflowForm action={confirmOrderReservationAction} orderId={orderId} labelText="Confirm Sale" correlationPrefix="confirm" /><WorkflowForm action={fulfillOrderAction} orderId={orderId} labelText="Mark as Fulfilled" correlationPrefix="fulfil" /><WorkflowForm action={createDeliveryAction} orderId={orderId} labelText="Create Delivery" correlationPrefix="delivery" /><form action={cancelOrderReservationAction} className="ceter-admin-inline-form"><input type="hidden" name="order_id" value={orderId} /><input type="hidden" name="reason" value="Cancelled from sales admin" /><input type="hidden" name="correlation_id" value={`cancel-${orderId}`} /><button className="ceter-admin-secondary-button">Cancel Order</button></form></AdminActionMenu>;
}

function WorkflowForm({ action, orderId, labelText, correlationPrefix }: { action: (formData: FormData) => void | Promise<void>; orderId: string; labelText: string; correlationPrefix: string }) {
  return <form action={action} className="ceter-admin-inline-form"><input type="hidden" name="order_id" value={orderId} /><input type="hidden" name="correlation_id" value={`${correlationPrefix}-${orderId}`} /><button className="ceter-admin-secondary-button">{labelText}</button></form>;
}

function PaymentActions({ paymentId, invoices }: { paymentId: string; invoices: Array<{ id: string; invoice_number: string; balance_kes: number }> }) {
  return <AdminActionMenu label={`Actions for payment ${paymentId}`}><form action={allocatePaymentAction} className="ceter-admin-inline-form"><input type="hidden" name="payment_id" value={paymentId} /><select name="invoice_id">{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number}</option>)}</select><input name="amount_kes" placeholder="KES" /><button className="ceter-admin-secondary-button">Allocate</button></form><form action={reversePaymentAction} className="ceter-admin-inline-form"><input type="hidden" name="payment_id" value={paymentId} /><input type="hidden" name="reason" value="Manual reversal from admin" /><button className="ceter-admin-secondary-button">Reverse</button></form></AdminActionMenu>;
}

function Statement({ customerId }: { customerId: string }) {
  return <form action={generateCustomerStatementAction} className="ceter-admin-inline-form"><input type="hidden" name="customer_id" value={customerId} /><button className="ceter-admin-secondary-button">Statement</button></form>;
}

function Tabs({ tabs }: { tabs: string[] }) {
  return <nav className="ceter-admin-tabs">{tabs.map((tab) => <a key={tab}>{tab}</a>)}</nav>;
}

function Missing({ title }: { title: string }) {
  return <div className="ceter-admin-page"><div className="ceter-admin-empty">{title}</div></div>;
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
