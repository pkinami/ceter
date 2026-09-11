import { archiveBannerAction, duplicateBannerAction, restoreBannerAction, upsertBannerAction } from "@/app/admin/actions";
import { requirePermission } from "@/lib/admin/auth";
import { HOMEPAGE_BANNER_REQUIREMENTS } from "@/lib/banner-requirements";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StorefrontBannersPage({ searchParams }: PageProps) {
  await requirePermission("storefront.banners.manage");
  const params = await searchParams;
  const editId = single(params?.edit);
  const query = single(params?.q)?.trim() ?? "";
  const placement = single(params?.placement);
  const showArchived = single(params?.archived) === "1";

  const where = {
    archived_at: showArchived ? { not: null } : null,
    placement: placement && ["main", "category", "services"].includes(placement) ? placement as "main" | "category" | "services" : undefined,
    OR: query ? [
      { title: { contains: query, mode: "insensitive" as const } },
      { internal_name: { contains: query, mode: "insensitive" as const } },
      { banner_key: { contains: query, mode: "insensitive" as const } }
    ] : undefined
  };

  const [banners, categories, editing, history] = await Promise.all([
    prisma.banner.findMany({ where, orderBy: [{ placement: "asc" }, { sort_order: "asc" }, { created_at: "desc" }], include: { category: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } }),
    editId ? prisma.banner.findUnique({ where: { id: editId } }) : Promise.resolve(null),
    editId ? prisma.auditLog.findMany({ where: { entity: "Banner", entity_id: editId }, orderBy: { created_at: "desc" }, take: 12, include: { user: { select: { full_name: true, email: true } } } }) : Promise.resolve([])
  ]);
  const selected = editing ?? null;
  const variants = imageVariants(selected?.image_variants);

  return (
    <div className="ceter-admin-page">
      <div className="ceter-admin-greeting"><div><p>Storefront &gt; Homepage & Banners</p><h1>Banners</h1><span>Manage responsive storefront banners with separate mobile, landscape and desktop assets, destinations, ordering and schedules.</span></div><a className="ceter-admin-primary-button" href="#banner-editor">Add Banner</a></div>
      <section className="ceter-admin-stat-grid">
        <Stat label="Listed" value={banners.length} detail={showArchived ? "Archived records" : "Active/draft records"} />
        <Stat label="Active now" value={banners.filter((banner) => banner.is_enabled && !banner.archived_at && isInSchedule(banner.starts_at, banner.ends_at)).length} detail="Enabled and in schedule" />
        <Stat label="Three variants" value={banners.filter((banner) => banner.image && banner.laptop_image && banner.mobile_image).length} detail="Mobile, landscape, ultra-wide" />
        <Stat label="Archived" value={await prisma.banner.count({ where: { archived_at: { not: null } } })} detail="Restorable, not deleted" />
      </section>

      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>Filters</span><h2>Find Banners</h2></div></div>
        <form className="ceter-admin-form" method="get">
          <input type="hidden" name="tab" value="banners" />
          <label>Search<input name="q" defaultValue={query} placeholder="Title, internal name, key" /></label>
          <label>Placement<select name="placement" defaultValue={placement ?? ""}><option value="">All</option><option value="main">Homepage hero</option><option value="category">Category</option><option value="services">Services</option></select></label>
          <label><input name="archived" type="checkbox" value="1" defaultChecked={showArchived} /> Show archived only</label>
          <div className="ceter-admin-form-actions"><button className="ceter-admin-secondary-button">Apply</button><a className="ceter-admin-secondary-button" href="/admin/storefront/homepage?tab=banners">Reset</a></div>
        </form>
      </article>

      <article id="banner-editor" className="ceter-admin-panel ceter-admin-form-panel">
        <div className="ceter-admin-panel-header"><div><span>Banner Editor</span><h2>{selected ? selected.internal_name ?? selected.title : "Add Banner"}</h2></div>{selected ? <a className="ceter-admin-secondary-button" href="/admin/storefront/homepage?tab=banners#banner-editor">New banner</a> : null}</div>
        <form className="ceter-admin-form" action={upsertBannerAction} encType="multipart/form-data">
          <input type="hidden" name="return_to" value={selected ? `/admin/storefront/homepage?tab=banners&edit=${selected.id}` : "/admin/storefront/homepage?tab=banners"} />
          {selected ? <input type="hidden" name="id" value={selected.id} /> : null}
          <input type="hidden" name="existing_image_variants" value={JSON.stringify(variants)} />
          <label>Stable key<input name="banner_key" defaultValue={selected?.banner_key ?? ""} placeholder="hero-business-it-support" /></label>
          <label>Internal name<input name="internal_name" defaultValue={selected?.internal_name ?? selected?.title ?? ""} required /></label>
          <label>Title<input name="title" defaultValue={selected?.title ?? ""} required /></label>
          <label>Kicker<input name="kicker" defaultValue={selected?.kicker ?? ""} /></label>
          <label className="wide">Body<textarea name="body" defaultValue={selected?.body ?? ""} required /></label>
          <label>CTA label<input name="cta_label" defaultValue={selected?.cta_label ?? ""} /></label>
          <label>Destination type<select name="destination_type" defaultValue={selected?.destination_type ?? "internal"}><option value="internal">Internal path</option><option value="category">Category path</option><option value="service">Service path</option><option value="external">External HTTPS</option></select></label>
          <label>CTA destination<input name="cta_href" defaultValue={selected?.cta_href ?? ""} placeholder="/category/printers" /></label>
          <label>Placement<select name="placement" defaultValue={selected?.placement ?? "main"}><option value="main">Homepage hero</option><option value="category">Category</option><option value="services">Services</option></select></label>
          <label>Category<select name="category_id" defaultValue={selected?.category_id ?? ""}><option value="">None</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Alt text<input name="alt_text" defaultValue={selected?.alt_text ?? selected?.title ?? ""} /></label>
          <label>Overlay strength<input name="overlay_opacity" type="number" min={0} max={95} defaultValue={selected?.overlay_opacity ?? 70} /></label>
          <label>Text position<select name="text_position" defaultValue={selected?.text_position ?? "left"}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
          <label>Sort order<input name="sort_order" type="number" defaultValue={selected?.sort_order ?? 0} /></label>
          <label>Start date/time<input name="starts_at" type="datetime-local" defaultValue={datetimeValue(selected?.starts_at)} /></label>
          <label>End date/time<input name="ends_at" type="datetime-local" defaultValue={datetimeValue(selected?.ends_at)} /></label>
          <label>Mobile focal position<input name="mobile_focal_position" defaultValue={selected?.mobile_focal_position ?? "center center"} /></label>
          <label>Landscape focal position<input name="landscape_focal_position" defaultValue={selected?.landscape_focal_position ?? "center center"} /></label>
          <label>Ultra-wide focal position<input name="ultrawide_focal_position" defaultValue={selected?.ultrawide_focal_position ?? "center center"} /></label>
          <label>Mobile 1080x1350<input name={HOMEPAGE_BANNER_REQUIREMENTS.mobile.field} type="file" accept="image/webp,image/png,image/jpeg" />{selected?.mobile_image ? <span><input name="remove_mobile" type="checkbox" /> Remove current mobile image</span> : null}</label>
          <label>Landscape 1440x1080<input name={HOMEPAGE_BANNER_REQUIREMENTS.landscape.field} type="file" accept="image/webp,image/png,image/jpeg" />{selected?.laptop_image ? <span><input name="remove_landscape" type="checkbox" /> Remove current landscape image</span> : null}</label>
          <label>Ultra-wide 2048x768<input name={HOMEPAGE_BANNER_REQUIREMENTS.ultrawide.field} type="file" accept="image/webp,image/png,image/jpeg" />{selected?.image ? <span><input name="remove_ultrawide" type="checkbox" /> Remove current ultrawide image</span> : null}</label>
          <label><input name="is_enabled" type="checkbox" defaultChecked={selected?.is_enabled ?? false} /> Active</label>
          <div className="ceter-admin-form-actions"><button className="ceter-admin-primary-button">{selected ? "Save Changes" : "Create Banner"}</button></div>
        </form>
        {selected ? <div id="preview"><PreviewGrid banner={selected} variants={variants} /></div> : null}
      </article>

      {selected ? (
        <article className="ceter-admin-panel">
          <div className="ceter-admin-panel-header"><div><span>History</span><h2>Recent Changes</h2></div></div>
          <div className="ceter-admin-table-wrap"><table><thead><tr><th>Action</th><th>User</th><th>When</th></tr></thead><tbody>{history.length ? history.map((entry) => <tr key={entry.id}><td>{entry.action}</td><td>{entry.user?.full_name ?? entry.user?.email ?? "System"}</td><td>{entry.created_at.toLocaleString("en-KE")}</td></tr>) : <tr><td colSpan={3}><div className="ceter-admin-empty">No changes recorded.</div></td></tr>}</tbody></table></div>
        </article>
      ) : null}

      <article className="ceter-admin-panel">
        <div className="ceter-admin-panel-header"><div><span>List</span><h2>Banner List</h2></div></div>
        <div className="ceter-admin-table-wrap"><table>
          <thead><tr><th>Preview</th><th>Name</th><th>Placement</th><th>Variants</th><th>Schedule</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{banners.length ? banners.map((banner) => (
            <tr key={banner.id}>
              <td>{banner.image ? <span className="ceter-admin-banner-thumb" aria-label={`${banner.internal_name ?? banner.title} preview`} style={{ backgroundImage: `url("${cssUrl(banner.image)}")` }} /> : "-"}</td>
              <td><strong>{banner.internal_name ?? banner.title}</strong><br /><small>{banner.banner_key ?? banner.id}</small></td>
              <td>{banner.placement}{banner.category ? ` / ${banner.category.name}` : ""}</td>
              <td>{banner.mobile_image ? "M" : "-"} / {banner.laptop_image ? "L" : "-"} / {banner.image ? "U" : "-"}</td>
              <td>{scheduleLabel(banner.starts_at, banner.ends_at)}</td>
              <td>{banner.sort_order}</td>
              <td><span className={`ceter-admin-status ${banner.archived_at ? "gray" : banner.is_enabled ? "green" : "amber"}`}>{banner.archived_at ? "Archived" : banner.is_enabled ? "Active" : "Draft"}</span></td>
              <td><div className="ceter-admin-form-actions"><a className="ceter-admin-secondary-button" href={`/admin/storefront/homepage?tab=banners&edit=${banner.id}#preview`}>Preview</a><a className="ceter-admin-secondary-button" href={`/admin/storefront/homepage?tab=banners&edit=${banner.id}#banner-editor`}>Edit</a><form action={duplicateBannerAction}><input type="hidden" name="id" value={banner.id} /><button className="ceter-admin-secondary-button">Duplicate</button></form>{banner.archived_at ? <form action={restoreBannerAction}><input type="hidden" name="id" value={banner.id} /><button className="ceter-admin-secondary-button">Restore</button></form> : <form action={archiveBannerAction}><input type="hidden" name="id" value={banner.id} /><button className="ceter-admin-secondary-button">Archive</button></form>}</div></td>
            </tr>
          )) : <tr><td colSpan={8}><div className="ceter-admin-empty">No banners match the current filters.</div></td></tr>}</tbody>
        </table></div>
      </article>
    </div>
  );
}

