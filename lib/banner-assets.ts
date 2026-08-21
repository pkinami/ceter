import type { Banner } from "@/lib/types";

export function getStaticHomepageBanners() {
  return { main: [] as Banner[], category: {} as Record<string, Banner[]>, services: [] as Banner[] };
}

export function getStaticCategoryBanners(): Banner[] {
  return [];
}

export function getAllBannerEntries() {
  return [];
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
