import type { Banner } from "@/lib/types";
import { getBannerAssetUrl, getBannerFallbackUrl, getBannerSrcSet, type BannerGroup, type BannerManifestEntry, type BannerShape, type BannerShapeAsset } from "@/lib/banner-schema";
import fs from "node:fs";
import path from "node:path";

const GROUP_SPECS = {
  hero: {
    tall: { shape: "tall", aspectRatio: "4 / 5", widths: [720, 1080, 1440], media: "(max-width: 767px)", sizes: "100vw" },
    mid: { shape: "mid", aspectRatio: "16 / 9", widths: [1024, 1280, 1600], media: "(min-width: 768px) and (max-width: 1023px)", sizes: "100vw" },
    wide: { shape: "wide", aspectRatio: "8 / 3", widths: [1280, 1920, 2560], media: "(min-width: 1024px)", sizes: "100vw" }
  },
  category: {
    tall: { shape: "tall", aspectRatio: "9 / 5", widths: [720, 1080], media: "(max-width: 767px)", sizes: "100vw" },
    mid: { shape: "mid", aspectRatio: "21 / 9", widths: [1024, 1280], media: "(min-width: 768px) and (max-width: 1023px)", sizes: "100vw" },
    wide: { shape: "wide", aspectRatio: "32 / 9", widths: [1280, 1600, 2400], media: "(min-width: 1024px)", sizes: "100vw" }
  },
  services: {
    tall: { shape: "tall", aspectRatio: "5 / 3", widths: [720, 1080], media: "(max-width: 767px)", sizes: "100vw" },
    mid: { shape: "mid", aspectRatio: "2 / 1", widths: [1024, 1280], media: "(min-width: 768px) and (max-width: 1023px)", sizes: "100vw" },
    wide: { shape: "wide", aspectRatio: "16 / 5", widths: [1280, 1600, 2400], media: "(min-width: 1024px)", sizes: "100vw" }
  }
} as const satisfies Record<BannerGroup, Record<BannerShape, BannerShapeAsset>>;

