import type { Banner } from "@/lib/types";

export function getStaticHomepageBanners() {
  return {
    main: STATIC_BANNERS.filter((banner) => banner.placement === "main"),
    category: STATIC_BANNERS.filter((banner) => banner.placement === "category").reduce<Record<string, Banner[]>>((groups, banner) => {
      if (!banner.categoryKey) return groups;
      groups[banner.categoryKey] = [...(groups[banner.categoryKey] ?? []), banner];
      return groups;
    }, {}),
    services: STATIC_BANNERS.filter((banner) => banner.placement === "services")
  };
}

export function getStaticCategoryBanners(categorySlug?: string): Banner[] {
  const banners = STATIC_BANNERS.filter((banner) => banner.placement === "category");
  return categorySlug ? banners.filter((banner) => banner.categoryKey === categorySlug) : banners;
}

export function getAllBannerEntries() {
  return STATIC_BANNERS;
}

export function getAllBannerImagePaths() {
  return STATIC_BANNERS.flatMap((banner) => [banner.image, banner.laptopImage, banner.mobileImage]).filter((path): path is string => Boolean(path));
}

export function getHeroPreloadImages() {
  return STATIC_BANNERS.filter((banner) => banner.placement === "main").slice(0, 1).flatMap((banner) => [banner.image, banner.laptopImage, banner.mobileImage]).filter((path): path is string => Boolean(path));
}

export function validateBannerManifest() {
  for (const imagePath of getAllBannerImagePaths()) {
    if (!imagePath.startsWith("/New_banner/")) throw new Error(`Unexpected banner asset path: ${imagePath}`);
  }
  return;
}

type StaticBanner = Banner & { categoryKey?: string };

const STATIC_BANNERS: StaticBanner[] = [
  banner({
    id: "hero-business-it-support",
    group: "hero",
    slug: "business-it-support",
    placement: "main",
    title: "Business IT support that keeps work moving",
    mobileTitle: "IT support that keeps work moving",
    kicker: "IT support",
    body: "Responsive support, equipment sourcing and infrastructure services for active offices.",
    mobileBody: "Support, sourcing and setup for active offices.",
    ctaLabel: "Request support",
    ctaHref: "/quote",
    badge: { enabled: true, text: "NEW", color: "#0f766e", position: "top-left" },
    sortOrder: 10
  }),
  banner({
    id: "hero-toners-consumables",
    group: "hero",
    slug: "toners-consumables",
    placement: "main",
    title: "Toners and consumables for busy teams",
    mobileTitle: "Toners for busy teams",
    kicker: "Commercial supply",
    body: "Source dependable cartridges, drums, spares and office supplies with Ceter Technologies.",
    mobileBody: "Cartridges, drums and spares supplied fast.",
    ctaLabel: "Shop toners",
    ctaHref: "/category/toner-ink-and-consumables",
    badge: { enabled: true, text: "OFFER", color: "#b45309", position: "top-left" },
    sortOrder: 11
  }),
  banner({
    id: "hero-office-printer",
    group: "hero",
    slug: "office-printer",
    placement: "main",
    title: "Office printers supplied and supported",
    mobileTitle: "Printers supplied and supported",
    kicker: "Print infrastructure",
    body: "Choose printers, copiers and support plans sized for your workplace.",
    mobileBody: "Printers, copiers and service plans for work.",
    ctaLabel: "Explore printers",
    ctaHref: "/category/multifunction-printers",
    badge: { enabled: true, text: "NEW", color: "#0f766e", position: "top-left" },
    sortOrder: 12
  }),
  banner({
    id: "services-maintenance-support",
    group: "services",
    slug: "maintenance-support",
    placement: "services",
    title: "Maintenance and support for office equipment",
    mobileTitle: "Maintenance for office equipment",
    kicker: "Service desk",
    body: "Keep printers, copiers and IT equipment maintained by a responsive technical team.",
    mobileBody: "Printer, copier and IT support when work depends on it.",
    ctaLabel: "Book service",
    ctaHref: "/quote",
    badge: { enabled: true, text: "NEW", color: "#0f766e", position: "top-left" },
    sortOrder: 100
  }),
  banner({
    id: "services-networking",
    group: "services",
    slug: "networking",
    placement: "services",
    title: "Structured networking for growing offices",
    mobileTitle: "Networking for growing offices",
    kicker: "Networking",
    body: "Plan cabling, Wi-Fi, switching and server connectivity with accountable support.",
    mobileBody: "Cabling, Wi-Fi and switching planned cleanly.",
    ctaLabel: "Plan a network",
    ctaHref: "/quote",
    sortOrder: 101
  }),
  banner({
    id: "services-cctv",
    group: "services",
    slug: "cctv",
    placement: "services",
    title: "CCTV installation and support",
    mobileTitle: "CCTV installation and support",
    kicker: "Security systems",
    body: "Protect sites with camera systems, installation, configuration and maintenance support.",
    mobileBody: "Camera systems installed, configured and supported.",
    ctaLabel: "Request CCTV quote",
    ctaHref: "/quote",
    sortOrder: 102
  }),
  banner({
    id: "category-toners",
    group: "category",
    slug: "toners",
    categoryKey: "toner-ink-and-consumables",
    placement: "category",
    title: "Toners and printer consumables",
    mobileTitle: "Toners and consumables",
    kicker: "Category",
    body: "Find toner cartridges, drums and ink for office print fleets.",
    mobileBody: "Cartridges, drums and ink for office fleets.",
    ctaLabel: "Browse toners",
    ctaHref: "/category/toner-ink-and-consumables",
    badge: { enabled: true, text: "OFFER", color: "#b45309", position: "top-left" },
    sortOrder: 200
  }),
  banner({
    id: "category-photocopiers",
    group: "category",
    slug: "photocopiers",
    categoryKey: "photocopiers",
    placement: "category",
    title: "Photocopiers for office productivity",
    mobileTitle: "Photocopiers for offices",
    kicker: "Category",
    body: "Compare copier options for reliable everyday document workflows.",
    mobileBody: "Reliable copiers for everyday document work.",
    ctaLabel: "Browse photocopiers",
    ctaHref: "/category/photocopiers",
    sortOrder: 201
  }),
  banner({
    id: "category-printers",
    group: "category",
    slug: "printers",
    categoryKey: "multifunction-printers",
    placement: "category",
    title: "Printers for every department",
    mobileTitle: "Printers for every department",
    kicker: "Category",
    body: "Shop office printers backed by installation, supplies and service.",
    mobileBody: "Office printers with setup, supplies and service.",
    ctaLabel: "Browse printers",
    ctaHref: "/category/multifunction-printers",
    sortOrder: 202
  })
];

