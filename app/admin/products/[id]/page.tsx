import Link from "next/link";
import { notFound } from "next/navigation";
import { hasPermission, requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("products.view");
  const { id } = await params;
  if (!isRecordId(id)) notFound();
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true, brand: true, price_history: { orderBy: { effective_from: "desc" }, take: 5 }, stock_movements: { orderBy: { created_at: "desc" }, take: 5 } }
  });
  if (!product) notFound();
  const canCost = hasPermission(session, "products.cost_price.view");
  const canEdit = hasPermission(session, "products.update");
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div><p>Catalogue &gt; Products &gt; {product.sku ?? product.slug}</p><h1>{product.name}</h1><span>{product.category?.name ?? "Uncategorised"} · {product.brand?.name ?? "Unassigned Brand"}</span></div>
        <div className="ceter-admin-form-actions">
          <Link className="ceter-admin-secondary-button" href={`/product/${product.slug}`}>Storefront preview</Link>
          {canEdit ? <Link className="ceter-admin-primary-button" href={`/admin/products/${product.id}/edit`}>Edit</Link> : null}
        </div>
      </div>
      <section className="ceter-admin-stat-grid">
        <Stat label="Selling price" value={formatKes(product.price_kes)} detail="Storefront price" />
        <Stat label="Cost price" value={canCost ? formatKes(product.cost_price_kes ?? 0) : "Restricted"} detail="Permission protected" />
        <Stat label="Available stock" value={String(product.stock_quantity)} detail={product.stock_status} />
        <Stat label="Publication" value={product.is_published ? "Published" : "Draft"} detail={product.condition} />
      </section>
      <section className="ceter-admin-grid">
        <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Overview</span><h2>Description</h2></div></div><p>{product.description}</p></article>
        <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>SEO</span><h2>Storefront Readiness</h2></div></div><p>Slug: <code>{product.slug}</code></p><p>MPN: {product.mpn ?? "-"}</p><p>Featured: {product.is_featured ? "Yes" : "No"}</p></article>
      </section>
      <section className="ceter-admin-grid">
        <MiniTable title="Change History" columns={["Price", "From", "Note"]} rows={product.price_history.map((row) => [formatKes(row.price_kes), row.effective_from.toLocaleString("en-KE"), row.note ?? "-"])} />
        <MiniTable title="Stock Movement" columns={["Delta", "Reason", "When"]} rows={product.stock_movements.map((row) => [String(row.delta), row.reason, row.created_at.toLocaleString("en-KE")])} />
      </section>
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function isRecordId(value: string) {
  return /^[a-z0-9][a-z0-9_-]{7,}$/i.test(value.trim());
}

function MiniTable({ title, columns, rows }: { title: string; columns: string[]; rows: string[][] }) {
  return <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Activity</span><h2>{title}</h2></div></div><div className="ceter-admin-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="ceter-admin-empty">No records yet.</div></td></tr>}</tbody></table></div></article>;
}
