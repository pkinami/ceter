import fs from "node:fs";
import path from "node:path";
import type { Banner } from "@/lib/types";
import { getBannerAssetUrl, type BannerManifestEntry, type BannerShape } from "@/lib/banner-schema";

const heroAssets = {
  wide: asset("wide", "32:12", [1280, 1920, 2560], "(min-width: 1280px)", "100vw"),
  mid: asset("mid", "16:9", [1024, 1280, 1600], "(min-width: 640px)", "100vw"),
  tall: asset("tall", "4:5", [720, 1080, 1440], "(max-width: 639px)", "100vw")
};

const categoryAssets = {
  wide: asset("wide", "32:9", [1280, 1600, 2400], "(min-width: 1280px)", "100vw"),
  mid: asset("mid", "2.33:1", [1024, 1280], "(min-width: 640px)", "100vw"),
  tall: asset("tall", "9:5", [720, 1080], "(max-width: 639px)", "100vw")
};

const servicesAssets = {
  wide: asset("wide", "16:5", [1280, 1600, 2400], "(min-width: 1280px)", "100vw"),
  mid: asset("mid", "2:1", [1024, 1280], "(min-width: 640px)", "100vw"),
  tall: asset("tall", "5:3", [720, 1080], "(max-width: 639px)", "100vw")
};

export const bannerManifest: {
  homepage: BannerManifestEntry[];
  categories: Record<string, BannerManifestEntry[]>;
  services: BannerManifestEntry[];
} = {
  homepage: [
    banner({
      id: "static-hero-office-printer",
      slug: "office-printer",
      group: "hero",
      slot: "homepage-1",
      title: "Printers for Kenyan Offices",
      kicker: "Ceter Technologies",
      body: "Reliable printers, photocopiers, toners and service support from Nairobi.",
      ctaLabel: "Shop printers",
      ctaHref: "/category/printers",
      focalPoint: { x: 50, y: 50, mode: "center", crop: "Centered office printer composition." },
      assets: heroAssets,
      priority: "high"
    }),
    banner({
      id: "static-hero-toners",
      slug: "toners-consumables",
      group: "hero",
      slot: "homepage-2",
      title: "Original Toners and Consumables",
      kicker: "Ready stock",
      body: "Match cartridges, drums and maintenance kits to your printer model.",
      ctaLabel: "Find toners",
      ctaHref: "/category/toners",
      focalPoint: { x: 25, y: 50, mode: "left", crop: "Subject weighted to the left." },
      assets: heroAssets
    }),
    banner({
      id: "static-hero-it-support",
      slug: "business-it-support",
      group: "hero",
      slot: "homepage-3",
      title: "IT Support for Business Teams",
      kicker: "Service desk",
      body: "Get structured cabling, networking, CCTV and maintenance support.",
      ctaLabel: "Request service",
      ctaHref: "/quote",
      focalPoint: { x: 75, y: 50, mode: "right", crop: "Subject weighted to the right." },
      assets: heroAssets
    })
  ],
  categories: {
    printers: [
      banner({
        id: "static-category-printers",
        slug: "printers",
        group: "category",
        slot: "category-printers",
        title: "Printers and Multifunction Devices",
        kicker: "Catalog",
        body: "Compare office printers, photocopiers and all-in-one machines.",
        ctaLabel: "Browse printers",
        ctaHref: "/category/printers",
        focalPoint: { x: 42, y: 48, mode: "custom", crop: "Custom test focal point." },
        assets: categoryAssets
      })
    ],
    photocopiers: [
      banner({
        id: "static-category-photocopiers",
        slug: "photocopiers",
        group: "category",
        slot: "category-photocopiers",
        title: "Photocopiers Built for Workgroups",
        kicker: "Equipment",
        body: "Source machines, spares and maintenance support in one place.",
        ctaLabel: "Browse photocopiers",
        ctaHref: "/category/photocopiers",
        focalPoint: { x: 50, y: 50, mode: "center", crop: null },
        assets: categoryAssets
      })
    ],
    toners: [
      banner({
        id: "static-category-toners",
        slug: "toners",
        group: "category",
        slot: "category-toners",
        title: "Toners, Drums and Spares",
        kicker: "Consumables",
        body: "Keep print fleets supplied with compatible consumables.",
        ctaLabel: "Browse consumables",
        ctaHref: "/category/toners",
        focalPoint: { x: 50, y: 50, mode: "center", crop: null },
        assets: categoryAssets
      })
    ]
  },
  services: [
    banner({
      id: "static-services-networking",
      slug: "networking",
      group: "services",
      slot: "services-networking",
      title: "Networking and Structured Cabling",
      kicker: "Infrastructure",
      body: "Plan, install and support reliable office connectivity.",
      ctaLabel: "Request quote",
      ctaHref: "/quote",
      focalPoint: { x: 50, y: 50, mode: "center", crop: null },
      assets: servicesAssets
    }),
    banner({
      id: "static-services-cctv",
      slug: "cctv",
      group: "services",
      slot: "services-cctv",
      title: "CCTV and Access Control",
      kicker: "Security",
      body: "Install business security systems with practical support.",
      ctaLabel: "Request quote",
      ctaHref: "/quote",
      focalPoint: { x: 50, y: 50, mode: "center", crop: null },
      assets: servicesAssets
    })
  ]
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
  return getAllBannerEntries().flatMap((entry) =>
    (["wide", "mid", "tall"] as const).flatMap((shape) => entry.assets[shape].widths.map((width) => getBannerAssetUrl(entry, shape, width)))
  );
}

export function getHeroPreloadImages() {
  return bannerManifest.homepage.slice(0, 1).flatMap((entry) => entry.assets.tall.widths.map((width) => getBannerAssetUrl(entry, "tall", width)));
}

export function validateBannerManifest() {
  const missing = getAllBannerImagePaths().filter((assetPath) => !fs.existsSync(path.join(process.cwd(), "public", assetPath)));
  if (missing.length) throw new Error(`Missing banner assets:\n${missing.join("\n")}`);
}

function asset(shape: BannerShape, aspectRatio: string, widths: readonly number[], media: string, sizes: string) {
  return { shape, aspectRatio, widths, media, sizes };
}

function banner(input: Omit<BannerManifestEntry, "alt" | "image" | "mobileImage" | "laptopImage" | "imageVariants" | "placement" | "categoryId" | "sortOrder" | "route" | "component" | "textSide" | "priority" | "secondaryCtaLabel" | "secondaryCtaHref"> & Partial<Pick<BannerManifestEntry, "priority">>): BannerManifestEntry {
  const placement = input.group === "hero" ? "main" : input.group === "services" ? "services" : "category";
  return {
    ...input,
    alt: input.title,
    image: getBannerAssetUrl(input, "wide", input.assets.wide.widths[0]),
    laptopImage: getBannerAssetUrl(input, "mid", input.assets.mid.widths[0]),
    mobileImage: getBannerAssetUrl(input, "tall", input.assets.tall.widths[0]),
    imageVariants: [],
    placement,
    categoryId: null,
    sortOrder: 0,
    route: input.ctaHref ?? "/",
    component: "BannerCarousel",
    textSide: "left",
    priority: input.priority ?? "lazy",
    secondaryCtaLabel: null,
    secondaryCtaHref: null
  };
}
