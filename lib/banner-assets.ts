import type { Banner } from "@/lib/types";

type EmptyBannerManifest = {
  homepage: Banner[];
  categories: Record<string, Banner[]>;
  services: Banner[];
};

export const bannerManifest: EmptyBannerManifest = {
  homepage: [],
  categories: {},
  services: []
};

export function getStaticHomepageBanners() {
  return {
    main: bannerManifest.homepage,
    category: bannerManifest.categories,
    services: bannerManifest.services
  };
}

export function getStaticCategoryBanners(categorySlug: string): Banner[] {
  return bannerManifest.categories[categorySlug] ?? [];
}

export function getAllBannerEntries() {
  return Object.values(bannerManifest.categories).flat().concat(bannerManifest.homepage, bannerManifest.services);
}

export function getAllBannerImagePaths() {
  return [];
}

export function getHeroPreloadImages() {
  return [];
}

export function validateBannerManifest() {
  return;
}