function PreviewGrid({ banner, variants }: { banner: NonNullable<Awaited<ReturnType<typeof prisma.banner.findUnique>>>; variants: Array<{ slot?: string; url?: string }> }) {
  const previews = [
    ["Mobile", "aspect-[4/5]", variants.find((variant) => variant.slot === "mobile")?.url ?? banner.mobile_image],
    ["Tablet", "aspect-[4/3]", variants.find((variant) => variant.slot === "landscape")?.url ?? banner.laptop_image],
    ["Desktop", "aspect-[8/3]", variants.find((variant) => variant.slot === "ultrawide")?.url ?? banner.image]
  ];
  return <div className="mt-4"><h3 className="text-sm font-black uppercase text-slate-700">Live storefront preview</h3><div className="mt-3 grid gap-3 md:grid-cols-3">{previews.map(([label, aspect, url]) => <figure key={label} className="rounded-md border border-slate-200 p-2">{url ? <div className={`relative overflow-hidden rounded ${aspect}`}><span className="absolute inset-0 bg-cover bg-center" role="img" aria-label={banner.alt_text ?? banner.title} style={{ backgroundImage: `url("${cssUrl(url)}")` }} /><div className="absolute inset-0 bg-black/35" /><figcaption className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-1 text-xs font-semibold text-white">{label}</figcaption></div> : <div className="ceter-admin-empty">Missing {label}</div>}</figure>)}</div></div>;
}

function Stat({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="ceter-admin-stat-card"><span>{label}</span><strong>{value.toLocaleString("en-KE")}</strong><small>{detail}</small></article>;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function imageVariants(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, string> => Boolean(item) && typeof item === "object") : [];
}

function datetimeValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function isInSchedule(startsAt: Date | null, endsAt: Date | null) {
  const now = Date.now();
  return (!startsAt || startsAt.getTime() <= now) && (!endsAt || endsAt.getTime() > now);
}

function scheduleLabel(startsAt: Date | null, endsAt: Date | null) {
  if (!startsAt && !endsAt) return "Always";
  const start = startsAt ? startsAt.toLocaleDateString("en-KE") : "Now";
  const end = endsAt ? endsAt.toLocaleDateString("en-KE") : "No end";
  return `${start} - ${end}`;
}

function cssUrl(value: string) {
  return value.replace(/["\\\n\r]/g, "");
}
