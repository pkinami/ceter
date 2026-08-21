import Link from "next/link";
import type { BusinessPaymentMethod, BusinessQuoteStatus, DocumentCategory, InvoiceStatus, ProformaStatus, PurchaseOrderStatus, TenderStatus } from "@prisma/client";
import { requireAdminSession } from "@/lib/admin/auth";
import { signedBusinessDocumentUrl } from "@/lib/business/documents";
import { mpesaAdminMessage } from "@/lib/business/mpesa";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { Card, Kpi, KpiGrid, Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import {
  createExpenseAction,
  createComplianceItemAction,
  createEmployeeAction,
  createPurchaseOrderAction,
  createQuoteAction,
  createSupplierInvoiceAction,
  createTenderAction,
  deleteCustomerAction,
  deleteSupplierAction,
  generateCustomerStatementAction,
  initiateInvoiceMpesaAction,
  proformaToInvoiceAction,
  quoteToInvoiceAction,
  quoteToProformaAction,
  prepareEtimsRecordAction,
  recordPaymentAction,
  retryEtimsSubmissionAction,
  recordSupplierPaymentAction,
  receiveGoodsAction,
  submitEtimsRecordAction,
  updateBusinessSettingsAction,
  uploadCompanyDocumentAction,
  updateInvoiceStatusAction,
  updateProformaStatusAction,
  updatePurchaseOrderStatusAction,
  updateQuoteStatusAction,
  updateTenderRequirementAction,
  updateTenderStatusAction,
  upsertSupplierAction,
  upsertCustomerAction
} from "./actions";

const quoteStatuses: BusinessQuoteStatus[] = ["draft", "sent", "accepted", "rejected", "expired"];
const invoiceStatuses: InvoiceStatus[] = ["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"];
const proformaStatuses: ProformaStatus[] = ["draft", "sent", "paid", "cancelled"];
const paymentMethods: BusinessPaymentMethod[] = ["mpesa", "bank_transfer", "cash", "card", "pay_on_delivery", "credit"];
const customerTypes = ["individual", "business", "government", "ngo"] as const;
const purchaseOrderStatuses: PurchaseOrderStatus[] = ["draft", "sent", "confirmed", "partially_received", "completed", "cancelled"];
const tenderStatuses: TenderStatus[] = ["new", "reviewing", "preparing", "submitted", "won", "lost", "cancelled"];
const documentCategories: DocumentCategory[] = ["company", "tax", "tender", "supplier", "customer", "contract", "finance", "other"];

export default async function BusinessPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminSession();
  const params = await searchParams;
  const selectedCustomerId = one(params.customer);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    customers,
    products,
    quotes,
    proformas,
    invoices,
    payments,
    expenses,
    documents,
    suppliers,
    purchaseOrders,
    goodsReceivedNotes,
    supplierInvoices,
    supplierPayments,
    accounts,
    journalEntries,
    complianceSettings,
    complianceItems,
    employees,
    taxRecords,
    etimsRecords,
    tenders,
    companyDocuments,
    selectedCustomer,
    salesToday,
    salesMonth,
    salesTotal,
    expenseTotal,
    stockValue
  ] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { created_at: "desc" },
      include: {
        addresses: { orderBy: { created_at: "desc" } },
        orders: { select: { id: true, total_kes: true, status: true, created_at: true } },
        payments: { orderBy: { paid_at: "desc" }, take: 5 },
        invoices: { select: { id: true, invoice_number: true, total_kes: true, balance_kes: true, status: true } },
        documents: { where: { document_type: "customer_statement" }, orderBy: { created_at: "desc" }, take: 1 }
      }
    }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, price_kes: true, stock_quantity: true, reorder_level: true, cost_price_kes: true } }),
    prisma.quote.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { customer: true, items: true, documents: true } }),
    prisma.proformaInvoice.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { customer: true, items: true, documents: true } }),
    prisma.invoice.findMany({ orderBy: { created_at: "desc" }, take: 30, include: { customer: true, items: true, payments: true, documents: true } }),
    prisma.payment.findMany({ orderBy: { paid_at: "desc" }, take: 30, include: { customer: true, invoice: true, receipt: true, documents: true } }),
    prisma.expense.findMany({ orderBy: { expense_date: "desc" }, take: 30, include: { category: true, documents: true } }),
    prisma.document.findMany({ orderBy: { created_at: "desc" }, take: 30 }),
    prisma.supplier.findMany({ orderBy: { created_at: "desc" }, include: { supplier_invoices: true, purchase_orders: true, documents: true } }),
    prisma.purchaseOrder.findMany({ orderBy: { created_at: "desc" }, take: 30, include: { supplier: true, items: { include: { product: true } }, documents: true } }),
    prisma.goodsReceivedNote.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { supplier: true, purchase_order: true, items: { include: { product: true } } } }),
    prisma.supplierInvoice.findMany({ orderBy: { created_at: "desc" }, take: 30, include: { supplier: true, purchase_order: true, payments: true } }),
    prisma.supplierPayment.findMany({ orderBy: { paid_at: "desc" }, take: 20, include: { supplier: true, supplier_invoice: true } }),
    prisma.account.findMany({ orderBy: { code: "asc" }, include: { lines: true } }),
    prisma.journalEntry.findMany({ orderBy: { created_at: "desc" }, take: 30, include: { lines: { include: { account: true } } } }),
    prisma.complianceSetting.findMany({ orderBy: { agency: "asc" } }),
    prisma.complianceItem.findMany({ orderBy: { due_date: "asc" }, take: 30 }),
    prisma.employee.findMany({ orderBy: { created_at: "desc" }, take: 20 }),
    prisma.taxRecord.findMany({ orderBy: { period_start: "desc" }, take: 12 }),
    prisma.etimsRecord.findMany({ orderBy: { created_at: "desc" }, take: 30, include: { invoice: { include: { customer: true } }, logs: { orderBy: { created_at: "desc" }, take: 8 } } }),
    prisma.tender.findMany({ orderBy: [{ closing_date: "asc" }, { created_at: "desc" }], take: 30, include: { requirements: true, documents: true, products: true } }),
    prisma.companyDocument.findMany({ orderBy: { created_at: "desc" }, take: 40 }),
    selectedCustomerId ? prisma.customer.findUnique({ where: { id: selectedCustomerId }, include: { addresses: true } }) : null,
    prisma.invoice.aggregate({ where: { created_at: { gte: startOfToday }, status: { not: "cancelled" } }, _sum: { total_kes: true } }),
    prisma.invoice.aggregate({ where: { created_at: { gte: startOfMonth }, status: { not: "cancelled" } }, _sum: { total_kes: true } }),
    prisma.invoice.aggregate({ where: { status: { not: "cancelled" } }, _sum: { total_kes: true } }),
    prisma.expense.aggregate({ _sum: { amount_kes: true } }),
    prisma.product.findMany({ where: { archived_at: null }, select: { stock_quantity: true, cost_price_kes: true, price_kes: true } })
  ]);

  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount_kes, 0);
  const [businessSettings, mpesaTransactions, notificationHistory] = await Promise.all([
    prisma.businessSetting.findMany({ orderBy: { code: "asc" } }),
    prisma.mpesaTransaction.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { invoice: true, customer: true, payment: { include: { receipt: true } } } }),
    prisma.notificationHistory.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { user: true } })
  ]);
  const settingsMap = new Map(businessSettings.map((setting) => [setting.code, setting.value ?? ""]));
  const outstanding = invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0);
  const customersOwing = customers.filter((customer) => customer.invoices.some((invoice) => invoice.balance_kes > 0)).length;
  const totalSales = salesTotal._sum.total_kes ?? 0;
  const totalExpenses = expenseTotal._sum.amount_kes ?? 0;
  const inventoryValue = stockValue.reduce((sum, product) => sum + product.stock_quantity * (product.cost_price_kes ?? product.price_kes), 0);
  const lowStock = products.filter((product) => product.stock_quantity <= product.reorder_level).length;
  const supplierBalance = supplierInvoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0);
  const activeTenders = tenders.filter((tender) => !["won", "lost", "cancelled"].includes(tender.status)).length;
  const closingSoon = tenders.filter((tender) => tender.closing_date && tender.closing_date.getTime() <= now.getTime() + 14 * 24 * 60 * 60 * 1000).length;
  const upcomingCompliance = complianceItems.filter((item) => item.due_date.getTime() >= startOfToday.getTime()).slice(0, 5);
  const [signedCustomers, signedQuotes, signedProformas, signedInvoices, signedPayments, signedPurchaseOrders, signedDocuments, signedCompanyDocuments] = await Promise.all([
    Promise.all(customers.map(async (customer) => ({ ...customer, documents: await signDocuments(customer.documents) }))),
    Promise.all(quotes.map(async (quote) => ({ ...quote, documents: await signDocuments(quote.documents) }))),
    Promise.all(proformas.map(async (proforma) => ({ ...proforma, documents: await signDocuments(proforma.documents) }))),
    Promise.all(invoices.map(async (invoice) => ({ ...invoice, documents: await signDocuments(invoice.documents) }))),
    Promise.all(payments.map(async (payment) => ({ ...payment, documents: await signDocuments(payment.documents) }))),
    Promise.all(purchaseOrders.map(async (po) => ({ ...po, documents: await signDocuments(po.documents) }))),
    signDocuments(documents),
    Promise.all(companyDocuments.map(async (document) => ({
      ...document,
      signed_url: await signedBusinessDocumentUrl(document.storage_path, document.bucket).catch(() => null)
    })))
  ]);

  return (
    <>
      <PageHeader
        title="Business Suite"
        copy="Finance and sales foundation for customers, quotations, invoices, receipts, expenses and accounting transactions."
        actions={<Link className="btn-lite" href="/admin">Admin dashboard</Link>}
      />
      <Message success={one(params.success)} error={one(params.error)} />

      <KpiGrid>
        <Kpi label="Sales today" value={formatKes(salesToday._sum.total_kes ?? 0)} />
        <Kpi label="Sales this month" value={formatKes(salesMonth._sum.total_kes ?? 0)} />
        <Kpi label="Total sales" value={formatKes(totalSales)} />
        <Kpi label="Outstanding invoices" value={formatKes(outstanding)} note={`${customersOwing} customers owing`} />
        <Kpi label="Profit estimate" value={formatKes(totalSales - totalExpenses)} note="Sales less expenses" />
        <Kpi label="Inventory value" value={formatKes(inventoryValue)} note={`${lowStock} low stock items`} />
        <Kpi label="Supplier payables" value={formatKes(supplierBalance)} />
        <Kpi label="Active tenders" value={activeTenders} note={`${closingSoon} closing soon`} />
      </KpiGrid>

      <div className="admin-toolbar">
        <a className="btn-lite" href="#customers">Customers</a>
        <a className="btn-lite" href="#quotes">Quotations</a>
        <a className="btn-lite" href="#proformas">Pro-forma</a>
        <a className="btn-lite" href="#invoices">Invoices</a>
        <a className="btn-lite" href="#payments">Payments</a>
        <a className="btn-lite" href="#expenses">Expenses</a>
        <a className="btn-lite" href="#suppliers">Suppliers</a>
        <a className="btn-lite" href="#procurement">Procurement</a>
        <a className="btn-lite" href="#accounting">Accounting</a>
        <a className="btn-lite" href="#compliance">Compliance</a>
        <a className="btn-lite" href="#etims">eTIMS</a>
        <a className="btn-lite" href="#tenders">Tenders</a>
        <a className="btn-lite" href="#vault">Vault</a>
        <a className="btn-lite" href="#documents">Documents</a>
      </div>

      <section id="customers">
        <PageHeader title="Customer Management" copy="Customer profiles connect to orders, quotations, invoices, payments and balances." />
        <Card title={selectedCustomer ? "Edit Customer" : "Add Customer"}>
          <form action={upsertCustomerAction} className="business-form">
            <input type="hidden" name="id" value={selectedCustomer?.id ?? ""} />
            <Field label="Customer name" name="name" required defaultValue={selectedCustomer?.name} />
            <Field label="Company name" name="company_name" defaultValue={selectedCustomer?.company_name} />
            <label>Customer type<select className="admin-input" name="customer_type" defaultValue={selectedCustomer?.customer_type ?? "individual"}>{customerTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label>
            <Field label="Phone" name="phone" defaultValue={selectedCustomer?.phone} />
            <Field label="Email" name="email" type="email" defaultValue={selectedCustomer?.email} />
            <Field label="Tax PIN" name="tax_pin" defaultValue={selectedCustomer?.tax_pin} />
            <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" defaultValue={selectedCustomer?.notes ?? ""} /></label>
            <Field label="Address label" name="address_label" placeholder="Office, Home, Site" />
            <Field label="Recipient" name="address_recipient" />
            <Field label="Address phone" name="address_phone" />
            <Field label="Address line 1" name="address_line_1" />
            <Field label="Address line 2" name="address_line_2" />
            <Field label="City" name="address_city" />
            <Field label="Region" name="address_region" />
            <label className="business-form-wide">Delivery notes<textarea className="admin-input" name="delivery_notes" /></label>
            <label className="business-check"><input type="checkbox" name="address_default" /> Default delivery address</label>
            <div className="business-form-actions">
              <button className="btn-dark">{selectedCustomer ? "Update customer" : "Create customer"}</button>
              {selectedCustomer ? <Link className="btn-lite" href="/admin/business">Cancel edit</Link> : null}
            </div>
          </form>
        </Card>
        <Table headers={["Customer", "Type", "Orders", "Payments", "Outstanding", "Addresses", "Actions"]} minWidth={1120}>
          {signedCustomers.map((customer) => {
            const balance = customer.invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0);
            const paid = customer.payments.reduce((sum, payment) => sum + payment.amount_kes, 0);
            return (
              <tr key={customer.id}>
                <td><strong>{customer.name}</strong><br /><span className="text-slate-500">{customer.company_name ?? customer.email ?? customer.phone ?? customer.id}</span></td>
                <td><Pill tone="teal">{label(customer.customer_type)}</Pill></td>
                <td>{customer.orders.length}</td>
                <td><Money value={paid} /></td>
                <td><Money value={balance} /></td>
                <td>{customer.addresses.map((address) => address.address_line_1).join("; ") || "No delivery address"}</td>
                <td className="business-actions-cell">
                  <Link className="btn-lite" href={`/admin/business?customer=${customer.id}#customers`}>Edit/View</Link>
                  <form action={generateCustomerStatementAction} className="business-status-form">
                    <input type="hidden" name="customer_id" value={customer.id} />
                    <input className="admin-input" name="period_start" type="date" aria-label="Statement start date" />
                    <input className="admin-input" name="period_end" type="date" aria-label="Statement end date" />
                    <button className="btn-lite">Statement</button>
                  </form>
                  <DocumentLink documents={customer.documents} labelText="Download" emptyText="" />
                  <form action={deleteCustomerAction}><input type="hidden" name="id" value={customer.id} /><button className="btn-lite">Delete</button></form>
                </td>
              </tr>
            );
          })}
        </Table>
      </section>

      <section id="quotes">
        <PageHeader title="Quotations" copy="Create branded PDF quotations with catalogue products and manual services." />
        <DocumentForm customers={customers} products={products} action={createQuoteAction} submit="Create quotation" includeQuoteStatus />
        <Table headers={["Quote", "Customer", "Items", "Total", "Status", "PDF", "Actions"]} minWidth={1180}>
          {signedQuotes.map((quote) => (
            <tr key={quote.id}>
              <td><strong>{quote.quote_number}</strong><br /><span className="text-slate-500">{quote.created_at.toLocaleDateString("en-KE")}</span></td>
              <td>{quote.customer.name}</td>
              <td>{quote.items.map((item) => `${item.quantity} x ${item.description}`).join("; ")}</td>
              <td><Money value={quote.total_kes} /></td>
              <td><Pill tone={quote.status === "accepted" ? "green" : quote.status === "rejected" || quote.status === "expired" ? "red" : "teal"}>{label(quote.status)}</Pill></td>
              <td><DocumentLink documents={quote.documents} /></td>
              <td className="business-actions-cell">
                <StatusForm id={quote.id} statuses={quoteStatuses} value={quote.status} action={updateQuoteStatusAction} />
                <form action={quoteToProformaAction}><input type="hidden" name="id" value={quote.id} /><button className="btn-lite">To pro-forma</button></form>
                <form action={quoteToInvoiceAction}><input type="hidden" name="id" value={quote.id} /><button className="btn-dark">To invoice</button></form>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="proformas">
        <PageHeader title="Pro-forma Invoices" copy="Intermediate payment documents before final invoice and receipt." />
        <Table headers={["Pro-forma", "Customer", "Items", "Total", "Status", "PDF", "Actions"]} minWidth={1180}>
          {signedProformas.map((proforma) => (
            <tr key={proforma.id}>
              <td><strong>{proforma.proforma_number}</strong></td>
              <td>{proforma.customer.name}</td>
              <td>{proforma.items.map((item) => `${item.quantity} x ${item.description}`).join("; ")}</td>
              <td><Money value={proforma.total_kes} /></td>
              <td><Pill tone={proforma.status === "paid" ? "green" : proforma.status === "cancelled" ? "red" : "teal"}>{label(proforma.status)}</Pill></td>
              <td><DocumentLink documents={proforma.documents} /></td>
              <td className="business-actions-cell">
                <StatusForm id={proforma.id} statuses={proformaStatuses} value={proforma.status} action={updateProformaStatusAction} />
                <form action={proformaToInvoiceAction}><input type="hidden" name="id" value={proforma.id} /><button className="btn-dark">To invoice</button></form>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="invoices">
        <PageHeader title="Sales Invoices" copy="Automatic invoice numbers, VAT, discounts, balances and accounting transactions." />
        <Table headers={["Invoice", "Customer", "Items", "Total", "Paid", "Balance", "Status", "PDF", "Actions"]} minWidth={1300}>
          {signedInvoices.map((invoice) => (
            <tr key={invoice.id}>
              <td><strong>{invoice.invoice_number}</strong><br /><span className="text-slate-500">{invoice.created_at.toLocaleDateString("en-KE")}</span></td>
              <td>{invoice.customer.name}</td>
              <td>{invoice.items.map((item) => `${item.quantity} x ${item.description}`).join("; ")}</td>
              <td><Money value={invoice.total_kes} /></td>
              <td><Money value={invoice.paid_kes} /></td>
              <td><Money value={invoice.balance_kes} /></td>
              <td><Pill tone={invoice.status === "paid" ? "green" : invoice.status === "cancelled" || invoice.status === "overdue" ? "red" : invoice.status === "partially_paid" ? "amber" : "teal"}>{label(invoice.status)}</Pill></td>
              <td><DocumentLink documents={invoice.documents} /></td>
              <td><StatusForm id={invoice.id} statuses={invoiceStatuses} value={invoice.status} action={updateInvoiceStatusAction} /></td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="payments">
        <PageHeader title="Payments And Receipts" copy={`Received payments: ${formatKes(totalPayments)}. Recording a payment updates invoice balance and creates a branded receipt.`} />
        <Card title="Record Payment">
          <form action={recordPaymentAction} className="business-form">
            <label>Invoice<select className="admin-input" name="invoice_id" required>{invoices.filter((invoice) => invoice.balance_kes > 0).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {invoice.customer.name} - {formatKes(invoice.balance_kes)}</option>)}</select></label>
            <Field label="Amount" name="amount_kes" type="number" required />
            <label>Payment method<select className="admin-input" name="method">{paymentMethods.map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>
            <Field label="Reference" name="reference" />
            <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" /></label>
            <div className="business-form-actions"><button className="btn-dark">Record payment</button></div>
          </form>
          <form action={initiateInvoiceMpesaAction} className="business-form mt-4">
            <label>Invoice<select className="admin-input" name="invoice_id" required>{invoices.filter((invoice) => invoice.balance_kes > 0).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {invoice.customer.name} - {formatKes(invoice.balance_kes)}</option>)}</select></label>
            <Field label="M-Pesa phone" name="phone_number" type="tel" required />
            <Field label="Amount" name="amount_kes" type="number" placeholder="Defaults to invoice balance" />
            <div className="business-form-actions"><button className="btn-lite">Send STK request</button></div>
          </form>
        </Card>
        <Table headers={["Payment", "Customer", "Invoice", "Amount", "Method", "Receipt", "Date"]} minWidth={980}>
          {signedPayments.map((payment) => (
            <tr key={payment.id}>
              <td><strong>{payment.payment_number}</strong><br /><span className="text-slate-500">{payment.reference ?? "No reference"}</span></td>
              <td>{payment.customer.name}</td>
              <td>{payment.invoice?.invoice_number ?? "No invoice"}</td>
              <td><Money value={payment.amount_kes} /></td>
              <td>{label(payment.method)}</td>
              <td>{payment.receipt?.receipt_number ?? "Pending"} <DocumentLink documents={payment.documents} /></td>
              <td>{payment.paid_at.toLocaleString("en-KE")}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="expenses">
        <PageHeader title="Expense Management" copy={`Total expenses: ${formatKes(totalExpenses)}. Attachments are stored in Supabase Storage.`} />
        <Card title="Record Expense">
          <form action={createExpenseAction} className="business-form">
            <Field label="Category" name="category_name" placeholder="Transport, Internet, Rent, Marketing" required />
            <Field label="Supplier" name="supplier" />
            <Field label="Amount" name="amount_kes" type="number" required />
            <Field label="Date" name="expense_date" type="date" required />
            <label>Payment method<select className="admin-input" name="method">{paymentMethods.map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>
            <label>Receipt attachment<input className="admin-input" name="attachment" type="file" /></label>
            <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" /></label>
            <div className="business-form-actions"><button className="btn-dark">Record expense</button></div>
          </form>
        </Card>
        <Table headers={["Expense", "Category", "Supplier", "Amount", "Method", "Attachment", "Date"]} minWidth={980}>
          {expenses.map((expense) => (
            <tr key={expense.id}>
              <td><strong>{expense.expense_number}</strong></td>
              <td>{expense.category.name}</td>
              <td>{expense.supplier ?? "Not specified"}</td>
              <td><Money value={expense.amount_kes} /></td>
              <td>{label(expense.method)}</td>
              <td>{expense.attachment_url ? <a className="btn-lite" href={expense.attachment_url} target="_blank" rel="noreferrer">Open</a> : "None"}</td>
              <td>{expense.expense_date.toLocaleDateString("en-KE")}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="suppliers">
        <PageHeader title="Suppliers" copy="Supplier records link to purchase orders, GRNs, supplier invoices, payments and supplier documents." />
        <Card title="Add Supplier">
          <form action={upsertSupplierAction} className="business-form">
            <Field label="Company name" name="company_name" required />
            <Field label="Contact person" name="contact_person" />
            <Field label="Phone" name="phone" />
            <Field label="Email" name="email" type="email" />
            <Field label="KRA PIN" name="kra_pin" />
            <label className="business-form-wide">Address<textarea className="admin-input" name="address" /></label>
            <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" /></label>
            <div className="business-form-actions"><button className="btn-dark">Save supplier</button></div>
          </form>
        </Card>
        <Table headers={["Supplier", "Contact", "KRA PIN", "Purchase orders", "Balance", "Documents", "Actions"]} minWidth={1080}>
          {suppliers.map((supplier) => (
            <tr key={supplier.id}>
              <td><strong>{supplier.company_name}</strong><br /><span className="text-slate-500">{supplier.address ?? "No address"}</span></td>
              <td>{supplier.contact_person ?? "Not set"}<br /><span className="text-slate-500">{supplier.phone ?? supplier.email ?? ""}</span></td>
              <td>{supplier.kra_pin ?? "Not set"}</td>
              <td>{supplier.purchase_orders.length}</td>
              <td><Money value={supplier.supplier_invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0)} /></td>
              <td>{supplier.documents.length}</td>
              <td className="business-actions-cell">
                <form action={deleteSupplierAction}><input type="hidden" name="id" value={supplier.id} /><button className="btn-lite">Delete if unused</button></form>
              </td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="procurement">
        <PageHeader title="Procurement And Inventory Accounting" copy="Purchase orders receive catalogue products into the existing stock table and stock movements ledger." />
        <Card title="Create Purchase Order">
          <form action={createPurchaseOrderAction} className="business-form">
            <label>Supplier<select className="admin-input" name="supplier_id" required>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.company_name}</option>)}</select></label>
            <label>Status<select className="admin-input" name="status">{purchaseOrderStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            <Field label="Expected delivery" name="expected_delivery_date" type="date" />
            <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" /></label>
            <div className="business-lines business-form-wide">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="business-line" key={index}>
                  <select className="admin-input" name={`po_product_id_${index}`} aria-label={`Purchase product ${index + 1}`}>
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} {product.sku ? `(${product.sku})` : ""}</option>)}
                  </select>
                  <input className="admin-input" name={`po_quantity_${index}`} type="number" min="0" placeholder="Qty" />
                  <input className="admin-input" name={`po_unit_price_kes_${index}`} type="number" min="0" placeholder="Unit cost" />
                  <input className="admin-input" name={`po_vat_kes_${index}`} type="number" min="0" placeholder="VAT" />
                </div>
              ))}
            </div>
            <div className="business-form-actions"><button className="btn-dark">Create PO</button></div>
          </form>
        </Card>
        <Card title="Receive Goods">
          <form action={receiveGoodsAction} className="business-form">
            <label>Purchase order<select className="admin-input" name="purchase_order_id" required>{purchaseOrders.filter((po) => po.status !== "completed" && po.status !== "cancelled").map((po) => <option key={po.id} value={po.id}>{po.po_number} - {po.supplier.company_name}</option>)}</select></label>
            <Field label="Delivery date" name="delivery_date" type="date" required />
            <Field label="Delivery reference" name="delivery_reference" />
            <label className="business-form-wide">Quantities by PO line<textarea className="admin-input" readOnly value={purchaseOrders.flatMap((po) => po.items.map((item) => `${po.po_number}: ${item.description} ordered ${item.quantity}, received ${item.received_quantity}, field receive_${item.id}`)).join("\n")} /></label>
            {purchaseOrders.flatMap((po) => po.items.map((item) => <Field key={item.id} label={`${po.po_number} ${item.description}`} name={`receive_${item.id}`} type="number" />))}
            <div className="business-form-actions"><button className="btn-dark">Receive stock</button></div>
          </form>
        </Card>
        <Card title="Supplier Invoice And Payment">
          <form action={createSupplierInvoiceAction} className="business-form">
            <label>Purchase order<select className="admin-input" name="purchase_order_id" required>{purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.po_number} - {po.supplier.company_name} - {formatKes(po.total_kes)}</option>)}</select></label>
            <Field label="Supplier reference" name="supplier_reference" />
            <Field label="Invoice date" name="invoice_date" type="date" required />
            <Field label="Due date" name="due_date" type="date" />
            <div className="business-form-actions"><button className="btn-dark">Record supplier invoice</button></div>
          </form>
          <form action={recordSupplierPaymentAction} className="business-form mt-4">
            <label>Supplier invoice<select className="admin-input" name="supplier_invoice_id" required>{supplierInvoices.filter((invoice) => invoice.balance_kes > 0).map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.supplier_invoice_number} - {invoice.supplier.company_name} - {formatKes(invoice.balance_kes)}</option>)}</select></label>
            <Field label="Amount" name="amount_kes" type="number" required />
            <label>Method<select className="admin-input" name="method">{paymentMethods.map((method) => <option key={method} value={method}>{label(method)}</option>)}</select></label>
            <Field label="Reference" name="reference" />
            <div className="business-form-actions"><button className="btn-lite">Record supplier payment</button></div>
          </form>
        </Card>
        <Table headers={["PO", "Supplier", "Items", "Total", "Status", "PDF", "Actions"]} minWidth={1260}>
          {signedPurchaseOrders.map((po) => (
            <tr key={po.id}>
              <td><strong>{po.po_number}</strong><br /><span className="text-slate-500">{po.expected_delivery_date?.toLocaleDateString("en-KE") ?? "No delivery date"}</span></td>
              <td>{po.supplier.company_name}</td>
              <td>{po.items.map((item) => `${item.received_quantity}/${item.quantity} ${item.description}`).join("; ")}</td>
              <td><Money value={po.total_kes} /></td>
              <td><Pill tone={po.status === "completed" ? "green" : po.status === "cancelled" ? "red" : po.status === "partially_received" ? "amber" : "teal"}>{label(po.status)}</Pill></td>
              <td><DocumentLink documents={po.documents} /></td>
              <td><StatusForm id={po.id} statuses={purchaseOrderStatuses} value={po.status} action={updatePurchaseOrderStatusAction} /></td>
            </tr>
          ))}
        </Table>
        <Table headers={["GRN", "Supplier", "PO", "Items", "Delivery date"]} minWidth={980}>
          {goodsReceivedNotes.map((grn) => (
            <tr key={grn.id}>
              <td><strong>{grn.grn_number}</strong></td>
              <td>{grn.supplier.company_name}</td>
              <td>{grn.purchase_order.po_number}</td>
              <td>{grn.items.map((item) => `${item.quantity_received} ${item.product.name}`).join("; ")}</td>
              <td>{grn.delivery_date.toLocaleDateString("en-KE")}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="accounting">
        <PageHeader title="Accounting Reports" copy="Automatic double-entry journals power the trial balance, general ledger, profit and loss, balance sheet and cash position." />
        <KpiGrid>
          <Kpi label="Revenue" value={formatKes(totalSales)} />
          <Kpi label="Expenses" value={formatKes(totalExpenses)} />
          <Kpi label="Estimated profit" value={formatKes(totalSales - totalExpenses)} />
          <Kpi label="Cash position" value={formatKes(totalPayments - totalExpenses - supplierPayments.reduce((sum, payment) => sum + payment.amount_kes, 0))} />
        </KpiGrid>
        <Table headers={["Account", "Type", "Debit", "Credit", "Balance"]} minWidth={980}>
          {accounts.map((account) => {
            const debit = account.lines.filter((line) => line.direction === "debit").reduce((sum, line) => sum + line.amount_kes, 0);
            const credit = account.lines.filter((line) => line.direction === "credit").reduce((sum, line) => sum + line.amount_kes, 0);
            return <tr key={account.id}><td><strong>{account.code}</strong> {account.name}</td><td>{label(account.type)}</td><td><Money value={debit} /></td><td><Money value={credit} /></td><td><Money value={debit - credit} /></td></tr>;
          })}
        </Table>
        <Table headers={["Entry", "Source", "Memo", "Lines", "Date"]} minWidth={1180}>
          {journalEntries.map((entry) => (
            <tr key={entry.id}>
              <td><strong>{entry.entry_number}</strong></td>
              <td>{label(entry.source_type)}</td>
              <td>{entry.memo}</td>
              <td>{entry.lines.map((line) => `${label(line.direction)} ${line.account.code} ${formatKes(line.amount_kes)}`).join("; ")}</td>
              <td>{entry.entry_date.toLocaleDateString("en-KE")}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="compliance">
        <PageHeader title="Kenyan Compliance Preparation" copy="VAT, PAYE, NSSF, SHA/SHIF, Affordable Housing Levy and NITA are tracked from configurable settings for preparation only." />
        <KpiGrid>
          <Kpi label="Compliance deadlines" value={complianceItems.length} />
          <Kpi label="Configured rates" value={complianceSettings.length} />
          <Kpi label="Employees" value={employees.length} />
          <Kpi label="Tax periods" value={taxRecords.length} />
        </KpiGrid>
        <Card title="Compliance Calendar Item">
          <form action={createComplianceItemAction} className="business-form">
            <Field label="Title" name="title" required />
            <Field label="Agency" name="agency" placeholder="KRA, NSSF, SHA, NITA" required />
            <label>Type<select className="admin-input" name="compliance_type"><option value="vat_deadline">VAT deadline</option><option value="paye_deadline">PAYE deadline</option><option value="licence_expiry">Licence expiry</option><option value="certificate_expiry">Certificate expiry</option><option value="statutory_payment">Statutory payment</option><option value="other">Other</option></select></label>
            <Field label="Due date" name="due_date" type="date" required />
            <Field label="Amount" name="amount_kes" type="number" />
            <Field label="Reference" name="reference" />
            <div className="business-form-actions"><button className="btn-dark">Save calendar item</button></div>
          </form>
        </Card>
        <Card title="Employee Payroll Structure">
          <form action={createEmployeeAction} className="business-form">
            <Field label="Full name" name="full_name" required />
            <Field label="KRA PIN" name="kra_pin" />
            <Field label="National ID" name="national_id" />
            <Field label="NSSF number" name="nssf_number" />
            <Field label="SHA/SHIF number" name="sha_number" />
            <Field label="Base salary" name="base_salary_kes" type="number" required />
            <div className="business-form-actions"><button className="btn-lite">Save employee</button></div>
          </form>
        </Card>
        <Table headers={["Setting", "Agency", "Value", "Notes"]} minWidth={980}>
          {complianceSettings.map((setting) => <tr key={setting.id}><td>{setting.name}</td><td>{setting.agency}</td><td>{setting.value ? `${setting.value.toString()} ${setting.value_type}` : "Configure"}</td><td>{setting.notes}</td></tr>)}
        </Table>
        <Table headers={["Deadline", "Agency", "Type", "Due", "Status"]} minWidth={980}>
          {upcomingCompliance.map((item) => <tr key={item.id}><td>{item.title}</td><td>{item.agency}</td><td>{label(item.compliance_type)}</td><td>{item.due_date.toLocaleDateString("en-KE")}</td><td><Pill tone={item.status === "overdue" ? "red" : "teal"}>{label(item.status)}</Pill></td></tr>)}
        </Table>
        <Table headers={["Employee", "KRA PIN", "NSSF", "SHA/SHIF", "Salary"]} minWidth={980}>
          {employees.map((employee) => <tr key={employee.id}><td>{employee.full_name}</td><td>{employee.kra_pin ?? "Not set"}</td><td>{employee.nssf_number ?? "Not set"}</td><td>{employee.sha_number ?? "Not set"}</td><td><Money value={employee.base_salary_kes} /></td></tr>)}
        </Table>
      </section>

      <section id="etims">
        <PageHeader title="eTIMS Preparation" copy="Tracks readiness, retry logs, control numbers and future verification data. This does not submit to KRA or claim certification." />
        <Card title="Company Compliance Settings">
          <form action={updateBusinessSettingsAction} className="business-form">
            <Field label="KRA PIN" name="kra_pin" defaultValue={settingsMap.get("kra_pin")} />
            <Field label="VAT registration number" name="vat_registration_number" defaultValue={settingsMap.get("vat_registration_number")} />
            <label className="business-form-wide">Branch details<textarea className="admin-input" name="branch_details" defaultValue={settingsMap.get("branch_details") ?? ""} /></label>
            <label className="business-form-wide">Business legal information<textarea className="admin-input" name="business_legal_information" defaultValue={settingsMap.get("business_legal_information") ?? ""} /></label>
            <div className="business-form-actions"><button className="btn-dark">Save settings</button></div>
          </form>
        </Card>
        <Card title="Prepare Invoice For eTIMS">
          <form action={prepareEtimsRecordAction} className="business-form">
            <label>Invoice<select className="admin-input" name="invoice_id" required>{invoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number} - {invoice.customer.name} - {label(invoice.etims_status)}</option>)}</select></label>
            <div className="business-form-actions"><button className="btn-dark">Mark pending</button></div>
          </form>
        </Card>
        <Table headers={["Invoice", "Customer", "Amount", "Status", "Submitted", "Control", "Error/Log", "Actions"]} minWidth={1240}>
          {etimsRecords.map((record) => <tr key={record.id}>
            <td>{record.invoice.invoice_number}</td>
            <td>{record.invoice.customer.name}</td>
            <td><Money value={record.invoice.total_kes} /></td>
            <td><Pill tone={record.status === "accepted" ? "green" : record.status === "failed" || record.status === "rejected" ? "red" : "amber"}>{label(record.status)}</Pill></td>
            <td>{record.submitted_at?.toLocaleString("en-KE") ?? "Not submitted"}</td>
            <td>{record.control_number ?? "Pending"}</td>
            <td>{record.last_error ?? record.logs[0]?.message ?? "No logs"}</td>
            <td className="business-actions-cell">
              <form action={submitEtimsRecordAction}><input type="hidden" name="id" value={record.id} /><button className="btn-lite">Submit</button></form>
              <form action={retryEtimsSubmissionAction}><input type="hidden" name="id" value={record.id} /><button className="btn-lite">Retry</button></form>
              <details><summary className="btn-lite">History</summary><pre className="business-json">{JSON.stringify({ response: record.response ?? record.reference_information ?? {}, logs: record.logs.map((log) => ({ at: log.created_at, status: log.status, message: log.message })) }, null, 2)}</pre></details>
            </td>
          </tr>)}
        </Table>
      </section>

      <section id="mpesa-reconciliation">
        <PageHeader title="M-Pesa Reconciliation" copy="Invoice M-Pesa requests are receipted only after a verified callback or duplicate-safe manual settlement." actions={<Link className="btn-lite" href="/admin/payments/mpesa-reconciliation">Open full reconciliation</Link>} />
        <Table headers={["Date", "Customer", "Invoice", "Amount", "Transaction code", "Status", "Admin message", "Receipt"]} minWidth={1180}>
          {mpesaTransactions.map((transaction) => (
            <tr key={transaction.id}>
              <td>{transaction.created_at.toLocaleString("en-KE")}</td>
              <td>{transaction.customer.name}</td>
              <td>{transaction.invoice.invoice_number}</td>
              <td><Money value={transaction.amount} /></td>
              <td>{transaction.transaction_reference ?? transaction.checkout_request_id ?? "Pending"}</td>
              <td><Pill tone={transaction.payment_status === "completed" ? "green" : transaction.payment_status === "failed" ? "red" : "amber"}>{label(transaction.payment_status)}</Pill></td>
              <td>{mpesaAdminMessage(transaction.payment_status, transaction.failure_reason)}</td>
              <td>{transaction.payment?.receipt?.receipt_number ?? "Not receipted"}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="notifications">
        <PageHeader title="Notification History" copy="Transactional notification records for future email delivery." />
        <Table headers={["Date", "User", "Type", "Status", "Sent"]} minWidth={900}>
          {notificationHistory.map((notification) => (
            <tr key={notification.id}>
              <td>{notification.created_at.toLocaleString("en-KE")}</td>
              <td>{notification.user?.email ?? notification.user_id ?? "System"}</td>
              <td>{label(notification.notification_type)}</td>
              <td><Pill tone={notification.status === "sent" ? "green" : notification.status === "failed" ? "red" : "amber"}>{label(notification.status)}</Pill></td>
              <td>{notification.sent_at?.toLocaleString("en-KE") ?? "Pending"}</td>
            </tr>
          ))}
        </Table>
      </section>

      <section id="tenders">
        <PageHeader title="Tender Assistant" copy="Tender workspaces keep documents, requirements, product matching, pricing notes and human submission checklists together." />
        <Card title="Create Tender Workspace">
          <form action={createTenderAction} className="business-form">
            <Field label="Tender title" name="tender_title" required />
            <Field label="Organization" name="organization" required />
            <Field label="Tender number" name="tender_number" />
            <Field label="Closing date" name="closing_date" type="date" />
            <Field label="Tender value" name="tender_value_kes" type="number" />
            <label>Status<select className="admin-input" name="status">{tenderStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
            <label className="business-form-wide">Technical notes<textarea className="admin-input" name="technical_notes" /></label>
            <label className="business-form-wide">Pricing notes<textarea className="admin-input" name="pricing_notes" /></label>
            <div className="business-form-actions"><button className="btn-dark">Create workspace</button></div>
          </form>
        </Card>
        <Table headers={["Tender", "Organization", "Closing", "Value", "Status", "Checklist", "Actions"]} minWidth={1260}>
          {tenders.map((tender) => (
            <tr key={tender.id}>
              <td><strong>{tender.tender_title}</strong><br /><span className="text-slate-500">{tender.tender_number ?? tender.id}</span></td>
              <td>{tender.organization}</td>
              <td>{tender.closing_date?.toLocaleDateString("en-KE") ?? "Not set"}</td>
              <td>{tender.tender_value_kes ? <Money value={tender.tender_value_kes} /> : "Not set"}</td>
              <td><Pill tone={tender.status === "won" ? "green" : tender.status === "lost" || tender.status === "cancelled" ? "red" : "teal"}>{label(tender.status)}</Pill></td>
              <td>{tender.requirements.filter((item) => item.is_complete).length}/{tender.requirements.length}</td>
              <td><StatusForm id={tender.id} statuses={tenderStatuses} value={tender.status} action={updateTenderStatusAction} /></td>
            </tr>
          ))}
        </Table>
        {tenders.slice(0, 3).map((tender) => (
          <Card key={tender.id} title={`${tender.tender_title} Checklist`}>
            {tender.requirements.map((requirement) => (
              <form key={requirement.id} action={updateTenderRequirementAction} className="business-status-form">
                <input type="hidden" name="id" value={requirement.id} />
                <label className="business-check"><input type="checkbox" name="is_complete" defaultChecked={requirement.is_complete} /> {requirement.requirement}</label>
                <input className="admin-input" name="notes" defaultValue={requirement.notes ?? ""} placeholder="Notes" />
                <button className="btn-lite">Save</button>
              </form>
            ))}
          </Card>
        ))}
      </section>

      <section id="vault">
        <PageHeader title="Company Document Vault" copy="Company, tax, tender, supplier, customer and contract documents are stored in Supabase Storage with expiry alerts." />
        <Card title="Upload Document">
          <form action={uploadCompanyDocumentAction} className="business-form">
            <Field label="Title" name="title" required />
            <label>Category<select className="admin-input" name="category">{documentCategories.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select></label>
            <Field label="Expiry date" name="expiry_date" type="date" />
            <Field label="Reminder date" name="reminder_date" type="date" />
            <label>File<input className="admin-input" name="file" type="file" required /></label>
            <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" /></label>
            <div className="business-form-actions"><button className="btn-dark">Upload</button></div>
          </form>
        </Card>
        <Table headers={["Document", "Category", "Expiry", "Reminder", "Notes"]} minWidth={980}>
          {signedCompanyDocuments.map((document) => <tr key={document.id}><td>{document.signed_url ? <a className="btn-lite" href={document.signed_url} target="_blank" rel="noreferrer">{document.title}</a> : document.title}</td><td>{label(document.category)}</td><td>{document.expiry_date?.toLocaleDateString("en-KE") ?? "None"}</td><td>{document.reminder_date?.toLocaleDateString("en-KE") ?? "None"}</td><td>{document.notes ?? ""}</td></tr>)}
        </Table>
      </section>

      <section id="documents">
        <PageHeader title="Document Management" copy="Generated business documents and uploaded attachments stored through Supabase Storage." />
        <Table headers={["Document", "Type", "Storage path", "Created"]} minWidth={980}>
          {signedDocuments.map((document) => (
            <tr key={document.id}>
              <td>{document.signed_url ? <a className="btn-lite" href={document.signed_url} target="_blank" rel="noreferrer">{document.title}</a> : document.title}</td>
              <td>{label(document.document_type)}</td>
              <td>{document.bucket}/{document.storage_path}</td>
              <td>{document.created_at.toLocaleString("en-KE")}</td>
            </tr>
          ))}
        </Table>
      </section>
    </>
  );
}

function Message({ success, error }: { success?: string; error?: string }) {
  if (!success && !error) return null;
  return <div className={`business-message ${error ? "error" : "success"}`}>{error ?? success}</div>;
}

function Field({ label: fieldLabel, name, type = "text", required, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string | number | null; placeholder?: string }) {
  return <label>{fieldLabel}<input className="admin-input" name={name} type={type} required={required} defaultValue={defaultValue ?? ""} placeholder={placeholder} /></label>;
}

function DocumentForm({ customers, products, action, submit, includeQuoteStatus }: {
  customers: Array<{ id: string; name: string; company_name: string | null }>;
  products: Array<{ id: string; name: string; sku: string | null; price_kes: number }>;
  action: (formData: FormData) => Promise<void>;
  submit: string;
  includeQuoteStatus?: boolean;
}) {
  return (
    <Card title={submit}>
      <form action={action} className="business-form">
        <label>Customer<select className="admin-input" name="customer_id" required>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}{customer.company_name ? ` - ${customer.company_name}` : ""}</option>)}</select></label>
        {includeQuoteStatus ? <label>Status<select className="admin-input" name="status">{quoteStatuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label> : null}
        <Field label="Valid until" name="valid_until" type="date" />
        <label className="business-check"><input type="checkbox" name="vat_enabled" /> Apply VAT at 16%</label>
        <label className="business-form-wide">Notes<textarea className="admin-input" name="notes" /></label>
        <label className="business-form-wide">Terms and conditions<textarea className="admin-input" name="terms" defaultValue="Payment due as agreed. Quotation validity is subject to stock availability." /></label>
        <div className="business-lines business-form-wide">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="business-line" key={index}>
              <select className="admin-input" name={`item_product_id_${index}`} aria-label={`Product ${index + 1}`}>
                <option value="">Manual service</option>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name} {product.sku ? `(${product.sku})` : ""} - {formatKes(product.price_kes)}</option>)}
              </select>
              <input className="admin-input" name={`item_description_${index}`} placeholder="Service or override description" />
              <input className="admin-input" name={`item_quantity_${index}`} type="number" min="0" placeholder="Qty" />
              <input className="admin-input" name={`item_unit_price_kes_${index}`} type="number" min="0" placeholder="Unit KES" />
              <input className="admin-input" name={`item_discount_kes_${index}`} type="number" min="0" placeholder="Discount" />
            </div>
          ))}
        </div>
        <div className="business-form-actions"><button className="btn-dark">{submit}</button></div>
      </form>
    </Card>
  );
}

function StatusForm<T extends string>({ id, statuses, value, action }: { id: string; statuses: T[]; value: T; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="business-status-form">
      <input type="hidden" name="id" value={id} />
      <select className="admin-input" name="status" defaultValue={value}>{statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
      <button className="btn-lite">Save</button>
    </form>
  );
}

async function signDocuments<T extends { bucket: string; storage_path: string }>(documents: T[]) {
  return Promise.all(documents.map(async (document) => ({
    ...document,
    signed_url: await signedBusinessDocumentUrl(document.storage_path, document.bucket).catch(() => null)
  })));
}

function DocumentLink({ documents, labelText = "Open PDF", emptyText = "No document" }: { documents: Array<{ signed_url?: string | null }>; labelText?: string; emptyText?: string }) {
  const document = documents.find((item) => item.signed_url);
  return document?.signed_url ? <a className="btn-lite" href={document.signed_url} target="_blank" rel="noreferrer">{labelText}</a> : emptyText ? <span className="text-slate-500">{emptyText}</span> : null;
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