export const bannerManifest = {
  homepage: [
    banner({
      id: "home-office-printer",
      slug: "office-printer",
      group: "hero",
      title: "Office Technology Supplied and Supported",
      kicker: "Ceter Technologies Limited",
      body: "Reliable printers, copiers and office equipment supplied with dependable technical support.",
      alt: "Modern office printer and copier equipment in a professional workplace",
      ctaLabel: "Shop Office Equipment",
      ctaHref: "/category",
      secondaryCtaLabel: "Request a Quote",
      secondaryCtaHref: "/quote",
      priority: "high",
      textSide: "left",
      slot: "Homepage hero carousel slide 1",
      route: "/",
      component: "BannerCarousel"
    }),
    banner({
      id: "home-toners-consumables",
      slug: "toners-consumables",
      group: "hero",
      title: "Printers, Copiers and Toners Ready",
      kicker: "Office equipment and consumables",
      body: "Find dependable printing equipment, toner cartridges, consumables and essential office supplies.",
      alt: "Printer toner cartridges and office consumables arranged for business supply",
      ctaLabel: "Browse Products",
      ctaHref: "/category",
      secondaryCtaLabel: "Get a Quotation",
      secondaryCtaHref: "/quote",
      priority: "high",
      textSide: "left",
      slot: "Homepage hero carousel slide 2",
      route: "/",
      component: "BannerCarousel"
    }),
    banner({
      id: "home-business-it-support",
      slug: "business-it-support",
      group: "hero",
      title: "Business IT Equipment From One Partner",
      kicker: "IT equipment and support",
      body: "Networking, office technology and responsive technical support for growing organisations.",
      alt: "Business IT support workspace with networking and office technology equipment",
      ctaLabel: "Explore Solutions",
      ctaHref: "/about",
      secondaryCtaLabel: "Contact Us",
      secondaryCtaHref: "/quote",
      priority: "high",
      textSide: "left",
      slot: "Homepage hero carousel slide 3",
      route: "/",
      component: "BannerCarousel"
    })
  ],
  categories: {
    "multifunction-printers": [
      categoryBanner("category-printers", "printers", "Reliable Printers for Every Office", "Explore dependable printers for home offices, businesses and professional workgroups.", "multifunction-printers", "Office printers ready for business document workflows")
    ],
    photocopiers: [
      categoryBanner("category-photocopiers", "photocopiers", "Commercial Copiers Built for Teams", "Multifunction photocopiers designed for reliable, high-volume office document workflows.", "photocopiers", "Commercial photocopier configured for high-volume office use")
    ],
    "toners-and-ink": [
      categoryBanner("category-toners", "toners", "Toners and Consumables in Stock", "Quality toner cartridges, drums and printing consumables for leading printer brands.", "toners-and-ink", "Toner cartridges and printer consumables for office supply")
    ]
  } satisfies Record<string, BannerManifestEntry[]>,
  services: [
    serviceBanner("services-cctv", "cctv", "CCTV Installation for Business Sites", "Security systems", "Professional surveillance planning, camera installation, configuration and ongoing technical support.", "Request CCTV Assessment", "/quote?service=CCTV%20Installation", "CCTV security cameras installed for business premises"),
    serviceBanner("services-networking", "networking", "Stable Networks for Growing Teams", "Networking", "Business networking, Wi-Fi, switching and structured connectivity designed for reliable performance.", "Discuss Your Network", "/quote?service=Business%20Networking", "Business networking equipment and structured connectivity infrastructure"),
    serviceBanner("services-maintenance-support", "maintenance-support", "IT Support That Keeps Moving", "Maintenance and support", "Responsive equipment maintenance and technical assistance that keeps teams productive.", "Request Technical Support", "/quote?service=Technical%20Support", "Technician maintaining office IT equipment for business support")
  ]
} satisfies {
  homepage: BannerManifestEntry[];
  categories: Record<string, BannerManifestEntry[]>;
  services: BannerManifestEntry[];
};

validateBannerManifest();

export function getStaticHomepageBanners() {
  return {
    main: bannerManifest.homepage,
    category: bannerManifest.categories,
    services: bannerManifest.services
  };
}

export function getStaticCategoryBanners(categorySlug: string): Banner[] {
  const categories: Record<string, BannerManifestEntry[]> = bannerManifest.categories;
  return categories[categorySlug] ?? [];
}

export function getAllBannerEntries() {
  return Object.values(bannerManifest.categories).flat().concat(bannerManifest.homepage, bannerManifest.services);
}

export function getAllBannerImagePaths() {
  return getAllBannerEntries().flatMap((entry) =>
    (["tall", "mid", "wide"] as const).flatMap((shape) =>
      entry.assets[shape].widths.map((width) => getBannerAssetUrl(entry, shape, width))
    )
  );
}

export function getHeroPreloadImages() {
  return bannerManifest.homepage.slice(0, 1).map((entry) => ({
    href: getBannerFallbackUrl(entry),
    imageSrcSet: getBannerSrcSet(entry, "wide"),
    imageSizes: entry.assets.wide.sizes
  }));
}

function categoryBanner(id: string, slug: string, title: string, body: string, categorySlug: string, alt: string): BannerManifestEntry {
  return banner({
    id,
    slug,
    group: "category",
    title,
    kicker: "Ceter catalogue",
    body,
    alt,
    ctaLabel: "Browse Products",
    ctaHref: `/category/${categorySlug}`,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    priority: "lazy",
    textSide: "left",
    slot: `${categorySlug} category strip`,
    route: `/category/${categorySlug}`,
    component: "BannerCarousel"
  });
}

