import Link from "next/link";
import { updateProductFeaturedAction } from "@/app/admin/actions";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { formatKes } from "@/lib/utils";

type ProductRow = Awaited<ReturnType<typeof getFeaturedRows>>[number];

export default async function StorefrontFeaturedPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePermission("storefront.featured.manage");
  const params = await searchParams;
  const query = text(params?.q).trim();
  const pickerOpen = text(params?.picker) === "1";
  const [featured, candidates] = await Promise.all([getFeaturedRows(true), pickerOpen ? getFeaturedRows(false, query) : Promise.resolve([])]);
  const returnTo = `/admin/storefront/featured${pickerOpen ? `?picker=1${query ? `&q=${encodeURIComponent(query)}` : ""}` : ""}`;

  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div>
          <p>Storefront &gt; Featured Products</p>
          <h1>Featured Products</h1>
          <span>Choose the published products promoted by the storefront featured-products section.</span>
        </div>
        <div className="ceter-admin-form-actions">
          <Link className="ceter-admin-secondary-button" href="/">Preview storefront</Link>
          <Link className="ceter-admin-primary-button" href="/admin/storefront/featured?picker=1">Add Products</Link>
        </div>
      </div>

      <section className="ceter-admin-stat-grid">
        <Stat label="Featured" value={featured.length} detail="Selected products" />
        <Stat label="Published" value={featured.filter((product) => product.is_published).length} detail="Visible to customers" />
        <Stat label="Draft review" value={featured.filter((product) => !product.is_published).length} detail="Selected but hidden" />
        <Stat label="Refurbished" value={featured.filter((product) => product.condition === "refurbished").length} detail="Condition labelled on product pages" />
      </section>

      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header">
          <div><span>Merchandising</span><h2>Current Featured Products</h2></div>
          <Link className="ceter-admin-secondary-button" href="/admin/storefront/featured?picker=1">Add Products</Link>
        </div>
        <ProductList rows={featured} featured returnTo="/admin/storefront/featured" empty="No featured products are selected. Add products to populate the storefront featured section." />
      </article>

      {pickerOpen ? (
        <section className="ceter-admin-drawer-panel" aria-label="Add featured products">
          <div className="ceter-admin-drawer-card">
            <div className="ceter-admin-panel-header">
              <div><span>Product Picker</span><h2>Add Products</h2></div>
              <Link className="ceter-admin-secondary-button" href="/admin/storefront/featured">Close</Link>
            </div>
            <form className="ceter-admin-toolbar" action="/admin/storefront/featured">
              <input type="hidden" name="picker" value="1" />
              <label className="ceter-admin-table-search"><span className="sr-only">Search products</span><input name="q" defaultValue={query} placeholder="Search name, SKU or MPN" /></label>
              <button className="ceter-admin-secondary-button">Search</button>
              {query ? <Link className="ceter-admin-secondary-button" href="/admin/storefront/featured?picker=1">Reset</Link> : null}
            </form>
            <ProductList rows={candidates} returnTo={returnTo} empty={query ? "No matching products are available to add." : "Search or browse the first 25 available products."} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

async function getFeaturedRows(featured: boolean, query = "") {
  return prisma.product.findMany({
    where: { archived_at: null, is_featured: featured, ...(query ? { OR: [{ name: { contains: query, mode: "insensitive" as const } }, { sku: { contains: query, mode: "insensitive" as const } }, { mpn: { contains: query, mode: "insensitive" as const } }] } : {}) },
    orderBy: featured ? [{ updated_at: "desc" }, { name: "asc" }] : [{ name: "asc" }],
    take: featured ? undefined : 25,
    include: { category: true, brand: true }
  });
}

function ProductList({ rows, featured = false, returnTo, empty }: { rows: ProductRow[]; featured?: boolean; returnTo: string; empty: string }) {
  return (
    <div className="ceter-admin-table-wrap ceter-admin-featured-table">
      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Brand</th><th>Category</th><th>Price</th><th>Publication</th><th>Action</th></tr></thead>
        <tbody>{rows.length ? rows.map((product) => (
          <tr key={product.id}>
            <td><div className="ceter-admin-product-cell"><ProductThumb product={product} /><div><strong>{product.name}</strong><small>{product.condition === "refurbished" ? "Refurbished" : "New"}</small></div></div></td>
            <td>{product.sku ?? product.mpn ?? "-"}</td>
            <td>{product.brand?.name ?? "Unassigned"}</td>
            <td>{product.category?.name ?? "Uncategorised"}</td>
            <td>{formatKes(product.price_kes)}</td>
            <td><span className={`ceter-admin-status ${product.is_published ? "green" : "amber"}`}>{product.is_published ? "Published" : "Draft"}</span></td>
            <td>
              <form action={updateProductFeaturedAction}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="featured" value={featured ? "false" : "true"} />
                <input type="hidden" name="return_to" value={returnTo} />
                <button className="ceter-admin-secondary-button">{featured ? "Remove" : "Add"}</button>
              </form>
            </td>
          </tr>
        )) : <tr><td colSpan={7}><div className="ceter-admin-empty">{empty}</div></td></tr>}</tbody>
      </table>
    </div>
  );
}

function ProductThumb({ product }: { product: ProductRow }) {
  const image = firstImage(product.images);
  return image ? <span className="ceter-admin-product-thumb" role="img" aria-label={`${product.name} thumbnail`} style={{ backgroundImage: `url("${cssUrl(image)}")` }} /> : <span className="ceter-admin-product-thumb empty" aria-hidden="true">{product.name.slice(0, 1)}</span>;
}

function firstImage(value: unknown) {
  if (!Array.isArray(value)) return null;
  const first = value.find((item) => typeof item === "string" && item.trim());
  return typeof first === "string" ? first : null;
}

function text(value: unknown) {
  return Array.isArray(value) ? String(value[0] ?? "") : String(value ?? "");
}

function cssUrl(value: string) {
  return value.replace(/["\\\n\r]/g, "");
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value.toLocaleString("en-KE")}</strong><small>{detail}</small></article>;
}
