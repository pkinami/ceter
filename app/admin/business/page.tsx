import { CeterAdminWorkspace } from "@/components/admin/CeterAdminWorkspace";
import { BusinessWorkflowClient } from "@/components/admin/BusinessWorkflowClient";
import { CeterCombobox, type CeterComboboxOption } from "@/components/admin/CeterCombobox";
import type { AdminModule } from "@/lib/admin/modules";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import {
  createExpenseAction,
  createPurchaseDebitNoteAction,
  createPurchaseOrderAction,
  createQuoteAction,
  createRecurringExpenseScheduleAction,
  createRecurringInvoiceScheduleAction,
  createSalesCreditNoteAction,
  createSupplierInvoiceAction,
  prepareEtimsRecordAction,
  recordPaymentAction,
  recordSupplierPaymentAction,
  upsertCustomerAction,
  upsertSupplierAction
} from "./actions";

type CustomerRecord = { name: string; company_name: string | null; email: string | null; invoices: Array<{ balance_kes: number }> };
type QuoteRecord = { quote_number: string; customer: { name: string }; status: string; total_kes: number };
type CreditNoteRecord = { credit_note_number: string; customer: { name: string }; status: string; amount_kes: number };
type RecurringInvoiceRecord = { name: string; customer: { name: string }; frequency: string; amount_kes: number };
type PaymentRecord = { payment_number: string; customer: { name: string }; invoice: { invoice_number: string } | null; amount_kes: number };
type ExpenseRecord = { expense_number: string; category: { name: string } | null; method: string; amount_kes: number };
type RecurringExpenseRecord = { name: string; category: { name: string } | null; frequency: string; amount_kes: number };
type SupplierRecord = { company_name: string; contact_person: string | null; email: string | null; phone: string | null };
type PurchaseOrderRecord = { po_number: string; supplier: { company_name: string }; status: string; total_kes: number };
type DebitNoteRecord = { debit_note_number: string; supplier: { company_name: string }; status: string; amount_kes: number };
type SupplierInvoiceRecord = { supplier_invoice_number: string; supplier: { company_name: string }; status: string; balance_kes: number };
type EtimsRecord = { invoice: { invoice_number: string; customer: { name: string } }; status: string; last_error: string | null };
type RecordsPanelProps = {
  tab: string;
  customers: CustomerRecord[];
  customerCategories: unknown[];
  quotes: QuoteRecord[];
  invoices: unknown[];
  creditNotes: CreditNoteRecord[];
  recurringInvoices: RecurringInvoiceRecord[];
  payments: PaymentRecord[];
  expenses: ExpenseRecord[];
  recurringExpenses: RecurringExpenseRecord[];
  suppliers: SupplierRecord[];
  purchaseOrders: PurchaseOrderRecord[];
  debitNotes: DebitNoteRecord[];
  supplierInvoices: SupplierInvoiceRecord[];
  etims: EtimsRecord[];
};

const tabModules: Record<string, AdminModule> = {
  procurement: "purchases",
  expenses: "expenses",
  accounting: "accounting",
  reports: "reports",
  users: "users",
  customers: "customers",
  payments: "transactions",
  suppliers: "purchases",
  purchases: "purchases",
  "debit-notes": "purchases",
  "pay-purchase": "purchases",
  "expense-categories": "expenses",
  "recurring-expenses": "expenses",
  journals: "accounting",
  assets: "accounting",
  "general-ledger": "accounting",
  "trial-balance": "accounting",
  "balance-sheet": "accounting",
  cashflow: "accounting",
  "credit-notes": "sales",
  "recurring-invoices": "sales",
  "customer-categories": "customers",
  etims: "settings",
  help: "help"
};

