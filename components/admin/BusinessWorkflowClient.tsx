"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { CeterCombobox, type CeterComboboxOption } from "@/components/admin/CeterCombobox";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";
import { upsertCategoryAction, upsertProductAction } from "@/app/admin/actions";
import {
  createExpenseAction,
  createQuoteAction,
  createSaleAction,
  deleteCustomerCategoryAction,
  quoteToInvoiceAction,
  recordPaymentAction,
  upsertCustomerCategoryAction,
  upsertCustomerAction
} from "@/app/admin/business/actions";

type Customer = { id: string; name: string; company_name: string | null; email: string | null; phone: string | null; category_id?: string | null; category?: { name: string } | null; invoices?: Array<{ balance_kes: number }>; payments?: unknown[]; quotes?: unknown[]; orders?: unknown[] };
type Product = { id: string; name: string; sku: string | null; category_id: string | null; stock_quantity: number; price_kes: number; cost_price_kes: number | null };
type Category = { id: string; name: string; parent_id: string | null };
type Brand = { id: string; name: string; slug: string };
type Invoice = { id: string; invoice_number: string; customer_lpo_number: string | null; balance_kes: number; total_kes: number; customer: { name: string } };
type Quote = { id: string; quote_number: string; status: string; total_kes: number; customer: { name: string } };
type ExpenseCategory = { id: string; name: string };
type CustomerCategory = { id: string; name: string; description: string | null; count: number };

type Props = {
  tab: string;
  initialModal?: "customer" | "product" | "expense" | "payment";
  customers: Customer[];
  customerCategories: CustomerCategory[];
  products: Product[];
  categories: Category[];
  brands: Brand[];
  expenseCategories: ExpenseCategory[];
  invoices: Invoice[];
  quotes: Quote[];
};

type Line = { productId: string; description: string; quantity: number; price: number; discount: number };

const blankLine = (): Line => ({ productId: "", description: "", quantity: 1, price: 0, discount: 0 });
const customerTypeOptions = optionsFromPairs([["individual", "Individual"], ["business", "Business"], ["government", "Government"], ["ngo", "NGO"]]);
const taxTypeOptions = optionsFromPairs([["vat", "VAT applicable"], ["none", "No tax"]]);
const stockStatusOptions = optionsFromPairs([["in_stock", "In stock"], ["backorder", "Backorder"], ["out_of_stock", "Out of stock"]]);
const quoteStatusOptions = optionsFromPairs([["draft", "Draft"], ["sent", "Sent"], ["accepted", "Accepted"]]);
const paymentMethodOptions = optionsFromPairs([["mpesa", "M-Pesa"], ["bank_transfer", "Bank transfer"], ["cash", "Cash"], ["card", "Card"]]);
const paymentTimingOptions = optionsFromPairs([["later", "Pay later"], ["now", "Pay now"]]);

