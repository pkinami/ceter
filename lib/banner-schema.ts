import type { Banner } from "@/lib/types";

export type BannerGroup = "hero" | "category" | "services";
export type BannerShape = "wide" | "mid" | "tall";
export type LoadingPriority = "high" | "lazy";

export type BannerShapeAsset = {
  shape: BannerShape;
  aspectRatio: string;
  widths: readonly number[];
  media: string;
  sizes: string;
};

export type BannerManifestEntry = Banner & {
  slug: string;
  group: BannerGroup;
  priority: LoadingPriority;
  textSide: "left" | "right";
  slot: string;
  route: string;
  component: string;
  assets: Record<BannerShape, BannerShapeAsset>;
};

export function getBannerAssetUrl(entry: Pick<BannerManifestEntry, "group" | "slug">, shape: BannerShape, width: number) {
  return `/banners/${entry.group}/${entry.slug}-${shape}-${width}.webp`;
}

export function normalizePublicAssetUrl(url: string | null | undefined) {
  if (!url) return null;
  return url.startsWith("/public/") ? url.slice("/public".length) : url;
}

export function getBannerSrcSet(entry: BannerManifestEntry, shape: BannerShape) {
  return entry.assets[shape].widths.map((width) => `${getBannerAssetUrl(entry, shape, width)} ${width}w`).join(", ");
}

export function getBannerFallbackUrl(entry: BannerManifestEntry) {
  const widths = entry.assets.wide.widths;
  return getBannerAssetUrl(entry, "wide", widths[Math.max(0, widths.length - 2)]);
}
