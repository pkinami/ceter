import Link from "next/link";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

type ProductRow = Awaited<ReturnType<typeof getVisibilityRows>>[number];

export default async function StorefrontVisibilityPage() {
  await requirePermission("storefront.visibility.manage");
  const products = await getVisibilityRows();
  const missingImage = products.filter((product) => !imageList(product.images).length);
  const missingBrand = products.filter((product) => !product.brand_id);
  const missingDescription = products.filter((product) => !product.description.trim());
  const missingSpecs = products.filter((product) => !product.specs || !Object.keys(product.specs as object).length);
  const missingSeo = products.filter((product) => !product.description.trim() || !imageList(product.images).length);
  const refurbished = products.filter((product) => product.condition === "refurbished");
  const brokenCategory = products.filter((product) => !product.category_id || !product.category);
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting"><div><p>Storefront &gt; Product Visibility &amp; SEO</p><h1>Product Visibility &amp; SEO</h1></div></div>
      <section className="ceter-admin-stat-grid">
        <Stat label="Published" value={products.filter((product) => product.is_published).length} detail="Visible when mapped and available" />
        <Stat label="Draft" value={products.filter((product) => !product.is_published).length} detail="Hidden from storefront" />
        <Stat label="Missing images" value={missingImage.length} detail="Needs administrator review" />
        <Stat label="Missing brand" value={missingBrand.length} detail="Unassigned Brand" />
        <Stat label="Missing description" value={missingDescription.length} detail="Content quality" />
        <Stat label="Missing specifications" value={missingSpecs.length} detail="Specs JSON empty" />
        <Stat label="Missing SEO metadata" value={missingSeo.length} detail="Model derives SEO from product fields" />
        <Stat label="Refurbished review" value={refurbished.length} detail="Must not publish as new" />
        <Stat label="Broken categories" value={brokenCategory.length} detail="Mapping issue" />
      </section>
      <section className="ceter-admin-grid">
        <ReviewTable title="Missing Image Review" rows={missingImage} />
        <ReviewTable title="Unassigned Brand Review" rows={missingBrand} />
        <ReviewTable title="Refurbished Review" rows={refurbished} />
        <ReviewTable title="Broken Category Mapping" rows={brokenCategory} />
      </section>
    </div>
  );
}

async function getVisibilityRows() {
  return prisma.product.findMany({ where: { archived_at: null }, orderBy: { updated_at: "desc" }, include: { category: true, brand: true } });
}

function ReviewTable({ title, rows }: { title: string; rows: ProductRow[] }) {
  return (
    <article className="ceter-admin-panel">
      <div className="ceter-admin-panel-header"><div><span>Bulk review</span><h2>{title}</h2></div></div>
      <div className="ceter-admin-table-wrap"><table>
        <thead><tr><th>Name</th><th>SKU</th><th>Brand</th><th>Category</th><th>Visibility</th><th>Stock</th><th>Edit</th></tr></thead>
        <tbody>{rows.slice(0, 25).length ? rows.slice(0, 25).map((product) => (
          <tr key={product.id}><td>{product.name}</td><td>{product.sku ?? "-"}</td><td>{product.brand?.name ?? "Unassigned Brand"}</td><td>{product.category?.name ?? "Uncategorised"}</td><td><span className={`ceter-admin-status ${product.is_published ? "green" : "amber"}`}>{product.is_published ? "Published" : "Draft"}</span></td><td>{product.stock_status}</td><td><Link className="ceter-admin-secondary-button" href={`/admin/products/${product.id}/edit`}>Edit</Link></td></tr>
        )) : <tr><td colSpan={7}><div className="ceter-admin-empty">No products require this review.</div></td></tr>}</tbody>
      </table></div>
    </article>
  );
}

function imageList(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value.toLocaleString("en-KE")}</strong><small>{detail}</small></article>;
}