export default async function BusinessPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawTab = Array.isArray(params?.tab) ? params?.tab[0] : params?.tab;
  const tab = rawTab ?? "sales";
  if (["sales", "quotes", "invoices", "payments", "credit-notes", "recurring-invoices", "customers", "customer-categories", "expenses", "expense-categories", "recurring-expenses", "procurement", "purchases", "debit-notes", "suppliers", "pay-purchase", "etims", "help"].includes(tab)) {
    return <BusinessFormWorkspace tab={tab} success={single(params?.success)} error={single(params?.error)} initialModal={modalParam(params?.modal)} />;
  }
  return <CeterAdminWorkspace module={tabModules[tab] ?? "sales"} />;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function BusinessFormWorkspace({ tab, success, error, initialModal }: { tab: string; success?: string; error?: string; initialModal?: "customer" | "product" | "expense" | "payment" }) {
  const [customers, customerCategories, products, categories, expenseCategories, invoices, quotes, payments, expenses, suppliers, purchaseOrders, supplierInvoices, etims, creditNotes, debitNotes, recurringInvoices, recurringExpenses] = await Promise.all([
    prisma.customer.findMany({ orderBy: { updated_at: "desc" }, take: 50, include: { category: true, invoices: true, payments: true, quotes: true, orders: true } }),
    prisma.customerCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { customers: true } } } }),
    prisma.product.findMany({ where: { archived_at: null }, orderBy: { name: "asc" }, take: 60, select: { id: true, name: true, sku: true, category_id: true, stock_quantity: true, price_kes: true, cost_price_kes: true } }),
    prisma.category.findMany({ orderBy: [{ parent_id: "asc" }, { sort_order: "asc" }, { name: "asc" }], take: 100, select: { id: true, name: true, parent_id: true } }),
    prisma.expenseCategory.findMany({ where: { is_active: true }, orderBy: { name: "asc" }, take: 80, select: { id: true, name: true } }),
    prisma.invoice.findMany({ where: { status: { not: "cancelled" } }, orderBy: { created_at: "desc" }, take: 20, include: { customer: true } }),
    prisma.quote.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { customer: true } }),
    prisma.payment.findMany({ orderBy: { paid_at: "desc" }, take: 20, include: { customer: true, invoice: true } }),
    prisma.expense.findMany({ orderBy: { expense_date: "desc" }, take: 20, include: { category: true } }),
    prisma.supplier.findMany({ orderBy: { company_name: "asc" }, take: 30 }),
    prisma.purchaseOrder.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { supplier: true, items: true } }),
    prisma.supplierInvoice.findMany({ where: { status: { not: "cancelled" } }, orderBy: { invoice_date: "desc" }, take: 20, include: { supplier: true } }),
    prisma.etimsRecord.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { invoice: { include: { customer: true } } } }),
    prisma.salesCreditNote.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { customer: true, invoice: true, payment: true } }),
    prisma.purchaseDebitNote.findMany({ orderBy: { created_at: "desc" }, take: 20, include: { supplier: true, supplier_invoice: true, purchase_order: true } }),
    prisma.recurringInvoiceSchedule.findMany({ orderBy: { next_run_at: "asc" }, take: 20, include: { customer: true } }),
    prisma.recurringExpenseSchedule.findMany({ orderBy: { next_run_at: "asc" }, take: 20, include: { category: true } })
  ]);
  const title = titles[tab] ?? "Business";
  const openInvoices = invoices.filter((invoice) => invoice.balance_kes > 0);
  const openSupplierInvoices = supplierInvoices.filter((invoice) => invoice.balance_kes > 0);
  const modernTabs = ["sales", "quotes", "invoices", "payments", "customers", "customer-categories", "expenses", "expense-categories"];

  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>{sectionFor(tab)}</p>
          <h1>{title}</h1>
          <span>Database-backed forms and records for the selected AccurateBook-style workspace.</span>
        </div>
        <div className="ceter-admin-safe-mode">Live Ceter data</div>
      </div>
      {success ? <div className="ceter-admin-message success">{success}</div> : null}
      {error ? <div className="ceter-admin-message error">{error}</div> : null}

      {modernTabs.includes(tab) ? (
        <BusinessWorkflowClient
          tab={tab}
          initialModal={initialModal}
          customers={customers}
          customerCategories={customerCategories.map((category) => ({ id: category.id, name: category.name, description: category.description, count: category._count.customers }))}
          products={products}
          categories={categories}
          expenseCategories={expenseCategories}
          invoices={tab === "payments" ? openInvoices : invoices}
          quotes={quotes}
        />
      ) : null}

      <section className="ceter-admin-grid">
        <div className="ceter-admin-stack">
          {!modernTabs.includes(tab) && ["sales", "quotes"].includes(tab) ? <QuotePanel customers={customers} products={products} title={tab === "sales" ? "Make Sale" : "Create Quotation"} /> : null}
          {!modernTabs.includes(tab) && tab === "payments" ? <PaymentPanel invoices={openInvoices} /> : null}
          {!modernTabs.includes(tab) && ["customers", "customer-categories"].includes(tab) ? <CustomerPanel categories={customerCategories} /> : null}
          {!modernTabs.includes(tab) && ["expenses", "expense-categories"].includes(tab) ? <ExpensePanel /> : null}
          {tab === "suppliers" ? <SupplierPanel /> : null}
          {tab === "procurement" ? <PurchaseOrderPanel suppliers={suppliers} products={products} /> : null}
          {tab === "purchases" ? <SupplierInvoicePanel purchaseOrders={purchaseOrders} /> : null}
          {tab === "debit-notes" ? <DebitNotePanel suppliers={suppliers} purchaseOrders={purchaseOrders} supplierInvoices={supplierInvoices} /> : null}
          {tab === "pay-purchase" ? <SupplierPaymentPanel invoices={openSupplierInvoices} /> : null}
          {tab === "etims" ? <EtimsPanel invoices={invoices} /> : null}
          {tab === "credit-notes" ? <CreditNotePanel customers={customers} invoices={invoices} payments={payments} /> : null}
          {tab === "recurring-invoices" ? <RecurringInvoicePanel customers={customers} /> : null}
          {tab === "recurring-expenses" ? <RecurringExpensePanel /> : null}
          {tab === "help" ? <ReadOnlyPanel title="Help and Support" body="Use the sidebar to move through dashboard, inventory, sales, customers, transactions, purchases, expenses, accounting, reports, user management, branches, settings and help." /> : null}
          {!modernTabs.includes(tab) ? <RecordsPanel tab={tab} customers={customers} customerCategories={customerCategories} quotes={quotes} invoices={invoices} payments={payments} expenses={expenses} suppliers={suppliers} purchaseOrders={purchaseOrders} supplierInvoices={supplierInvoices} etims={etims} creditNotes={creditNotes} debitNotes={debitNotes} recurringInvoices={recurringInvoices} recurringExpenses={recurringExpenses} /> : null}
        </div>
        <aside className="ceter-admin-stack">
          <article className="ceter-admin-side-panel">
            <div className="ceter-admin-side-title"><h2>Connected Data</h2></div>
            <dl>
              <div><dt>Customers</dt><dd>{customers.length}</dd></div>
              <div><dt>Products</dt><dd>{products.length}</dd></div>
              <div><dt>Invoices</dt><dd>{invoices.length}</dd></div>
              <div><dt>Suppliers</dt><dd>{suppliers.length}</dd></div>
            </dl>
          </article>
        </aside>
      </section>
    </div>
  );
}

