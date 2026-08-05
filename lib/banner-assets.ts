import type { BannerPlacement } from "@/lib/types";

const BASE = "/Ceter_Technologies_Banners_Photorealistic";

type FixedBannerAsset = {
  image: string;
  mobileImage: string;
};

const homepageAssets: FixedBannerAsset[] = [
  asset("01_Homepage_Hero/ceter-hero-office-printer"),
  asset("01_Homepage_Hero/ceter-hero-toners-and-consumables"),
  asset("01_Homepage_Hero/ceter-hero-business-it-support")
];

const categoryAssets: Record<string, FixedBannerAsset> = {
  "multifunction-printers": asset("02_Minor_Category/ceter-category-printers"),
  photocopiers: asset("02_Minor_Category/ceter-category-photocopiers"),
  "toners-and-ink": asset("02_Minor_Category/ceter-category-toners")
};

const serviceAssets: FixedBannerAsset[] = [
  asset("03_Services_Solutions/ceter-services-cctv"),
  asset("03_Services_Solutions/ceter-services-networking"),
  asset("03_Services_Solutions/ceter-services-maintenance-support")
];

export function getFixedBannerAsset({
  placement,
  index = 0,
  categorySlug
}: {
  placement: BannerPlacement | string;
  index?: number;
  categorySlug?: string | null;
}) {
  if (isMainPlacement(placement)) return homepageAssets[index] ?? null;
  if (isCategoryPlacement(placement) && categorySlug) return categoryAssets[categorySlug] ?? null;
  if (isServicesPlacement(placement)) return serviceAssets[index] ?? null;
  return null;
}

function asset(path: string): FixedBannerAsset {
  return {
    image: `${BASE}/${path}-desktop.webp`,
    mobileImage: `${BASE}/${path}-mobile.webp`
  };
}

function isMainPlacement(placement: string) {
  return placement === "main" || placement === "top";
}

function isCategoryPlacement(placement: string) {
  return placement === "category" || placement === "middle";
}

function isServicesPlacement(placement: string) {
  return placement === "services" || placement === "bottom";
}