function serviceBanner(id: string, slug: string, title: string, kicker: string, body: string, ctaLabel: string, ctaHref: string, alt: string): BannerManifestEntry {
  return banner({
    id,
    slug,
    group: "services",
    title,
    kicker,
    body,
    alt,
    ctaLabel,
    ctaHref,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    priority: "lazy",
    textSide: "left",
    slot: "Homepage services carousel",
    route: "/",
    component: "BannerCarousel"
  });
}

function banner(input: Omit<BannerManifestEntry, "image" | "mobileImage" | "placement" | "categoryId" | "sortOrder" | "assets"> & { secondaryCtaLabel?: string | null; secondaryCtaHref?: string | null }): BannerManifestEntry {
  const assets = GROUP_SPECS[input.group];
  return {
    ...input,
    assets,
    image: getBannerAssetUrl(input, "wide", assets.wide.widths[assets.wide.widths.length - 2]),
    mobileImage: getBannerAssetUrl(input, "tall", assets.tall.widths[0]),
    placement: input.group === "hero" ? "main" : input.group,
    categoryId: input.group === "category" ? input.route.replace("/category/", "") : null,
    sortOrder: 0
  };
}

export function validateBannerManifest() {
  const invalidNames = findInvalidBannerNames();
  const mismatches = getAllBannerImagePaths().flatMap((url) => {
    const result = findPublicAssetWithExactCase(url);
    return result.exists ? [] : [{ url, reason: result.reason }];
  });

  if (invalidNames.length || mismatches.length) {
    const invalidBlock = invalidNames.length ? `Invalid public/banners name(s):\n${invalidNames.map((name) => `  ${name}`).join("\n")}` : "";
    const missingBlock = mismatches.length ? `Missing banner asset(s):\n${mismatches.map(({ url, reason }) => `${url}\n  ${reason}`).join("\n")}` : "";
    throw new Error([invalidBlock, missingBlock].filter(Boolean).join("\n\n"));
  }
}

function findInvalidBannerNames() {
  const root = path.join(process.cwd(), "public", "banners");
  if (!fs.existsSync(root)) return [];
  const invalid: string[] = [];

  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
      if (/[A-Z _]/.test(entry.name)) invalid.push(relative);
      if (dir === root && !["hero", "category", "services"].includes(entry.name)) invalid.push(`${relative} (must be inside hero/, category/ or services/)`);
      if (entry.isDirectory()) walk(absolute);
    }
  }

  walk(root);
  return invalid;
}

function findPublicAssetWithExactCase(url: string): { exists: true } | { exists: false; reason: string } {
  if (!url.startsWith("/")) return { exists: false, reason: "Asset URL must start with /." };
  const segments = url.slice(1).split("/");
  let current = path.join(process.cwd(), "public");

  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") {
      return { exists: false, reason: `Invalid path segment ${JSON.stringify(segment)}.` };
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return { exists: false, reason: `Directory is missing before segment ${JSON.stringify(segment)}: ${current}` };
    }

    const entry = entries.find((item) => item.name === segment);
    if (!entry) {
      const caseInsensitiveMatch = entries.find((item) => item.name.toLowerCase() === segment.toLowerCase());
      const available = entries.map((item) => item.name).sort().join(", ");
      return {
        exists: false,
        reason: caseInsensitiveMatch
          ? `Case mismatch at ${current}: manifest has ${JSON.stringify(segment)}, disk has ${JSON.stringify(caseInsensitiveMatch.name)}.`
          : `Missing segment ${JSON.stringify(segment)} in ${current}. Available entries: ${available || "(none)"}.`
      };
    }

    current = path.join(current, segment);

    if (segment === segments[segments.length - 1] && !entry.isFile()) {
      return { exists: false, reason: `Final segment is not a file: ${current}` };
    }

    if (segment !== segments[segments.length - 1] && !entry.isDirectory()) {
      return { exists: false, reason: `Intermediate segment is not a directory: ${current}` };
    }
  }

  return { exists: true };
}