function modalParam(value: string | string[] | undefined) {
  const modal = single(value);
  return modal === "customer" || modal === "product" || modal === "expense" || modal === "payment" ? modal : undefined;
}

const titles: Record<string, string> = {
  sales: "Make Sale",
  quotes: "Quotations",
  invoices: "Invoices",
  payments: "Receive Payments",
  customers: "Customers list",
  "customer-categories": "Customers categories",
  expenses: "Expense list",
  "expense-categories": "Expense categories",
  "recurring-expenses": "Recurring expenses",
  procurement: "Purchases orders",
  purchases: "Purchases",
  "debit-notes": "Debit notes",
  suppliers: "Suppliers",
  "pay-purchase": "Pay purchase",
  "credit-notes": "Credit Notes",
  "recurring-invoices": "Recurring Invoices",
  etims: "eTIMS",
  help: "Help"
};

const customerTypeOptions = optionsFromPairs([["individual", "Individual"], ["business", "Business"], ["government", "Government"], ["ngo", "NGO"]]);
const quoteStatusOptions = optionsFromPairs([["draft", "Draft"], ["sent", "Sent"], ["accepted", "Accepted"]]);
const paymentMethodOptions = optionsFromPairs([["mpesa", "M-Pesa"], ["bank_transfer", "Bank transfer"], ["cash", "Cash"], ["card", "Card"]]);
const supplierPaymentMethodOptions = optionsFromPairs([["bank_transfer", "Bank transfer"], ["cash", "Cash"], ["mpesa", "M-Pesa"]]);
const recurringFrequencyOptions = optionsFromPairs([["monthly", "Monthly"], ["weekly", "Weekly"], ["quarterly", "Quarterly"], ["annual", "Annual"]]);
const lifecycleStatusOptions = optionsFromPairs([["active", "Active"], ["paused", "Paused"], ["cancelled", "Cancelled"]]);
const purchaseStatusOptions = optionsFromPairs([["draft", "Draft"], ["sent", "Sent"], ["confirmed", "Confirmed"]]);
const documentStatusOptions = optionsFromPairs([["draft", "Draft"], ["issued", "Issued"], ["void", "Void"]]);

