import type { Banner, BannerImageVariant } from "@/lib/types";

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

export function normalizeBannerImageVariants(value: unknown): BannerImageVariant[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const url = normalizePublicAssetUrl(typeof record.url === "string" ? record.url : null);
    const width = Number(record.width);
    const height = Number(record.height);
    const shape = record.shape === "wide" || record.shape === "mid" || record.shape === "tall" ? record.shape : null;
    if (!url || !shape || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
    return [{
      slot: typeof record.slot === "string" ? record.slot : `${shape}_${width}`,
      url,
      width,
      height,
      shape,
      aspectRatio: typeof record.aspectRatio === "string" ? record.aspectRatio : `${width}:${height}`
    }];
  });
}

export function bannerVariantSrcSet(variants: BannerImageVariant[], shape: BannerImageVariant["shape"]) {
  return variants
    .filter((variant) => variant.shape === shape)
    .sort((a, b) => a.width - b.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
}