export function BusinessWorkflowClient({ tab, initialModal, customers, customerCategories, products, categories, brands, expenseCategories, invoices, quotes }: Props) {
  const [modal, setModal] = useState<"customer" | "product" | "category" | "expense" | "payment" | null>(initialModal ?? null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const isQuote = tab === "quotes";
  const isSale = tab === "sales";
  const activeReturn = `/admin/business?tab=${tab}`;
  const openCustomer = (customer?: Customer) => {
    setEditingCustomer(customer ?? null);
    setModal("customer");
  };

  return (
    <section className="ceter-workflow" aria-label="Business workflow">
      {(isSale || isQuote) ? (
        <SaleQuoteWorkspace
          mode={isSale ? "sale" : "quote"}
          customers={customers}
          products={products}
          onAddCustomer={() => openCustomer()}
          onAddProduct={() => setModal("product")}
        />
      ) : null}
      {tab === "customers" ? <CustomerWorkspace customers={customers} customerCategories={customerCategories} onAdd={() => openCustomer()} onEdit={openCustomer} /> : null}
      {tab === "customer-categories" ? <CustomerCategoryWorkspace categories={customerCategories} /> : null}
      {tab === "payments" ? <PaymentWorkspace invoices={invoices} onAdd={() => setModal("payment")} /> : null}
      {tab === "expenses" || tab === "expense-categories" ? <ExpenseWorkspace categories={expenseCategories} onAdd={() => setModal("expense")} /> : null}

      <WorkflowRecords tab={tab} quotes={quotes} invoices={invoices} />

      {modal === "customer" ? (
        <WorkflowModal title={editingCustomer ? "Edit Customer" : "Add Customer"} onClose={() => setModal(null)}>
          <form className="ceter-admin-form ceter-modal-form" action={upsertCustomerAction}>
            <input type="hidden" name="return_to" value={activeReturn} />
            <input type="hidden" name="id" value={editingCustomer?.id ?? ""} />
            <label>Name<input name="name" required autoFocus defaultValue={editingCustomer?.name ?? ""} /></label>
            <label>Company<input name="company_name" defaultValue={editingCustomer?.company_name ?? ""} /></label>
            <CeterCombobox label="Category" name="category_id" defaultValue={editingCustomer?.category_id ?? ""} placeholder="Search categories" options={[{ value: "", label: "Uncategorised" }, ...customerCategories.map((category) => ({ value: category.id, label: category.name }))]} />
            <CeterCombobox label="Type" name="customer_type" defaultValue="business" options={customerTypeOptions} />
            <label>Phone<input name="phone" defaultValue={editingCustomer?.phone ?? ""} /></label>
            <label>Email<input name="email" type="email" defaultValue={editingCustomer?.email ?? ""} /></label>
            <label>KRA PIN<input name="tax_pin" /></label>
            <label className="wide">Address<input name="address_line_1" /></label>
            <label>City<input name="address_city" /></label>
            <label>Region<input name="address_region" /></label>
            <label className="wide">Notes<textarea name="notes" /></label>
            <div className="ceter-admin-form-actions">
              <button className="ceter-admin-secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button>
              <FormSubmitButton className="ceter-admin-primary-button" pendingText="Saving customer...">Save Customer</FormSubmitButton>
            </div>
          </form>
        </WorkflowModal>
      ) : null}

      {modal === "product" ? (
        <WorkflowModal title="Add Product / Item" onClose={() => setModal(null)} wide>
          <form className="ceter-admin-form ceter-modal-form" action={upsertProductAction}>
            <input type="hidden" name="return_to" value={activeReturn} />
            <label>Name<input name="name" required autoFocus /></label>
            <label>Slug<input name="slug" placeholder="Generated from name if blank" /></label>
            <CeterCombobox label="Type" name="item_type" required defaultValue="product" options={[{ value: "product", label: "Product" }, { value: "raw_material", label: "Raw Material" }]} />
            <CeterCombobox label="Unit" name="unit" required defaultValue="pcs" options={[{ value: "pcs", label: "Pieces" }, { value: "unit", label: "Unit" }, { value: "box", label: "Box" }, { value: "service", label: "Service" }]} />
            <CeterCombobox label="Category" name="category_id" required placeholder="Search categories" options={[{ value: "", label: "Select category" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} onCreate={() => setModal("category")} createLabel="Create category" />
            <CeterCombobox label="Brand" name="brand_id" placeholder="Search brands" options={[{ value: "", label: "Unbranded" }, ...brands.map((brand) => ({ value: brand.id, label: brand.name }))]} />
            <label>MPN / Model<input name="mpn" /></label>
            <CeterCombobox label="Condition" name="condition" defaultValue="new" options={[{ value: "new", label: "New" }, { value: "refurbished", label: "Refurbished" }]} />
            <label>SKU<input name="sku" /></label>
            <label>Buying price<input name="cost_price_kes" type="number" min={0} /></label>
            <label>Selling price<input name="price_kes" type="number" min={0} required /></label>
            <CeterCombobox label="Tax" name="tax_type" defaultValue="vat" options={taxTypeOptions} />
            <label>Stock quantity<input name="stock_quantity" type="number" min={0} defaultValue={0} /></label>
            <CeterCombobox label="Stock status" name="stock_status" defaultValue="in_stock" options={stockStatusOptions} />
            <label>Reorder level<input name="reorder_level" type="number" min={0} defaultValue={0} /></label>
            <label>Reorder quantity<input name="reorder_quantity" type="number" min={0} defaultValue={0} /></label>
            <label>Supplier<input name="supplier_name" /></label>
            <label>Supplier lead time (days)<input name="supplier_lead_time_days" type="number" min={0} /></label>
            <label className="wide">Specifications (JSON object)<textarea name="specs" placeholder={'{\n  "Print speed": "32 ppm"\n}'} /></label>
            <label>Additional image URLs (one per line)<textarea name="images" /></label>
            <label><input name="is_featured" type="checkbox" /> Featured</label>
            <label><input name="is_published" type="checkbox" defaultChecked /> Published</label>
            <label className="wide">Description<textarea name="description" required /></label>
            <label>Primary image<input name="primary_image_file" type="file" accept="image/*" /></label>
            <div className="ceter-admin-form-actions">
              <button className="ceter-admin-secondary-button" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="ceter-admin-secondary-button" type="button" onClick={() => setModal("category")}>Add Category</button>
              <FormSubmitButton className="ceter-admin-primary-button" pendingText="Creating item...">Add Item</FormSubmitButton>
            </div>
          </form>
        </WorkflowModal>
      ) : null}

      {modal === "category" ? (
        <WorkflowModal title="Add Category" onClose={() => setModal(null)}>
          <form className="ceter-admin-form ceter-modal-form" action={upsertCategoryAction}>
            <input type="hidden" name="return_to" value={activeReturn} />
            <label>Name<input name="name" required autoFocus /></label>
            <CeterCombobox label="Parent" name="parent_id" placeholder="Search parent category" options={[{ value: "", label: "Main category" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
            <label>Sort order<input name="sort_order" type="number" defaultValue={0} /></label>
            <label className="wide">Description<textarea name="description" /></label>
            <div className="ceter-admin-form-actions">
              <button className="ceter-admin-secondary-button" type="button" onClick={() => setModal("product")}>Cancel</button>
              <FormSubmitButton className="ceter-admin-primary-button" pendingText="Creating category...">Save Category</FormSubmitButton>
            </div>
          </form>
        </WorkflowModal>
      ) : null}

      {modal === "expense" ? (
        <WorkflowModal title="Add Expense" onClose={() => setModal(null)}>
          <ExpenseForm categories={expenseCategories} returnTo={activeReturn} onCancel={() => setModal(null)} />
        </WorkflowModal>
      ) : null}

      {modal === "payment" ? (
        <WorkflowModal title="Receive Payment" onClose={() => setModal(null)}>
          <PaymentForm invoices={invoices} returnTo={activeReturn} onCancel={() => setModal(null)} />
        </WorkflowModal>
      ) : null}
    </section>
  );
}

function SaleQuoteWorkspace({ mode, customers, products, onAddCustomer, onAddProduct }: { mode: "sale" | "quote"; customers: Customer[]; products: Product[]; onAddCustomer: () => void; onAddProduct: () => void }) {
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatInclusive, setVatInclusive] = useState(false);
  const totals = useMemo(() => calculateTotals(lines, vatEnabled), [lines, vatEnabled]);

  const updateLine = (index: number, next: Partial<Line>) => {
    setLines((current) => current.map((line, itemIndex) => itemIndex === index ? { ...line, ...next } : line));
  };

  return (
    <article className="ceter-admin-panel ceter-workflow-panel">
      <form action={mode === "sale" ? createSaleAction : createQuoteAction}>
        <div className="ceter-workflow-head">
          <div>
            <p>Sales</p>
            <h2>{mode === "sale" ? "New Sale" : "New Quotation"}</h2>
          </div>
          <div className="ceter-workflow-head-actions">
            <a className="ceter-admin-secondary-button" href="/admin">Cancel</a>
            <FormSubmitButton className="ceter-admin-primary-button" pendingText={mode === "sale" ? "Creating sale..." : "Creating quotation..."}>{mode === "sale" ? "Save Sale" : "Save Quotation"}</FormSubmitButton>
          </div>
        </div>

        <div className="ceter-workflow-fields">
          <CeterCombobox label="Customer" name="customer_id" value={customerId} onChange={setCustomerId} options={customers.map((customer) => ({ value: customer.id, label: customer.name, detail: customer.company_name ?? customer.phone ?? customer.email ?? "" }))} required placeholder="Search customers" onCreate={onAddCustomer} createLabel="Create customer" />
          <button className="ceter-workflow-add-button" type="button" onClick={onAddCustomer}><Plus size={16} /> Create customer</button>
          {mode === "quote" ? <label>Expiry<input name="valid_until" type="date" /></label> : <label>Due date<input name="due_date" type="date" /></label>}
          {mode === "quote" ? <CeterCombobox label="Status" name="status" defaultValue="sent" options={quoteStatusOptions} /> : <CeterCombobox label="Payment method" name="method" defaultValue="mpesa" options={paymentMethodOptions} />}
          {mode === "sale" ? <CeterCombobox label="Payment timing" name="payment_timing" defaultValue="later" options={paymentTimingOptions} /> : null}
          <label>Customer LPO No.<input name="customer_lpo_number" placeholder="Optional customer LPO" /></label>
        </div>

        <div className="ceter-workflow-items">
          <div className="ceter-workflow-items-title">
            <strong>Items</strong>
            <button className="ceter-admin-secondary-button" type="button" onClick={onAddProduct}><Plus size={16} /> New Item</button>
          </div>
          <div className="ceter-workflow-table">
            <div className="ceter-workflow-row header"><span>Product / service</span><span>Description</span><span>Qty</span><span>Price</span><span>Discount</span><span>Tax</span><span>Total</span><span /></div>
            {lines.map((line, index) => {
              const entered = Math.max(0, line.quantity * line.price - line.discount);
              const base = vatEnabled && vatInclusive ? Math.round(entered / 1.16) : entered;
              const tax = vatEnabled ? Math.round(base * 0.16) : 0;
              return (
                <div className="ceter-workflow-row" key={index}>
                  <CeterCombobox label={`Product ${index + 1}`} name={`item_product_id_${index}`} value={line.productId} onChange={(value) => {
                    const product = products.find((item) => item.id === value);
                    updateLine(index, { productId: value, description: product?.name ?? line.description, price: product?.price_kes ?? line.price });
                  }} options={products.map((product) => ({ value: product.id, label: product.name, detail: `${product.sku ?? "No SKU"} - Stock ${product.stock_quantity}` }))} placeholder="Search products" onCreate={onAddProduct} createLabel="Create product" compact />
                  <input name={`item_description_${index}`} value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} placeholder="Manual description" />
                  <input name={`item_quantity_${index}`} type="number" min={0} value={line.quantity} onChange={(event) => updateLine(index, { quantity: Number(event.target.value) })} />
                  <input name={`item_unit_price_kes_${index}`} type="number" min={0} step="0.01" value={line.price} onChange={(event) => updateLine(index, { price: Number(event.target.value) })} />
                  <input name={`item_discount_kes_${index}`} type="number" min={0} step="0.01" value={line.discount} onChange={(event) => updateLine(index, { discount: Number(event.target.value) })} />
                  <span className="ceter-workflow-money">{money(tax)}</span>
                  <span className="ceter-workflow-money strong">{money(base + tax)}</span>
                  <button type="button" className="ceter-workflow-icon" onClick={() => setLines((current) => current.length === 1 ? [blankLine()] : current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Remove item"><Trash2 size={15} /></button>
                </div>
              );
            })}
          </div>
          <button className="ceter-admin-secondary-button" type="button" onClick={() => setLines((current) => [...current, blankLine()])}><Plus size={16} /> Add line</button>
        </div>

        <div className="ceter-workflow-bottom">
          <div className="ceter-workflow-notes">
            <label>Notes<textarea name="notes" /></label>
            <label>Terms<textarea name="terms" defaultValue={mode === "quote" ? "Quotation is valid until the expiry date. Prices are subject to stock availability." : "Payment due on invoice. Goods remain property of Ceter Technologies until fully paid."} /></label>
          </div>
          <aside className="ceter-workflow-summary">
            <ToggleSwitch name="vat_enabled" checked={vatEnabled} onChange={(event) => setVatEnabled(event.target.checked)} label="Apply VAT" />
            {vatEnabled ? <ToggleSwitch name="vat_inclusive" checked={vatInclusive} onChange={(event) => setVatInclusive(event.target.checked)} label="Entered prices include VAT" /> : null}
            <dl>
              <div><dt>Subtotal</dt><dd>{money(totals.subtotal)}</dd></div>
              <div><dt>Discount</dt><dd>{money(totals.discount)}</dd></div>
              <div><dt>Tax</dt><dd>{money(totals.vat)}</dd></div>
              <div className="total"><dt>Total</dt><dd>{money(totals.total)}</dd></div>
            </dl>
            <div className="ceter-workflow-sticky-actions">
              <strong>Total: {money(totals.total)}</strong>
              <FormSubmitButton className="ceter-admin-primary-button" pendingText={mode === "sale" ? "Generating invoice..." : "Saving quotation..."}>{mode === "sale" ? "Create Invoice" : "Create Quotation"}</FormSubmitButton>
            </div>
          </aside>
        </div>
      </form>
    </article>
  );
}

function CustomerWorkspace({ customers, customerCategories, onAdd, onEdit }: { customers: Customer[]; customerCategories: CustomerCategory[]; onAdd: () => void; onEdit: (customer: Customer) => void }) {
  const totalBalance = customers.reduce((sum, customer) => sum + (customer.invoices ?? []).reduce((invoiceSum, invoice) => invoiceSum + invoice.balance_kes, 0), 0);
  return (
    <article className="ceter-admin-panel ceter-workflow-panel">
      <div className="ceter-workflow-head">
        <div><p>Customers</p><h2>Customer Accounts</h2><span>{customers.length} accounts, {customerCategories.length} categories, {money(totalBalance)} receivable balance.</span></div>
        <button className="ceter-admin-primary-button" type="button" onClick={onAdd}>Add Customer</button>
      </div>
      <div className="ceter-workflow-list">{customers.map((customer) => {
        const balance = (customer.invoices ?? []).reduce((sum, invoice) => sum + invoice.balance_kes, 0);
        return <button type="button" key={customer.id} onClick={() => onEdit(customer)}><strong>{customer.name}</strong><span>{customer.category?.name ?? "Uncategorised"} - {customer.company_name ?? customer.email ?? customer.phone ?? "No contact details"} - {money(balance)}</span></button>;
      })}</div>
    </article>
  );
}

function CustomerCategoryWorkspace({ categories }: { categories: CustomerCategory[] }) {
  return (
    <article className="ceter-admin-panel ceter-workflow-panel">
      <div className="ceter-workflow-head">
        <div><p>Customers</p><h2>Customer Categories</h2><span>Create customer segments and protect categories that are in use.</span></div>
      </div>
      <form className="ceter-admin-form ceter-modal-form" action={upsertCustomerCategoryAction}>
        <label>Name<input name="name" required /></label>
        <label className="wide">Description<textarea name="description" /></label>
        <div className="ceter-admin-form-actions"><FormSubmitButton className="ceter-admin-primary-button" pendingText="Saving category...">Save Category</FormSubmitButton></div>
      </form>
      <div className="ceter-admin-table-wrap">
        <table>
          <thead><tr><th>Category</th><th>Description</th><th>Customers</th><th>Actions</th></tr></thead>
          <tbody>{categories.length ? categories.map((category) => (
            <tr key={category.id}>
              <td>{category.name}</td>
              <td>{category.description ?? "-"}</td>
              <td>{category.count.toLocaleString("en-KE")}</td>
              <td>
                <form action={deleteCustomerCategoryAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <FormSubmitButton className="ceter-admin-secondary-button" pendingText="Deleting...">Delete</FormSubmitButton>
                </form>
              </td>
            </tr>
          )) : <tr><td colSpan={4}>No customer categories have been created.</td></tr>}</tbody>
        </table>
      </div>
    </article>
  );
}

function PaymentWorkspace({ invoices, onAdd }: { invoices: Invoice[]; onAdd: () => void }) {
  return (
    <article className="ceter-admin-panel ceter-workflow-panel">
      <div className="ceter-workflow-head">
        <div><p>Transactions</p><h2>Receive Payment</h2><span>Record receipts against open customer invoices.</span></div>
        <button className="ceter-admin-primary-button" type="button" onClick={onAdd}>Add Payment</button>
      </div>
      <PaymentForm invoices={invoices} returnTo="/admin/business?tab=payments" />
    </article>
  );
}

function ExpenseWorkspace({ categories, onAdd }: { categories: ExpenseCategory[]; onAdd: () => void }) {
  return (
    <article className="ceter-admin-panel ceter-workflow-panel">
      <div className="ceter-workflow-head">
        <div><p>Expenses</p><h2>Expense Capture</h2><span>Record supplier costs with category, tax context, attachment and notes.</span></div>
        <button className="ceter-admin-primary-button" type="button" onClick={onAdd}>Add Expense</button>
      </div>
      <ExpenseForm categories={categories} returnTo="/admin/business?tab=expenses" />
    </article>
  );
}

function PaymentForm({ invoices, returnTo, onCancel }: { invoices: Invoice[]; returnTo: string; onCancel?: () => void }) {
  // Kept stable for this form instance so a double click/network retry is an
  // idempotent payment operation, not a second cash receipt.
  const [operationKey] = useState(() => `payment-${crypto.randomUUID()}`);
  return (
    <form className="ceter-admin-form ceter-modal-form" action={recordPaymentAction}>
      <input type="hidden" name="return_to" value={returnTo} />
      <input type="hidden" name="operation_key" value={operationKey} />
      <CeterCombobox label="Invoice" name="invoice_id" required placeholder="Search invoices" options={invoices.map((invoice) => ({ value: invoice.id, label: invoice.invoice_number, detail: `${invoice.customer.name} - ${money(invoice.balance_kes)}` }))} />
      <label>Amount<input name="amount_kes" type="number" min={1} required /></label>
      <CeterCombobox label="Method" name="method" defaultValue="mpesa" options={paymentMethodOptions} />
      <label>Reference<input name="reference" /></label>
      <label className="wide">Notes<textarea name="notes" /></label>
      <div className="ceter-admin-form-actions">{onCancel ? <button className="ceter-admin-secondary-button" type="button" onClick={onCancel}>Cancel</button> : <a className="ceter-admin-secondary-button" href="/admin">Cancel</a>}<FormSubmitButton className="ceter-admin-primary-button" pendingText="Recording payment...">Record Payment</FormSubmitButton></div>
    </form>
  );
}

function ExpenseForm({ categories, returnTo, onCancel }: { categories: ExpenseCategory[]; returnTo: string; onCancel?: () => void }) {
  return (
    <form className="ceter-admin-form ceter-modal-form" action={createExpenseAction}>
      <input type="hidden" name="return_to" value={returnTo} />
      <CeterCombobox label="Category" name="category_name" required placeholder="Search expense categories" options={categories.map((category) => ({ value: category.name, label: category.name }))} />
      <label>Supplier<input name="supplier" /></label>
      <label>Date<input name="expense_date" type="date" /></label>
      <label>Amount<input name="amount_kes" type="number" min={1} required /></label>
      <CeterCombobox label="Payment method" name="method" defaultValue="cash" options={paymentMethodOptions} />
      <label>Tax<input name="tax_kes" type="number" min={0} placeholder="Optional" /></label>
      <label>Attachment<input name="attachment" type="file" /></label>
      <label className="wide">Notes<textarea name="notes" /></label>
      <div className="ceter-admin-form-actions">{onCancel ? <button className="ceter-admin-secondary-button" type="button" onClick={onCancel}>Cancel</button> : <a className="ceter-admin-secondary-button" href="/admin">Cancel</a>}<FormSubmitButton className="ceter-admin-primary-button" pendingText="Recording expense...">Record Expense</FormSubmitButton></div>
    </form>
  );
}

function WorkflowRecords({ tab, quotes, invoices }: { tab: string; quotes: Quote[]; invoices: Invoice[] }) {
  if (tab === "quotes") {
    return (
      <article className="ceter-admin-panel ceter-workflow-panel">
        <div className="ceter-workflow-head compact"><div><p>Records</p><h2>Latest quotations</h2></div></div>
        <div className="ceter-admin-table-wrap"><table><tbody>{quotes.map((quote) => <tr key={quote.id}><td>{quote.quote_number}</td><td>{quote.customer.name}</td><td>{quote.status}</td><td>{money(quote.total_kes)}</td><td><form action={quoteToInvoiceAction}><input type="hidden" name="id" value={quote.id} /><FormSubmitButton className="ceter-admin-secondary-button" pendingText="Converting...">Convert to invoice</FormSubmitButton></form></td></tr>)}</tbody></table></div>
      </article>
    );
  }
  if (tab === "sales" || tab === "payments") {
    return (
      <article className="ceter-admin-panel ceter-workflow-panel">
        <div className="ceter-workflow-head compact"><div><p>Records</p><h2>Latest invoices</h2></div></div>
        <div className="ceter-admin-table-wrap"><table><tbody>{invoices.map((invoice) => <tr key={invoice.id}><td>{invoice.invoice_number}</td><td>{invoice.customer_lpo_number ? `LPO No. ${invoice.customer_lpo_number}` : "LPO No. —"}</td><td>{invoice.customer.name}</td><td>{money(invoice.total_kes)}</td><td>{money(invoice.balance_kes)}</td></tr>)}</tbody></table></div>
      </article>
    );
  }
  return null;
}

function WorkflowModal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="ceter-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className={wide ? "ceter-modal-panel wide" : "ceter-modal-panel"}>
        <div className="ceter-modal-title"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

function calculateTotals(lines: Line[], vatEnabled: boolean) {
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.price, 0);
  const discount = lines.reduce((sum, line) => sum + line.discount, 0);
  const vat = vatEnabled ? Math.round(Math.max(0, subtotal - discount) * 0.16) : 0;
  return { subtotal, discount, vat, total: Math.max(0, subtotal - discount) + vat };
}

function money(value: number) {
  return `KSh ${value.toLocaleString("en-KE", { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

function optionsFromPairs(pairs: Array<[string, string]>): CeterComboboxOption[] {
  return pairs.map(([value, label]) => ({ value, label }));
}