function sectionFor(tab: string) {
  if (["sales", "quotes", "payments", "credit-notes", "recurring-invoices"].includes(tab)) return "Sales";
  if (["customers", "customer-categories"].includes(tab)) return "Customers";
  if (["expenses", "expense-categories", "recurring-expenses"].includes(tab)) return "Expenses";
  if (["procurement", "purchases", "debit-notes", "suppliers", "pay-purchase"].includes(tab)) return "Purchases";
  if (tab === "etims") return "Settings / Integrations";
  return "System";
}

function QuotePanel({ customers, products, title }: { customers: Array<{ id: string; name: string }>; products: Array<{ id: string; name: string; price_kes: number; cost_price_kes: number | null }>; title: string }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>{title}</h2></div></div>
      <form className="ceter-admin-form" action={createQuoteAction}>
        <label>Customer<SelectCustomer customers={customers} /></label>
        <CeterCombobox label="Status" name="status" defaultValue="sent" options={quoteStatusOptions} />
        <label>Valid until<input name="valid_until" type="date" /></label>
        <LineItems products={products} />
        <label className="wide">Notes<textarea name="notes" /></label>
        <label className="wide">Terms<textarea name="terms" defaultValue="Payment due on invoice. Goods remain property of Ceter Technologies until fully paid." /></label>
        <label className="wide"><span><input name="vat_enabled" type="checkbox" /> Apply VAT</span></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Save</button></div>
      </form>
    </article>
  );
}

function CustomerPanel({ categories }: { categories: Array<{ id: string; name: string }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Customer</h2></div></div>
      <form className="ceter-admin-form" action={upsertCustomerAction}>
        <label>Name<input name="name" required /></label><label>Company<input name="company_name" /></label>
        <CeterCombobox label="Category" name="category_id" placeholder="Search categories" options={[{ value: "", label: "Uncategorised" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
        <CeterCombobox label="Type" name="customer_type" defaultValue="business" options={customerTypeOptions} />
        <label>Phone<input name="phone" /></label><label>Email<input name="email" type="email" /></label><label>KRA PIN<input name="tax_pin" /></label>
        <label className="wide">Address<input name="address_line_1" /></label><label>City<input name="address_city" /></label><label>Region<input name="address_region" /></label>
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Save Customer</button></div>
      </form>
    </article>
  );
}

function PaymentPanel({ invoices }: { invoices: Array<{ id: string; invoice_number: string; balance_kes: number; customer: { name: string } }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Receive Payment</h2></div></div>
      <form className="ceter-admin-form" action={recordPaymentAction}>
        <CeterCombobox label="Invoice" name="invoice_id" required placeholder="Search invoices" options={invoices.map((invoice) => ({ value: invoice.id, label: invoice.invoice_number, detail: `${invoice.customer.name} - ${formatKes(invoice.balance_kes)}` }))} />
        <label>Amount<input name="amount_kes" type="number" min="1" required /></label>
        <CeterCombobox label="Method" name="method" defaultValue="mpesa" options={paymentMethodOptions} />
        <label>Reference<input name="reference" /></label><label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Record Payment</button></div>
      </form>
    </article>
  );
}

function ExpensePanel() {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Expense</h2></div></div>
      <form className="ceter-admin-form" action={createExpenseAction}>
        <label>Category<input name="category_name" required /></label><label>Supplier<input name="supplier" /></label><label>Amount<input name="amount_kes" type="number" min="1" required /></label>
        <CeterCombobox label="Method" name="method" defaultValue="cash" options={paymentMethodOptions} />
        <label>Date<input name="expense_date" type="date" /></label><label>Attachment<input name="attachment" type="file" /></label>
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Record Expense</button></div>
      </form>
    </article>
  );
}

function RecurringExpensePanel() {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Recurring Expense</h2></div></div>
      <form className="ceter-admin-form" action={createRecurringExpenseScheduleAction}>
        <label>Name<input name="name" required /></label><label>Category<input name="category_name" /></label><label>Supplier<input name="supplier" /></label>
        <label>Amount<input name="amount_kes" type="number" min="1" required /></label>
        <CeterCombobox label="Frequency" name="frequency" defaultValue="monthly" options={recurringFrequencyOptions} />
        <label>Next run<input name="next_run_at" type="date" required /></label>
        <CeterCombobox label="Method" name="method" defaultValue="cash" options={paymentMethodOptions} />
        <CeterCombobox label="Status" name="status" defaultValue="active" options={lifecycleStatusOptions} />
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Schedule Expense</button></div>
      </form>
    </article>
  );
}

function SupplierPanel() {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Supplier</h2></div></div>
      <form className="ceter-admin-form" action={upsertSupplierAction}>
        <label>Company<input name="company_name" required /></label><label>Contact<input name="contact_person" /></label><label>Phone<input name="phone" /></label>
        <label>Email<input name="email" type="email" /></label><label>KRA PIN<input name="kra_pin" /></label><label>Address<input name="address" /></label>
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Save Supplier</button></div>
      </form>
    </article>
  );
}

