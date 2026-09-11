import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function QuoteDetailPage({ params }: PageProps) {
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

  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Sales &gt; Quotations &gt; {quote.quote_number}</p>
          <h1>{quote.quote_number}</h1>
          <span>{quote.customer.name} - version {quote.version}</span>
        </div>
        <div className="ceter-admin-form-actions">
          <Link className="ceter-admin-secondary-button" href="/admin/quotes">Back to quotes</Link>
          <Link className="ceter-admin-primary-button" href={`/admin/customers/${quote.customer_id}`}>View customer</Link>
        </div>
      </div>

      <section className="ceter-admin-stat-grid">
        <Stat label="Total" value={formatKes(quote.total_kes)} detail="Quotation value" />
        <Stat label="Subtotal" value={formatKes(quote.subtotal_kes)} detail="Before discount and VAT" />
        <Stat label="VAT" value={formatKes(quote.vat_kes)} detail={quote.vat_enabled ? "VAT applied" : "No VAT applied"} />
        <Stat label="Status" value={label(quote.status)} detail={quote.valid_until ? `Valid until ${quote.valid_until.toLocaleDateString("en-KE")}` : "No validity date"} />
      </section>

      <section className="ceter-admin-grid">
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
          <dl className="ceter-admin-detail-list">
            <dt>Customer</dt><dd>{quote.customer.name}</dd>
            <dt>Company</dt><dd>{quote.customer.company_name ?? "-"}</dd>
            <dt>Issue date</dt><dd>{quote.issue_date?.toLocaleDateString("en-KE") ?? "-"}</dd>
            <dt>Issued at</dt><dd>{quote.issued_at?.toLocaleString("en-KE") ?? "-"}</dd>
            <dt>Accepted at</dt><dd>{quote.accepted_at?.toLocaleString("en-KE") ?? "-"}</dd>
            <dt>Converted order</dt><dd>{quote.converted_order_id ? <Link href={`/admin/sales/${quote.converted_order_id}`}>Open order</Link> : "-"}</dd>
            <dt>Documents</dt><dd>{quote.documents.length ? quote.documents.map((document) => <a key={document.id} href={`/api/admin/documents/${document.id}/download`} target="_blank" rel="noreferrer">{document.document_number ?? document.title}</a>) : "No documents"}</dd>
          </dl>
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
