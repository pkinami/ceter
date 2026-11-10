import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";
import { confirmQuotationAction } from "@/app/admin/sales-documents/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { ActionFeedback } from "@/components/admin/ActionFeedback";
import { updateQuoteAction } from "@/app/admin/business/actions";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({ params, searchParams }: PageProps & { searchParams?: Promise<{ success?: string; error?: string }> }) {
  await requirePermission("quotations.view");
  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true }, orderBy: { sort_order: "asc" } },
      documents: { orderBy: { created_at: "desc" } },
      proforma_invoices: true,
      invoices: true
    }
  });
  if (!quote) notFound();
  const feedback = await searchParams;

  return (
    <div className="ceter-admin-page ceter-quote-detail">
      <div className="ceter-admin-greeting">
        <div>
          <p>Sales &gt; Quotations &gt; {quote.quote_number}</p>
          <h1>{quote.quote_number}</h1>
          <span>{quote.customer.name} - version {quote.version}</span>
        </div>
        <div className="ceter-admin-form-actions">
          <Link className="ceter-admin-secondary-button" href="/admin/quotes">Back to quotes</Link>
          <Link className="ceter-admin-primary-button" href={`/admin/customers/${quote.customer_id}`}>View customer</Link>
          {!quote.invoices.length && ["draft", "sent", "accepted"].includes(quote.status) ? <form action={confirmQuotationAction} className="ceter-admin-inline-form"><input type="hidden" name="quote_id" value={quote.id} /><input type="hidden" name="return_to" value={`/admin/quotes/${quote.id}`} /><input name="lpo_number" defaultValue={quote.customer_lpo_number ?? ""} placeholder="LPO (optional)" aria-label="LPO number (optional)" /><FormSubmitButton className="ceter-admin-primary-button" pendingText="Confirming quotation...">Confirm &amp; issue invoice</FormSubmitButton></form> : null}
        </div>
      </div>

      <ActionFeedback success={feedback?.success} error={feedback?.error} href={quote.invoices[0] ? `/admin/invoices/${quote.invoices[0].id}` : undefined} linkLabel="Open invoice" />

      <section className="ceter-admin-stat-grid">
        <Stat label="Total" value={formatKes(quote.total_kes)} detail="Quotation value" />
        <Stat label="Subtotal" value={formatKes(quote.subtotal_kes)} detail="Before discount and VAT" />
        <Stat label="VAT" value={formatKes(quote.vat_kes)} detail={quote.vat_enabled ? "VAT applied" : "No VAT applied"} />
        <Stat label="Status" value={label(quote.status)} detail={quote.valid_until ? `Valid until ${quote.valid_until.toLocaleDateString("en-KE")}` : "No validity date"} />
      </section>

      <section className="ceter-admin-grid">
        {!quote.invoices.length && ["draft", "sent", "accepted"].includes(quote.status) ? <article className="ceter-admin-panel" id="edit-quotation">
          <div className="ceter-admin-panel-header"><div><span>Negotiated pricing</span><h2>Edit quotation</h2></div><small>Saving creates version {quote.version + 1} and a new PDF.</small></div>
          <form className="ceter-admin-form" action={updateQuoteAction}>
            <input type="hidden" name="quote_id" value={quote.id} /><input type="hidden" name="return_to" value={`/admin/quotes/${quote.id}`} />
            <label>Customer LPO No.<input name="customer_lpo_number" defaultValue={quote.customer_lpo_number ?? ""} /></label>
            <label>Valid until<input name="valid_until" type="date" defaultValue={quote.valid_until?.toISOString().slice(0, 10) ?? ""} /></label>
            <label className="wide">Notes<textarea name="notes" defaultValue={quote.notes ?? ""} /></label>
            <label className="wide">Terms<textarea name="terms" defaultValue={quote.terms ?? ""} /></label>
            <label className="wide"><input type="checkbox" name="vat_enabled" defaultChecked={quote.vat_enabled} /> Apply VAT</label>
            {quote.items.map((item, index) => <div className="ceter-admin-form-row wide" key={item.id}>
              <input type="hidden" name={`item_product_id_${index}`} value={item.product_id ?? ""} />
              <label>Description<input name={`item_description_${index}`} defaultValue={item.description} /></label>
              <label>Quantity<input name={`item_quantity_${index}`} type="number" min="1" defaultValue={item.quantity} required /></label>
              <label>Unit price (KES)<input name={`item_unit_price_kes_${index}`} type="number" min="0" defaultValue={item.unit_price_kes} required /></label>
              <label>Discount (KES)<input name={`item_discount_kes_${index}`} type="number" min="0" defaultValue={item.discount_kes} required /></label>
            </div>)}
            <button className="ceter-admin-primary-button wide" type="submit">Save quotation changes</button>
          </form>
        </article> : null}
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Quotation</span><h2>Items</h2></div></div>
          <div className="ceter-admin-table-wrap">
            <table>
              <thead><tr><th>Description</th><th>Product</th><th>Qty</th><th>Rate</th><th>Discount</th><th>VAT</th><th>Total</th></tr></thead>
              <tbody>{quote.items.length ? quote.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{item.product ? <Link href={`/admin/products/${item.product.id}`}>{item.product.name}</Link> : label(item.item_type)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatKes(item.unit_price_kes)}</td>
                  <td>{formatKes(item.discount_kes)}</td>
                  <td>{formatKes(item.vat_kes)}</td>
                  <td>{formatKes(item.line_total_kes)}</td>
                </tr>
              )) : <tr><td colSpan={7}><div className="ceter-admin-empty">No quotation items found.</div></td></tr>}</tbody>
            </table>
          </div>
        </article>

        <aside className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>Record</span><h2>Details</h2></div></div>
          <dl className="ceter-admin-detail-list ceter-quote-detail-list">
            <dt>Customer</dt><dd>{quote.customer.name}</dd>
            <dt>Company</dt><dd>{quote.customer.company_name ?? "-"}</dd>
            <dt>Issue date</dt><dd>{quote.issue_date?.toLocaleDateString("en-KE") ?? "-"}</dd>
            <dt>Issued at</dt><dd>{quote.issued_at?.toLocaleString("en-KE") ?? "-"}</dd>
            <dt>Accepted at</dt><dd>{quote.accepted_at?.toLocaleString("en-KE") ?? "-"}</dd>
            <dt>Converted order</dt><dd>{quote.converted_order_id ? <Link href={`/admin/sales/${quote.converted_order_id}`}>Open order</Link> : "-"}</dd>
            <dt>Invoice</dt><dd>{quote.invoices[0] ? <Link href={`/admin/invoices/${quote.invoices[0].id}`}>{quote.invoices[0].invoice_number}</Link> : "Not yet issued"}</dd>
          </dl>
          <section className="ceter-quote-documents" aria-labelledby="quote-documents-heading">
            <h3 id="quote-documents-heading">Documents</h3>
            {quote.documents.length ? <ul>{quote.documents.map((document) => <li key={document.id}><a href={`/api/admin/documents/${document.id}/download`} target="_blank" rel="noreferrer">{document.document_number ?? document.title}</a></li>)}</ul> : <p>No documents</p>}
          </section>
        </aside>
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