function PurchaseOrderPanel({ suppliers, products }: { suppliers: Array<{ id: string; company_name: string }>; products: Array<{ id: string; name: string; cost_price_kes: number | null; price_kes: number }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Purchase Order</h2></div></div>
      <form className="ceter-admin-form" action={createPurchaseOrderAction}>
        <CeterCombobox label="Supplier" name="supplier_id" required placeholder="Search suppliers" options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.company_name }))} />
        <CeterCombobox label="Status" name="status" defaultValue="draft" options={purchaseStatusOptions} />
        <label>Expected delivery<input name="expected_delivery_date" type="date" /></label>
        {Array.from({ length: 3 }, (_, index) => <div className="wide ceter-admin-line-row" key={index}><CeterCombobox name={`po_product_id_${index}`} placeholder="Search products" compact options={[{ value: "", label: "Product" }, ...products.map((product) => ({ value: product.id, label: product.name }))]} /><input name={`po_quantity_${index}`} type="number" min="0" placeholder="Qty" /><input name={`po_unit_price_kes_${index}`} type="number" min="0" placeholder="Unit cost" /><input name={`po_vat_kes_${index}`} type="number" min="0" placeholder="VAT" /></div>)}
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Create PO</button></div>
      </form>
    </article>
  );
}

function SupplierInvoicePanel({ purchaseOrders }: { purchaseOrders: Array<{ id: string; po_number: string; supplier: { company_name: string }; total_kes: number }> }) {
  return <SimpleSelectForm title="Supplier Invoice" action={createSupplierInvoiceAction} selectName="purchase_order_id" options={purchaseOrders.map((po) => ({ value: po.id, label: `${po.po_number} - ${po.supplier.company_name} - ${formatKes(po.total_kes)}` }))} fields={[["supplier_reference", "Supplier reference"], ["invoice_date", "Invoice date", "date"], ["due_date", "Due date", "date"]]} button="Record Purchase" />;
}

function DebitNotePanel({ suppliers, purchaseOrders, supplierInvoices }: { suppliers: Array<{ id: string; company_name: string }>; purchaseOrders: Array<{ id: string; po_number: string; supplier: { company_name: string } }>; supplierInvoices: Array<{ id: string; supplier_invoice_number: string; supplier: { company_name: string } }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Debit Note</h2></div></div>
      <form className="ceter-admin-form" action={createPurchaseDebitNoteAction}>
        <CeterCombobox label="Supplier" name="supplier_id" required placeholder="Search suppliers" options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.company_name }))} />
        <CeterCombobox label="Supplier invoice" name="supplier_invoice_id" placeholder="Search supplier invoices" options={[{ value: "", label: "None" }, ...supplierInvoices.map((invoice) => ({ value: invoice.id, label: invoice.supplier_invoice_number, detail: invoice.supplier.company_name }))]} />
        <CeterCombobox label="Purchase order" name="purchase_order_id" placeholder="Search purchase orders" options={[{ value: "", label: "None" }, ...purchaseOrders.map((po) => ({ value: po.id, label: po.po_number, detail: po.supplier.company_name }))]} />
        <label>Amount<input name="amount_kes" type="number" min="1" required /></label><label>Reference<input name="reference" /></label>
        <CeterCombobox label="Status" name="status" defaultValue="draft" options={documentStatusOptions} />
        <label className="wide">Reason<textarea name="reason" required /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Create Debit Note</button></div>
      </form>
    </article>
  );
}

