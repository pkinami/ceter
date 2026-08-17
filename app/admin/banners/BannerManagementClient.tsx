"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { HelpCircle, ImagePlus, Trash2 } from "lucide-react";
import { deleteBannerAction, upsertBannerAction } from "@/app/admin/actions";
import { BANNER_ALLOWED_TYPES, BANNER_IMAGE_SLOTS, BANNER_MAX_FILE_SIZE, HOMEPAGE_BANNER_LIMIT, HOMEPAGE_BANNER_REQUIREMENTS, type BannerImageSlot } from "@/lib/banner-requirements";

type BannerRow = {
  id: string;
  title: string;
  kicker: string | null;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image: string | null;
  laptop_image: string | null;
  mobile_image: string | null;
  image_variants: unknown;
  placement: string;
  category_id: string | null;
  sort_order: number;
  is_enabled: boolean;
  category?: { id: string; name: string } | null;
};

type CategoryOption = { id: string; name: string };

type PreviewState = Partial<Record<BannerImageSlot, { url: string; message: string; ok: boolean }>>;

export function BannerManagementClient({
  banners,
  categories,
  success,
  error
}: {
  banners: BannerRow[];
  categories: CategoryOption[];
  success?: string;
  error?: string;
}) {
  const homepageBanners = banners.filter((banner) => banner.placement === "main").sort((a, b) => a.sort_order - b.sort_order);
  const liveHomepageCount = homepageBanners.filter((banner) => banner.is_enabled).length;
  const slots = Array.from({ length: HOMEPAGE_BANNER_LIMIT }, (_, index) => homepageBanners[index] ?? null);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-4">
      {(success || error) ? <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div> : null}

      <div className="admin-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-ink">Homepage Banner Slots</h2>
            <p className="mt-1 text-xs text-slate-600">{liveHomepageCount} of {HOMEPAGE_BANNER_LIMIT} live homepage banners enabled.</p>
          </div>
          <button type="button" className="btn-lite" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            Banner Help
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          {slots.map((banner, index) => (
            <div key={banner?.id ?? index} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs font-black text-slate-500">Slot {index + 1}</div>
              {banner ? (
                <>
                  <div className="mt-2 truncate text-sm font-bold text-ink">{banner.title}</div>
                  <div className={banner.is_enabled ? "mt-2 text-xs font-bold text-green-700" : "mt-2 text-xs font-bold text-slate-500"}>{banner.is_enabled ? "Live" : "Disabled"}</div>
                </>
              ) : (
                <div className="mt-2 text-xs text-slate-500">Empty</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <BannerForm categories={categories} liveHomepageCount={liveHomepageCount} />

      <div className="space-y-3">
        {banners.map((banner) => (
          <details key={banner.id} className="admin-card overflow-hidden" open={false}>
            <summary className="cursor-pointer p-4">
              <span className="font-black text-ink">{banner.title}</span>
              <span className="ml-2 text-xs text-slate-500">{banner.placement} | sort {banner.sort_order} | {banner.is_enabled ? "live" : "disabled"}</span>
            </summary>
            <div className="border-t border-line p-4">
              <BannerForm banner={banner} categories={categories} liveHomepageCount={liveHomepageCount} />
              <form action={deleteBannerAction} className="mt-3">
                <input type="hidden" name="id" value={banner.id} />
                <DeleteBannerButton />
              </form>
            </div>
          </details>
        ))}
      </div>

      {helpOpen ? <HelpDialog onClose={() => setHelpOpen(false)} /> : null}
    </div>
  );
}

function DeleteBannerButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn-lite text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm("Delete this banner and remove uploaded banner images from storage?")) event.preventDefault();
      }}
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting..." : "Delete Banner"}
    </button>
  );
}

