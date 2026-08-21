"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { HelpCircle, ImagePlus, Trash2 } from "lucide-react";
import { deleteBannerAction, upsertBannerAction } from "@/app/admin/actions";
import { BANNER_ALLOWED_TYPES, BANNER_IMAGE_SLOTS, BANNER_MAX_FILE_SIZE, HOMEPAGE_BANNER_REQUIREMENTS } from "@/lib/banner-requirements";

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
  text_position: string;
  overlay_opacity: number;
  badge_enabled: boolean;
  badge_text: string | null;
  badge_color: string | null;
  badge_position: string;
  placement: string;
  category_id: string | null;
  sort_order: number;
  is_enabled: boolean;
  category?: { id: string; name: string } | null;
};

type CategoryOption = { id: string; name: string };

type PreviewState = { url: string; message: string; ok: boolean } | null;

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
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="space-y-4">
      {(success || error) ? <div className={error ? "admin-card border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" : "admin-card border-green-200 bg-green-50 p-3 text-sm font-semibold text-green-700"}>{error ?? success}</div> : null}

      <div className="admin-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-ink">Homepage Banner Order</h2>
            <p className="mt-1 text-xs text-slate-600">{liveHomepageCount} live homepage banners. Storefront displays enabled database banners by sort order.</p>
          </div>
          <button type="button" className="btn-lite" onClick={() => setHelpOpen(true)}>
            <HelpCircle className="h-4 w-4" />
            Banner Help
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {homepageBanners.length ? homepageBanners.map((banner) => (
            <div key={banner.id} className="rounded-md border border-slate-200 bg-white p-3">
              <div className="text-xs font-black text-slate-500">Sort {banner.sort_order}</div>
              <div className="mt-2 truncate text-sm font-bold text-ink">{banner.title}</div>
              <div className={banner.is_enabled ? "mt-2 text-xs font-bold text-green-700" : "mt-2 text-xs font-bold text-slate-500"}>{banner.is_enabled ? "Live" : "Disabled"}</div>
            </div>
          )) : (
            <div className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-xs font-semibold text-slate-500">No homepage banners yet.</div>
          )}
        </div>
      </div>

      <BannerForm categories={categories} />

      <div className="space-y-3">
        {banners.map((banner) => (
          <details key={banner.id} className="admin-card overflow-hidden" open={false}>
            <summary className="cursor-pointer p-4">
              <span className="font-black text-ink">{banner.title}</span>
              <span className="ml-2 text-xs text-slate-500">{banner.placement} | sort {banner.sort_order} | {banner.is_enabled ? "live" : "disabled"}</span>
            </summary>
            <div className="border-t border-line p-4">
              <BannerForm banner={banner} categories={categories} />
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

function BannerForm({ banner, categories }: { banner?: BannerRow; categories: CategoryOption[] }) {
  const [preview, setPreview] = useState<PreviewState>(null);
  const [focalMode, setFocalMode] = useState(() => currentFocal(banner?.image_variants).mode);
  const [focalX, setFocalX] = useState(() => currentFocal(banner?.image_variants).x);
  const [focalY, setFocalY] = useState(() => currentFocal(banner?.image_variants).y);
  const [textPosition, setTextPosition] = useState(banner?.text_position ?? "left");
  const [overlayOpacity, setOverlayOpacity] = useState(banner?.overlay_opacity ?? 70);
  const [badgeEnabled, setBadgeEnabled] = useState(banner?.badge_enabled ?? false);
  const [badgeText, setBadgeText] = useState(banner?.badge_text ?? "");
  const [badgeColor, setBadgeColor] = useState(banner?.badge_color ?? "#0f766e");
  const [badgePosition, setBadgePosition] = useState(banner?.badge_position ?? "top-left");
  const hasClientError = Boolean(preview && !preview.ok);
  const master = currentMaster(banner?.image_variants);
  const currentPreview = preview?.url ?? master?.url ?? banner?.image ?? "";
  const variants = normalizeVariants(banner?.image_variants);

  return (
    <form action={upsertBannerAction} className="grid gap-3 md:grid-cols-3">
      <input type="hidden" name="return_to" value="/admin/banners" />
      {banner ? <input type="hidden" name="id" value={banner.id} /> : null}
      <input type="hidden" name="existing_image" value={banner?.image ?? ""} />
      <input type="hidden" name="existing_laptop_image" value={banner?.laptop_image ?? ""} />
      <input type="hidden" name="existing_mobile_image" value={banner?.mobile_image ?? ""} />
      <input type="hidden" name="existing_image_variants" value={JSON.stringify(normalizeVariants(banner?.image_variants))} />

      <label className="grid gap-1 text-xs font-semibold">Title<input className="admin-input" name="title" autoComplete="off" defaultValue={banner?.title ?? ""} required /></label>
      <label className="grid gap-1 text-xs font-semibold">Kicker<input className="admin-input" name="kicker" autoComplete="off" defaultValue={banner?.kicker ?? ""} /></label>
      <label className="grid gap-1 text-xs font-semibold">Sort order<input className="admin-input" type="number" autoComplete="off" min={0} name="sort_order" defaultValue={banner?.sort_order ?? 0} /></label>
      <label className="grid gap-1 text-xs font-semibold md:col-span-3">Description<input className="admin-input" name="body" autoComplete="off" defaultValue={banner?.body ?? ""} required /></label>
      <label className="grid gap-1 text-xs font-semibold">CTA label<input className="admin-input" name="cta_label" autoComplete="off" defaultValue={banner?.cta_label ?? ""} /></label>
      <label className="grid gap-1 text-xs font-semibold">CTA URL<input className="admin-input" name="cta_href" autoComplete="off" defaultValue={banner?.cta_href ?? ""} placeholder="/category" /></label>
      <label className="grid gap-1 text-xs font-semibold">
        Placement
        <select className="admin-input" name="placement" autoComplete="off" defaultValue={banner?.placement ?? "main"}>
          <option value="main">Homepage hero</option>
          <option value="category">Category page</option>
          <option value="services">Services section</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Category
        <select className="admin-input" name="category_id" autoComplete="off" defaultValue={banner?.category_id ?? ""}>
          <option value="">No category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" name="is_enabled" defaultChecked={banner?.is_enabled ?? false} />
        Live
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Text position
        <select className="admin-input" name="text_position" value={textPosition} onChange={(event) => setTextPosition(event.target.value)}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Overlay darkness
        <input className="admin-input" type="number" min={0} max={95} name="overlay_opacity" value={overlayOpacity} onChange={(event) => setOverlayOpacity(Number(event.target.value))} />
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input type="checkbox" name="badge_enabled" checked={badgeEnabled} onChange={(event) => setBadgeEnabled(event.target.checked)} />
        Show badge
      </label>

      <label className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 text-xs font-semibold md:col-span-3">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>Master image</span>
          <span className="text-slate-500">Minimum 1600x500px. Recommended 2160px wide or larger for sharp high-density phones.</span>
        </span>
        <input
          className="admin-input"
          type="file"
          name="master_image_file"
          accept={BANNER_ALLOWED_TYPES.join(",")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            validateImage(file).then(setPreview);
          }}
        />
        {currentPreview ? (
          <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-950" style={{ aspectRatio: "32 / 9" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentPreview} alt="" className="h-full w-full object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} />
          </div>
        ) : <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-slate-300 text-slate-500"><ImagePlus className="h-5 w-5" /></div>}
        <span className={preview?.ok === false ? "text-red-700" : preview?.message.includes("Warning") ? "text-amber-700" : "text-slate-500"}>{preview?.message ?? "Upload a single master image. The storefront crops responsively from the selected focal point without stretching."}</span>
      </label>

      <label className="grid gap-1 text-xs font-semibold">
        Focal position
        <select
          className="admin-input"
          name="focal_mode"
          value={focalMode}
          onChange={(event) => {
            const next = event.target.value;
            setFocalMode(next);
            if (next === "left") setFocalX(25);
            if (next === "center") setFocalX(50);
            if (next === "right") setFocalX(75);
          }}
        >
          <option value="center">Center</option>
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Focal X
        <input className="admin-input" type="number" min={0} max={100} name="focal_x" value={focalX} onChange={(event) => { setFocalMode("custom"); setFocalX(Number(event.target.value)); }} />
      </label>
      <label className="grid gap-1 text-xs font-semibold">
        Focal Y
        <input className="admin-input" type="number" min={0} max={100} name="focal_y" value={focalY} onChange={(event) => { setFocalMode("custom"); setFocalY(Number(event.target.value)); }} />
      </label>
      <label className="grid gap-1 text-xs font-semibold md:col-span-3">Optional crop notes<input className="admin-input" name="crop_metadata" autoComplete="off" defaultValue={currentFocal(banner?.image_variants).crop ?? ""} placeholder="Subject or crop guidance for future image updates" /></label>

      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:col-span-3 md:grid-cols-3">
        <label className="grid gap-1 text-xs font-semibold">Badge text<input className="admin-input" name="badge_text" autoComplete="off" value={badgeText} onChange={(event) => setBadgeText(event.target.value)} /></label>
        <label className="grid gap-1 text-xs font-semibold">Badge colour<input className="admin-input h-10" type="color" name="badge_color" value={badgeColor} onChange={(event) => setBadgeColor(event.target.value)} /></label>
        <label className="grid gap-1 text-xs font-semibold">
          Badge position
          <select className="admin-input" name="badge_position" value={badgePosition} onChange={(event) => setBadgePosition(event.target.value)}>
            <option value="top-left">Top left</option>
            <option value="top-right">Top right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="bottom-right">Bottom right</option>
          </select>
        </label>
        <p className="text-xs text-slate-500 md:col-span-3">Badges are optional and appear only when enabled for this banner.</p>
      </div>

      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 md:col-span-3 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="text-xs font-black text-ink">Optional responsive image variants</div>
          <p className="mt-1 text-xs text-slate-500">Use these when one master crop cannot preserve the subject across phones, tablets and desktops. Exact dimensions are required.</p>
        </div>
        {BANNER_IMAGE_SLOTS.map((slot) => {
          const requirement = HOMEPAGE_BANNER_REQUIREMENTS[slot];
          const existing = variants.find((variant) => (variant as { slot?: unknown }).slot === slot) as { url?: string } | undefined;
          return (
            <label key={slot} className="grid gap-1 text-xs font-semibold">
              {requirement.label} <span className="font-normal text-slate-500">{requirement.width}x{requirement.height}px, {requirement.use}</span>
              <input className="admin-input" type="file" name={requirement.field} accept={BANNER_ALLOWED_TYPES.join(",")} />
              {existing?.url ? <span className="truncate text-[11px] font-normal text-green-700">Current variant saved</span> : null}
            </label>
          );
        })}
      </div>

      {currentPreview ? (
        <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-950 md:col-span-3" style={{ aspectRatio: "32 / 9" }}>
          <div className="relative h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentPreview} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: `${focalX}% ${focalY}%` }} />
            <div className="absolute inset-0" style={{ background: previewOverlay(textPosition, overlayOpacity) }} />
            {badgeEnabled && badgeText.trim() ? <span className={badgePreviewClass(badgePosition)} style={{ backgroundColor: badgeColor }}>{badgeText}</span> : null}
            <div className={previewTextClass(textPosition)}>
              <div className="text-xs font-bold uppercase text-teal-200">{banner?.kicker || "Kicker"}</div>
              <div className="mt-1 text-xl font-black text-white">{banner?.title || "Banner title"}</div>
              <div className="mt-1 max-w-md text-sm text-slate-100">{banner?.body || "Banner description preview"}</div>
            </div>
          </div>
        </div>
      ) : null}
      <button className="btn-dark md:col-span-3" disabled={hasClientError}>{banner ? "Save Banner" : "Create Banner"}</button>
    </form>
  );
}

function validateImage(file: File) {
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
      const ok = image.naturalWidth >= 1600 && image.naturalHeight >= 500;
      const sharpOnPhones = image.naturalWidth >= 2160 && image.naturalHeight >= 1200;
      resolve({
        url,
        ok,
        message: ok
          ? sharpOnPhones
            ? `Ready: ${image.naturalWidth}x${image.naturalHeight}px master image.`
            : `Warning: ${image.naturalWidth}x${image.naturalHeight}px meets the minimum, but 2160x1200px or larger is recommended for sharp high-density phones.`
          : `Image is ${image.naturalWidth}x${image.naturalHeight}px. Minimum is 1600x500px.`
      });
    };
    image.onerror = () => resolve({ url, message: "Image preview could not be loaded.", ok: false });
    image.src = url;
  });
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const requirements = useMemo(() => ["Use a master image of at least 1600x500px.", "Add exact-size responsive variants when one crop cannot protect the subject across phone, tablet and desktop layouts.", "Set focal position, text position and overlay darkness before publishing."], []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="banner-help-title">
      <div className="max-w-2xl rounded-lg bg-white p-5 shadow-xl">
        <h2 id="banner-help-title" className="text-lg font-black text-ink">Homepage Banner Requirements</h2>
        <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
          <p>The storefront displays only enabled database banners in admin-defined sort order. Disabled banners remain available for drafting and preview.</p>
          <ul className="list-disc pl-5">
            {requirements.map((item) => <li key={item}>{item}</li>)}
          </ul>
          <p>Supported formats are JPG, PNG, and WebP. Each file must be 3 MB or smaller.</p>
          <p>Wide, mid and tall variants are selected by viewport aspect ratio. The carousel keeps arrows, indicators, drag/swipe, pause behaviour, CTA links and reduced-motion support.</p>
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

function currentMaster(value: unknown) {
  const variants = normalizeVariants(value);
  return variants.find((item) => (item as { slot?: unknown }).slot === "master") as { url?: string; width?: number; height?: number } | undefined;
}

function currentFocal(value: unknown) {
  const master = currentMaster(value) as { focalMode?: unknown; focalX?: unknown; focalY?: unknown; crop?: unknown } | undefined;
  const mode = master?.focalMode === "left" || master?.focalMode === "right" || master?.focalMode === "custom" ? master.focalMode : "center";
  const x = Number(master?.focalX);
  const y = Number(master?.focalY);
  return {
    mode,
    x: Number.isFinite(x) ? x : mode === "left" ? 25 : mode === "right" ? 75 : 50,
    y: Number.isFinite(y) ? y : 50,
    crop: typeof master?.crop === "string" ? master.crop : ""
  };
}

function previewOverlay(textPosition: string, overlayOpacity: number) {
  const opacity = Math.min(95, Math.max(0, overlayOpacity)) / 100;
  const heavy = `rgba(11, 30, 57, ${opacity})`;
  const mid = `rgba(11, 30, 57, ${opacity * 0.52})`;
  const light = `rgba(11, 30, 57, ${opacity * 0.12})`;
  if (textPosition === "center") return `linear-gradient(90deg, ${mid}, ${heavy}, ${mid})`;
  if (textPosition === "right") return `linear-gradient(270deg, ${heavy}, ${mid}, ${light})`;
  return `linear-gradient(90deg, ${heavy}, ${mid}, ${light})`;
}

function previewTextClass(textPosition: string) {
  const base = "absolute inset-y-0 z-10 flex max-w-xl flex-col justify-center p-5 drop-shadow";
  if (textPosition === "center") return `${base} left-1/2 -translate-x-1/2 items-center text-center`;
  if (textPosition === "right") return `${base} right-0 items-end text-right`;
  return `${base} left-0 items-start text-left`;
}

function badgePreviewClass(position: string) {
  const base = "absolute z-20 rounded-md px-2.5 py-1 text-[11px] font-black uppercase text-white shadow";
  if (position === "top-right") return `${base} right-4 top-4`;
  if (position === "bottom-left") return `${base} bottom-4 left-4`;
  if (position === "bottom-right") return `${base} bottom-4 right-4`;
  return `${base} left-4 top-4`;
}