function SupplierPaymentPanel({ invoices }: { invoices: Array<{ id: string; supplier_invoice_number: string; balance_kes: number; supplier: { company_name: string } }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Pay Purchase</h2></div></div>
      <form className="ceter-admin-form" action={recordSupplierPaymentAction}>
        <CeterCombobox label="Supplier invoice" name="supplier_invoice_id" required placeholder="Search supplier invoices" options={invoices.map((invoice) => ({ value: invoice.id, label: invoice.supplier_invoice_number, detail: `${invoice.supplier.company_name} - ${formatKes(invoice.balance_kes)}` }))} />
        <label>Amount<input name="amount_kes" type="number" min="1" required /></label><CeterCombobox label="Method" name="method" defaultValue="bank_transfer" options={supplierPaymentMethodOptions} />
        <label>Reference<input name="reference" /></label><label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Pay Supplier</button></div>
      </form>
    </article>
  );
}

function EtimsPanel({ invoices }: { invoices: Array<{ id: string; invoice_number: string; customer: { name: string } }> }) {
  return <SimpleSelectForm title="eTIMS" action={prepareEtimsRecordAction} selectName="invoice_id" options={invoices.map((invoice) => ({ value: invoice.id, label: `${invoice.invoice_number} - ${invoice.customer.name}` }))} fields={[]} button="Prepare eTIMS Record" />;
}

function CreditNotePanel({ customers, invoices, payments }: { customers: Array<{ id: string; name: string }>; invoices: Array<{ id: string; invoice_number: string; customer: { name: string } }>; payments: Array<{ id: string; payment_number: string; customer: { name: string } }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Credit Note</h2></div></div>
      <form className="ceter-admin-form" action={createSalesCreditNoteAction}>
        <label>Customer<SelectCustomer customers={customers} /></label>
        <CeterCombobox label="Invoice" name="invoice_id" placeholder="Search invoices" options={[{ value: "", label: "None" }, ...invoices.map((invoice) => ({ value: invoice.id, label: invoice.invoice_number, detail: invoice.customer.name }))]} />
        <CeterCombobox label="Payment" name="payment_id" placeholder="Search payments" options={[{ value: "", label: "None" }, ...payments.map((payment) => ({ value: payment.id, label: payment.payment_number, detail: payment.customer.name }))]} />
        <label>Amount<input name="amount_kes" type="number" min="1" required /></label><label>Reference<input name="reference" /></label>
        <CeterCombobox label="Status" name="status" defaultValue="draft" options={documentStatusOptions} />
        <label className="wide">Reason<textarea name="reason" required /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Create Credit Note</button></div>
      </form>
    </article>
  );
}

function RecurringInvoicePanel({ customers }: { customers: Array<{ id: string; name: string }> }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>Recurring Invoice</h2></div></div>
      <form className="ceter-admin-form" action={createRecurringInvoiceScheduleAction}>
        <label>Customer<SelectCustomer customers={customers} /></label><label>Name<input name="name" required /></label>
        <label>Amount<input name="amount_kes" type="number" min="1" required /></label>
        <CeterCombobox label="Frequency" name="frequency" defaultValue="monthly" options={recurringFrequencyOptions} />
        <label>Next run<input name="next_run_at" type="date" required /></label>
        <CeterCombobox label="Status" name="status" defaultValue="active" options={lifecycleStatusOptions} />
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">Schedule Invoice</button></div>
      </form>
    </article>
  );
}

function SimpleSelectForm({ title, action, selectName, options, fields, button }: { title: string; action: (formData: FormData) => Promise<void>; selectName: string; options: Array<{ value: string; label: string }>; fields: string[][]; button: string }) {
  return (
    <article className="ceter-admin-panel ceter-admin-form-panel">
      <div className="ceter-admin-panel-header"><div><span>Form</span><h2>{title}</h2></div></div>
      <form className="ceter-admin-form" action={action}>
        <CeterCombobox label="Record" name={selectName} required placeholder="Search records" options={options} />
        {fields.map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type ?? "text"} /></label>)}
        <label className="wide">Notes<textarea name="notes" /></label>
        <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button" type="submit">{button}</button></div>
      </form>
    </article>
  );
}