function BannerForm({ banner, categories, liveHomepageCount }: { banner?: BannerRow; categories: CategoryOption[]; liveHomepageCount: number }) {
  const [previews, setPreviews] = useState<PreviewState>({});
  const hasClientError = Object.values(previews).some((preview) => preview && !preview.ok);
  const wouldExceedLiveLimit = !banner && liveHomepageCount >= HOMEPAGE_BANNER_LIMIT;

  return (
    <form action={upsertBannerAction} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="return_to" value="/admin/banners" />
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <input type="hidden" name="existing_image" value={banner?.image ?? ""} />
      <input type="hidden" name="existing_laptop_image" value={banner?.laptop_image ?? ""} />
      <input type="hidden" name="existing_mobile_image" value={banner?.mobile_image ?? ""} />
      <input type="hidden" name="existing_image_variants" value={JSON.stringify(normalizeVariants(banner?.image_variants))} />

      <label className="grid gap-1 text-xs font-semibold">Title<input className="admin-input" name="title" defaultValue={banner?.title ?? ""} required /></label>
      <label className="grid gap-1 text-xs font-semibold">Kicker<input className="admin-input" name="kicker" defaultValue={banner?.kicker ?? ""} /></label>
      <label className="grid gap-1 text-xs font-semibold">Sort order<input className="admin-input" type="number" min={0} name="sort_order" defaultValue={banner?.sort_order ?? 0} /></label>
      <label className="grid gap-1 text-xs font-semibold md:col-span-3">Description<input className="admin-input" name="body" defaultValue={banner?.body ?? ""} required /></label>
      <label className="grid gap-1 text-xs font-semibold">CTA label<input className="admin-input" name="cta_label" defaultValue={banner?.cta_label ?? ""} /></label>
      <label className="grid gap-1 text-xs font-semibold">CTA URL<input className="admin-input" name="cta_href" defaultValue={banner?.cta_href ?? ""} placeholder="/category" /></label>
      <label className="grid gap-1 text-xs font-semibold">
        Placement
        <select className="admin-input" name="placement" defaultValue={banner?.placement ?? "main"}>
          <option value="main">Homepage hero</option>
          <option value="category">Category page</option>
          <option value="services">Services section</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Category
        <select className="admin-input" name="category_id" defaultValue={banner?.category_id ?? ""}>
          <option value="">No category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" name="is_enabled" defaultChecked={banner?.is_enabled ?? !wouldExceedLiveLimit} />
        Live
      </label>

      {BANNER_IMAGE_SLOTS.map((slot) => (
        <ImageUploadField key={slot} slot={slot} currentUrl={currentVariantUrl(banner?.image_variants, slot)} preview={previews[slot]} onPreview={(preview) => setPreviews((current) => ({ ...current, [slot]: preview }))} />
      ))}

      {wouldExceedLiveLimit ? <p className="text-xs font-semibold text-amber-700 md:col-span-3">The five live homepage slots are already occupied. New banners are created disabled unless you disable another homepage banner.</p> : null}
      <button className="btn-dark md:col-span-3" disabled={hasClientError}>{banner ? "Save Banner" : "Create Banner"}</button>
    </form>
  );
}

function ImageUploadField({ slot, currentUrl, preview, onPreview }: { slot: BannerImageSlot; currentUrl?: string | null; preview?: PreviewState[BannerImageSlot]; onPreview: (preview: { url: string; message: string; ok: boolean }) => void }) {
  const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
  const accept = BANNER_ALLOWED_TYPES.join(",");
  const currentPreview = preview?.url ?? currentUrl ?? "";

  return (
    <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs font-semibold">
      <span className="flex items-center justify-between gap-2">
        <span>{requirement.label}</span>
        <span className="text-slate-500">{requirement.width}x{requirement.height}px | {requirement.aspectRatio}</span>
      </span>
      <input
        className="admin-input"
        type="file"
        name={requirement.field}
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          validateImage(file, slot).then(onPreview);
        }}
      />
      {currentPreview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={currentPreview} alt="" className="h-28 w-full rounded-md border border-slate-200 object-cover" />
      ) : <div className="flex h-28 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-500"><ImagePlus className="h-5 w-5" /></div>}
      <span className={preview?.ok === false ? "text-red-700" : "text-slate-500"}>{preview?.message ?? requirement.use}</span>
    </label>
  );
}

function validateImage(file: File, slot: BannerImageSlot) {
  const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
  const url = URL.createObjectURL(file);
  return new Promise<{ url: string; message: string; ok: boolean }>((resolve) => {
    if (!BANNER_ALLOWED_TYPES.includes(file.type as never)) {
      resolve({ url, message: "Use JPG, PNG, or WebP.", ok: false });
      return;
    }
    if (file.size > BANNER_MAX_FILE_SIZE) {
      resolve({ url, message: "File must be 3 MB or smaller.", ok: false });
      return;
    }
    const image = new Image();
    image.onload = () => {
      const ok = image.naturalWidth === requirement.width && image.naturalHeight === requirement.height;
      resolve({
        url,
        ok,
        message: ok ? `Ready: ${image.naturalWidth}x${image.naturalHeight}px (${requirement.aspectRatio}).` : `Wrong size: ${image.naturalWidth}x${image.naturalHeight}px. Required ${requirement.width}x${requirement.height}px.`
      });
    };
    image.onerror = () => resolve({ url, message: "Image preview could not be loaded.", ok: false });
    image.src = url;
  });
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const requirements = useMemo(() => Object.values(HOMEPAGE_BANNER_REQUIREMENTS), []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="banner-help-title">
      <div className="max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <h2 id="banner-help-title" className="text-lg font-black text-ink">Homepage Banner Requirements</h2>
        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
          <p>Homepage carousel has a maximum of {HOMEPAGE_BANNER_LIMIT} live banners. Each banner can store multiple aspect-ratio variants so the storefront can choose the closest image for the current viewport without stretching.</p>
          <ul className="list-disc pl-5">
            {requirements.map((item) => <li key={item.field}>{item.label}: {item.width}x{item.height}px ({item.aspectRatio}) for {item.use.toLowerCase()}</li>)}
          </ul>
          <p>Supported formats are JPG, PNG, and WebP. Each file must be 3 MB or smaller.</p>
          <p>Wide, mid and tall variants are selected by viewport aspect ratio. The carousel still rotates automatically and keeps arrows, indicators, drag/swipe, smooth transitions, CTA links and reduced-motion support.</p>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" className="btn-dark" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function normalizeVariants(value: unknown) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function currentVariantUrl(value: unknown, slot: BannerImageSlot) {
  const match = normalizeVariants(value).find((item) => (item as { slot?: unknown }).slot === slot) as { url?: unknown } | undefined;
  return typeof match?.url === "string" ? match.url : null;
}
