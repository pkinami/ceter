import { deleteBrandAction, upsertBrandAction } from "@/app/admin/actions";
import { hasPermission, requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

const knownWorkbookBrands = ["HP", "Canon", "Kyocera", "Epson", "Zebra", "Brother", "Ricoh", "Konica Minolta", "Xerox", "Evolis"];

export default async function BrandsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requirePermission("brands.view");
  const params = await searchParams;
  const query = text(params?.q).toLowerCase();
  const canManage = hasPermission(session, "brands.manage");
  const [brands, unassignedCount] = await Promise.all([
    prisma.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
    prisma.product.count({ where: { brand_id: null, archived_at: null } })
  ]);
  const filtered = query ? brands.filter((brand) => [brand.name, brand.slug].some((value) => value.toLowerCase().includes(query))) : brands;
  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting">
        <div><p>Catalogue &gt; Brands</p><h1>Brands</h1><span>Manage brand records used by the public product catalogue. Products without a workbook brand stay unassigned for review.</span></div>
      </div>
      <section className="ceter-admin-stat-grid">
        <Stat label="Brands" value={brands.length} detail="Database records" />
        <Stat label="Workbook matched" value={knownWorkbookBrands.filter((name) => brands.some((brand) => brand.name.toLowerCase() === name.toLowerCase())).length} detail="Expected named brands" />
        <Stat label="Unassigned Brand" value={unassignedCount} detail="Do not create fake Unbranded records" />
        <Stat label="Visible" value={brands.length} detail="Brand model has no hidden flag yet" />
      </section>
      <form className="ceter-admin-toolbar" action="/admin/brands">
        <label className="ceter-admin-table-search"><span className="sr-only">Search brands</span><input name="q" defaultValue={text(params?.q)} placeholder="Search brands" /></label>
        <select name="visibility" defaultValue="all"><option value="all">All visibility</option><option value="visible">Visible</option></select>
        <select name="review" defaultValue="all"><option value="all">All products</option><option value="unassigned">Unassigned Brand review</option></select>
        <button className="ceter-admin-secondary-button">Search</button>
      </form>
      {canManage ? (
        <article className="ceter-admin-panel ceter-admin-form-panel">
          <div className="ceter-admin-panel-header"><div><span>Create</span><h2>Brand Editor</h2></div></div>
          <form className="ceter-admin-form" action={upsertBrandAction}>
            <input type="hidden" name="return_to" value="/admin/brands" />
            <label>Name<input name="name" required /></label>
            <label>Slug<input name="slug" /></label>
            <label>Logo URL<input name="icon" placeholder="/brands/hp.svg" /></label>
            <label>Description<input name="description" disabled placeholder="Additive schema field not present" /></label>
            <label>Website<input name="website" disabled placeholder="Additive schema field not present" /></label>
            <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button">Create Brand</button></div>
          </form>
        </article>
      ) : null}
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Records</span><h2>Brand List</h2></div></div>
        <div className="ceter-admin-table-wrap"><table>
          <thead><tr><th>Logo</th><th>Name</th><th>Slug</th><th>Description</th><th>Website</th><th>Product count</th><th>Visibility</th><th>Sort order</th><th>Actions</th></tr></thead>
          <tbody>{filtered.length ? filtered.map((brand, index) => (
            <tr key={brand.id}>
              <td>{brand.icon ? <span className="ceter-admin-image-thumb" aria-label={`${brand.name} logo preview`} style={{ backgroundImage: `url("${cssUrl(brand.icon)}")` }} /> : "-"}</td>
              <td>{brand.name}</td>
              <td><code>{brand.slug}</code></td>
              <td>-</td>
              <td>-</td>
              <td>{brand._count.products}</td>
              <td><span className="ceter-admin-status green">Visible</span></td>
              <td>{index + 1}</td>
              <td>{canManage ? <form action={deleteBrandAction}><input type="hidden" name="id" value={brand.id} /><button className="ceter-admin-secondary-button">Archive</button></form> : "View"}</td>
            </tr>
          )) : <tr><td colSpan={9}><div className="ceter-admin-empty">No brands match the current filters.</div></td></tr>}</tbody>
        </table></div>
      </article>
    </div>
  );
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