function SelectCustomer({ customers }: { customers: Array<{ id: string; name: string }> }) {
  return <CeterCombobox name="customer_id" required placeholder="Search customers" options={customers.map((customer) => ({ value: customer.id, label: customer.name }))} compact />;
}

function LineItems({ products }: { products: Array<{ id: string; name: string; price_kes: number }> }) {
  return (
    <>
      {Array.from({ length: 3 }, (_, index) => (
        <div className="wide ceter-admin-line-row" key={index}>
          <CeterCombobox name={`item_product_id_${index}`} placeholder="Search products" compact options={[{ value: "", label: "Product/service" }, ...products.map((product) => ({ value: product.id, label: product.name }))]} />
          <input name={`item_description_${index}`} placeholder="Manual description" />
          <input name={`item_quantity_${index}`} type="number" min="0" placeholder="Qty" />
          <input name={`item_unit_price_kes_${index}`} type="number" min="0" placeholder="Unit price" />
          <input name={`item_discount_kes_${index}`} type="number" min="0" placeholder="Discount" />
        </div>
      ))}
    </>
  );
}

function ReadOnlyPanel({ title, body }: { title: string; body: string }) {
  return <article className="ceter-admin-warning"><div><strong>{title}</strong><p>{body}</p></div></article>;
}

function optionsFromPairs(pairs: Array<[string, string]>): CeterComboboxOption[] {
  return pairs.map(([value, label]) => ({ value, label }));
}

function RecordsPanel(props: RecordsPanelProps) {
  const rows =
    ["customers", "customer-categories"].includes(props.tab) ? props.customers.map((item) => [item.name, item.company_name ?? "-", item.email ?? "-", formatKes(item.invoices.reduce((sum, invoice) => sum + invoice.balance_kes, 0))]) :
    ["sales", "quotes"].includes(props.tab) ? props.quotes.map((item) => [item.quote_number, item.customer.name, item.status, formatKes(item.total_kes)]) :
    props.tab === "credit-notes" ? props.creditNotes.map((item) => [item.credit_note_number, item.customer.name, item.status, formatKes(item.amount_kes)]) :
    props.tab === "recurring-invoices" ? props.recurringInvoices.map((item) => [item.name, item.customer.name, item.frequency, formatKes(item.amount_kes)]) :
    props.tab === "payments" ? props.payments.map((item) => [item.payment_number, item.customer.name, item.invoice?.invoice_number ?? "-", formatKes(item.amount_kes)]) :
    ["expenses", "expense-categories"].includes(props.tab) ? props.expenses.map((item) => [item.expense_number, item.category?.name ?? "-", item.method, formatKes(item.amount_kes)]) :
    props.tab === "recurring-expenses" ? props.recurringExpenses.map((item) => [item.name, item.category?.name ?? "-", item.frequency, formatKes(item.amount_kes)]) :
    props.tab === "suppliers" ? props.suppliers.map((item) => [item.company_name, item.contact_person ?? "-", item.email ?? "-", item.phone ?? "-"]) :
    ["procurement", "purchases"].includes(props.tab) ? props.purchaseOrders.map((item) => [item.po_number, item.supplier.company_name, item.status, formatKes(item.total_kes)]) :
    props.tab === "debit-notes" ? props.debitNotes.map((item) => [item.debit_note_number, item.supplier.company_name, item.status, formatKes(item.amount_kes)]) :
    props.tab === "pay-purchase" ? props.supplierInvoices.map((item) => [item.supplier_invoice_number, item.supplier.company_name, item.status, formatKes(item.balance_kes)]) :
    props.tab === "etims" ? props.etims.map((item) => [item.invoice.invoice_number, item.invoice.customer.name, item.status, item.last_error ?? "-"]) : [];
  return (
    <article className="ceter-admin-panel">
      <div className="ceter-admin-panel-header"><div><span>Records</span><h2>Latest records</h2></div></div>
      <div className="ceter-admin-table-wrap">
        <table><tbody>{rows.length ? rows.map((row: string[], index: number) => <tr key={index}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>) : <tr><td>No connected records yet.</td></tr>}</tbody></table>
      </div>
    </article>
  );
}
