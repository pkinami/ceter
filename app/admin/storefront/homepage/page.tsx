import { deleteHomepageSectionAction, upsertHomepageSectionAction } from "@/app/admin/actions";
import StorefrontBannersPage from "@/app/admin/storefront/banners/page";
import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StorefrontHomepagePage({ searchParams }: PageProps) {
  const params = await searchParams;
  if (single(params?.tab) === "banners") {
    return (
      <>
        <StorefrontTabs active="banners" />
        <StorefrontBannersPage searchParams={Promise.resolve(params ?? {})} />
      </>
    );
  }

  await requirePermission("storefront.homepage.manage");
  const editId = single(params?.edit);
  const [sections, categories, featuredCount, bannerCount] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: [{ sort_order: "asc" }, { updated_at: "desc" }], include: { category: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.count({ where: { is_featured: true, is_published: true, archived_at: null } }),
    prisma.banner.count({ where: { is_enabled: true } })
  ]);
  const selected = sections.find((section) => section.id === editId) ?? null;
  return (
    <div className="ceter-admin-page">
      <StorefrontTabs active="homepage" />
      <div className="ceter-admin-greeting"><div><p>Storefront &gt; Homepage Sections</p><h1>Homepage Sections</h1><span>Manage stored homepage sections. The public homepage can also render fallback content when no matching stored section is enabled.</span></div><div className="ceter-admin-form-actions"><a className="ceter-admin-secondary-button" href="/">Preview storefront</a><a className="ceter-admin-primary-button" href="/admin/storefront/homepage#section-editor">Add Section</a></div></div>
      <section className="ceter-admin-stat-grid">
        <Stat label="Stored sections" value={sections.length} detail="Database-backed homepage sections" />
        <Stat label="Enabled sections" value={sections.filter((section) => section.is_enabled).length} detail="Eligible for public display" />
        <Stat label="Active banners" value={bannerCount} detail="Enabled banner records" />
        <Stat label="Featured products" value={featuredCount} detail="Published products selected for feature areas" />
      </section>
      <article id="section-editor" className="ceter-admin-panel ceter-admin-form-panel">
        <div className="ceter-admin-panel-header"><div><span>Section Editor</span><h2>{selected ? `Edit ${selected.title}` : "Add Section"}</h2></div>{selected ? <a className="ceter-admin-secondary-button" href="/admin/storefront/homepage#section-editor">New section</a> : null}</div>
        <form className="ceter-admin-form" action={upsertHomepageSectionAction}>
          <input type="hidden" name="return_to" value="/admin/storefront/homepage" />
          {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
          <label>Section heading<input name="title" required defaultValue={selected?.title ?? ""} /><small>Shown as the section title on the public homepage.</small></label>
          <label>Section type<select name="section_type" defaultValue={selected?.section_type ?? "category_products"}><option value="category_products">Products from one category</option><option value="featured_products">Featured products</option><option value="services">Service highlights</option><option value="brands">Brand section</option></select><small>Only category sections require a category.</small></label>
          <label>Category<select name="category_id" defaultValue={selected?.category_id ?? ""}><option value="">None</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><small>Used only when the type is products from one category.</small></label>
          <label>Product limit<input name="product_limit" type="number" min={1} max={24} defaultValue={selected?.product_limit ?? 8} /><small>Maximum products to show for product-based sections.</small></label>
          <label>Display order<input name="sort_order" type="number" defaultValue={selected?.sort_order ?? 0} /><small>Lower numbers appear first.</small></label>
          <label className="ceter-admin-switch-row"><input name="is_enabled" type="checkbox" defaultChecked={selected?.is_enabled ?? true} /> Enabled on storefront</label>
          <div className="ceter-admin-form-actions"><a className="ceter-admin-secondary-button" href="/admin/storefront/homepage">Cancel</a><button className="ceter-admin-primary-button">{selected ? "Save Section" : "Add Section"}</button></div>
        </form>
      </article>
      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Current Items</span><h2>Homepage Structure</h2></div></div>
        <div className="ceter-admin-table-wrap"><table>
          <thead><tr><th>Order</th><th>Heading</th><th>Type</th><th>Category/products</th><th>Preview</th><th>Status</th><th>Activity history</th><th>Actions</th></tr></thead>
          <tbody>{sections.length ? sections.map((section) => (
            <tr key={section.id}><td>{section.sort_order}</td><td><strong>{section.title}</strong></td><td>{sectionLabel(section.section_type)}</td><td>{section.category?.name ?? `${section.product_limit} products`}</td><td><a href="/" target="_blank" rel="noreferrer">Preview</a></td><td><span className={`ceter-admin-status ${section.is_enabled ? "green" : "amber"}`}>{section.is_enabled ? "Enabled" : "Disabled"}</span></td><td>{section.updated_at.toLocaleString("en-KE")}</td><td><div className="ceter-admin-form-actions"><a className="ceter-admin-secondary-button" href={`/admin/storefront/homepage?edit=${section.id}#section-editor`}>Edit</a><form action={deleteHomepageSectionAction}><input type="hidden" name="id" value={section.id} /><button className="ceter-admin-secondary-button">Remove</button></form></div></td></tr>
          )) : <tr><td colSpan={8}><div className="ceter-admin-empty">No stored sections are configured. Add a section to override or extend the homepage content managed in the database.</div></td></tr>}</tbody>
        </table></div>
      </article>
    </div>
  );
}

function StorefrontTabs({ active }: { active: "homepage" | "banners" }) {
  return (
    <nav className="ceter-admin-tabs" aria-label="Storefront content">
      <a className={active === "homepage" ? "active" : ""} href="/admin/storefront/homepage">Homepage Sections</a>
      <a className={active === "banners" ? "active" : ""} href="/admin/storefront/homepage?tab=banners">Banners</a>
    </nav>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value.toLocaleString("en-KE")}</strong><small>{detail}</small></article>;
}

function sectionLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