function banner(input: {
  id: string;
  group: "hero" | "category" | "services";
  slug: string;
  categoryKey?: string;
  placement: "main" | "category" | "services";
  title: string;
  mobileTitle: string;
  kicker: string;
  body: string;
  mobileBody: string;
  ctaLabel: string;
  ctaHref: string;
  badge?: Banner["badge"];
  sortOrder: number;
}): StaticBanner {
  return {
    id: input.id,
    title: input.title,
    mobileTitle: input.mobileTitle,
    kicker: input.kicker,
    body: input.body,
    mobileBody: input.mobileBody,
    alt: input.title,
    ctaLabel: input.ctaLabel,
    ctaHref: input.ctaHref,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    image: `/New_banner/${input.group}/${input.slug}-ultrawide.webp`,
    laptopImage: `/New_banner/${input.group}/${input.slug}-landscape.webp`,
    mobileImage: `/New_banner/${input.group}/${input.slug}-mobile.webp`,
    imageVariants: [
      { slot: "mobile", url: `/New_banner/${input.group}/${input.slug}-mobile.webp`, width: 1080, height: 1350, aspectRatio: "4:5", shape: "tall" },
      { slot: "landscape", url: `/New_banner/${input.group}/${input.slug}-landscape.webp`, width: 1440, height: 1080, aspectRatio: "4:3", shape: "mid" },
      { slot: "ultrawide", url: `/New_banner/${input.group}/${input.slug}-ultrawide.webp`, width: 2048, height: 768, aspectRatio: "8:3", shape: "wide" }
    ],
    focalPoint: { x: 60, y: 50, mode: "custom" },
    textPosition: "left",
    overlayOpacity: 72,
    badge: input.badge ?? null,
    placement: input.placement,
    categoryId: null,
    categoryKey: input.categoryKey,
    sortOrder: input.sortOrder
  };
}
