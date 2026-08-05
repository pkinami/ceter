"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { BannerCarousel } from "@/components/BannerCarousel";
import { getFixedBannerAsset } from "@/lib/banner-assets";
import type { Banner, BannerPlacement } from "@/lib/types";

type BannerRecord = {
  id: string;
  title: string;
  kicker: string | null;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  image: string | null;
  mobile_image: string | null;
  placement: string;
  category_id: string | null;
  sort_order: number;
  is_enabled: boolean;
  category?: { slug: string } | null;
};

type CategoryOption = {
  id: string;
  name: string;
  slug: string;
};

export function BannerAdminForm({
  banner,
  categories,
  action,
  assetIndex = 0
}: {
  banner?: BannerRecord;
  categories: CategoryOption[];
  action: (formData: FormData) => Promise<void>;
  assetIndex?: number;
}) {
  const [title, setTitle] = useState(banner?.title ?? "");
  const [kicker, setKicker] = useState(banner?.kicker ?? "");
  const [body, setBody] = useState(banner?.body ?? "");
  const [ctaLabel, setCtaLabel] = useState(banner?.cta_label ?? "");
  const [ctaHref, setCtaHref] = useState(banner?.cta_href ?? "");
  const [placement, setPlacement] = useState(normalizePlacement(banner?.placement));
  const [categoryId, setCategoryId] = useState(banner?.category_id ?? "");
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const fixedAsset = getFixedBannerAsset({
    placement,
    index: assetIndex,
    categorySlug: banner?.category?.slug ?? selectedCategory?.slug
  });

  const previewBanner = useMemo<Banner>(() => ({
    id: banner?.id ?? "preview",
    title: title || "Banner headline preview",
    kicker: kicker || "Ceter Technologies",
    body: body || "Supporting banner text appears here before the banner is saved.",
    ctaLabel: ctaLabel || "Button text",
    ctaHref: ctaHref || "/category",
    image: fixedAsset?.image ?? banner?.image ?? "/product-placeholder.svg",
    mobileImage: fixedAsset?.mobileImage ?? banner?.mobile_image ?? null,
    placement,
    categoryId: categoryId || null,
    sortOrder: banner?.sort_order ?? 0
  }), [banner?.id, banner?.image, banner?.mobile_image, banner?.sort_order, body, categoryId, ctaHref, ctaLabel, fixedAsset?.image, fixedAsset?.mobileImage, kicker, placement, title]);

  return (
    <form action={action} className="grid gap-3 rounded-md border border-slate-200 p-3">
      <input type="hidden" name="id" value={banner?.id ?? ""} />
      <h3 className="text-sm font-black uppercase text-slate-600">{banner ? "Edit banner" : "Create banner"}</h3>

      <div className="overflow-hidden rounded-md border border-slate-200">
        <BannerCarousel banners={[previewBanner]} variant={placement === "services" ? "services" : placement === "category" ? "category" : "main"} compact={placement !== "main"} />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="text-sm font-semibold text-slate-700">Banner images are managed from the project public folder. You can continue editing the banner content and display settings.</p>
        {fixedAsset ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ReadOnlyImagePreview label="Desktop asset" src={fixedAsset.image} />
            <ReadOnlyImagePreview label="Mobile asset" src={fixedAsset.mobileImage} />
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-amber-700">No fixed public asset is safely mapped for this banner.</p>
        )}
      </div>

      <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <input name="kicker" value={kicker} onChange={(event) => setKicker(event.target.value)} placeholder="Subtitle/kicker" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} placeholder="Supporting text" className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />

      <div className="grid gap-2 md:grid-cols-2">
        <input name="cta_label" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} placeholder="Button text" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="cta_href" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} placeholder="Button URL" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <select name="placement" value={placement} onChange={(event) => setPlacement(event.target.value as BannerPlacement)} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
          <option value="main">Main hero</option>
          <option value="category">Category</option>
          <option value="services">Services</option>
        </select>
        <select name="category_id" value={categoryId} onChange={(event) => setCategoryId(event.target.value)} disabled={placement !== "category"} className="h-10 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100 disabled:text-slate-400">
          <option value="">Select category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <input name="sort_order" type="number" defaultValue={banner?.sort_order ?? 0} aria-label="Sort order" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="is_enabled" defaultChecked={banner?.is_enabled ?? true} /> Enabled
      </label>

      <div className="flex gap-2">
        <button className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">{banner ? "Save" : "Create"}</button>
      </div>
    </form>
  );
}

function ReadOnlyImagePreview({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold uppercase text-slate-500">{label}</p>
      <Image src={src} alt="" width={360} height={160} className="h-24 w-full rounded-md border border-slate-200 object-cover" />
      <p className="mt-1 break-all text-xs text-slate-500">{src}</p>
    </div>
  );
}

function normalizePlacement(value?: string): BannerPlacement {
  if (value === "top") return "main";
  if (value === "middle") return "category";
  if (value === "bottom") return "services";
  if (value === "category" || value === "services") return value;
  return "main";
}
