import type { Metadata } from "next";
import type { Category, Product, StockStatus } from "@/lib/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.cetertechnologies.com").replace(/\/$/, "");
export const SITE_NAME = "Ceter Technologies Limited";
export const SITE_LOGO_PATH = "/ceter-logo-pack/lockup/ceter-logo-horizontal-1200.png";
export const SITE_LOGO_URL = absoluteUrl(SITE_LOGO_PATH);
export const PUBLIC_PRODUCT_WHERE = {
  is_published: true,
  archived_at: null
} as const;

const DEFAULT_DESCRIPTION = "Shop printers, photocopiers, toners, spare parts and printer repair services from Ceter Technologies in Nairobi.";

export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function canonicalPath(path = "/") {
  const [pathname] = path.split("?");
  return pathname || "/";
}

export function metadataForPage({
  title,
  description,
  path,
  image = SITE_LOGO_PATH,
  noindex = false
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const url = absoluteUrl(canonicalPath(path));
  const imageUrl = safeSocialImageUrl(image);

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      images: [{ url: imageUrl, width: 1200, height: 480, alt: title }]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl]
    }
  };
}

export function productMetadata(product: Product): Metadata {
  const title = `${product.name} ${product.brand ? `by ${product.brand}` : ""} in Kenya`.replace(/\s+/g, " ").trim();
  const description = truncateDescription(
    `Buy ${product.name}${product.brand ? ` by ${product.brand}` : ""}${product.category ? ` in ${product.category}` : ""} from Ceter Technologies in Nairobi. Price: KES ${product.price.toLocaleString("en-KE")}.`
  );
  const image = firstCrawlableImage(product.images) ?? SITE_LOGO_PATH;
  return metadataForPage({ title, description, path: `/product/${product.slug}`, image });
}

export function categoryMetadata(category: Category): Metadata {
  const focusPhrase = focusPhraseForCategory(category);
  const title = `${category.name} | ${focusPhrase}`;
  const description = truncateDescription(
    category.description
      ? `${category.description} Browse ${focusPhrase} from Ceter Technologies in Nairobi.`
      : `Browse ${focusPhrase} from Ceter Technologies, including dependable office equipment, consumables and support options in Kenya.`
  );
  return metadataForPage({ title, description, path: `/category/${category.slug}` });
}

export function focusPhraseForCategory(category: Pick<Category, "name" | "slug">) {
  const text = `${category.name} ${category.slug}`.toLowerCase();
  if (text.includes("photocop")) return "photocopiers in Nairobi";
  if (text.includes("barcode")) return "barcode printers Kenya";
  if (text.includes("id") || text.includes("evolis")) return "ID card printers Kenya";
  if (text.includes("toner") || text.includes("consumable") || text.includes("ink")) return "toner cartridges Kenya";
  if (text.includes("spare") || text.includes("part") || text.includes("accessor")) return "printer spare parts Kenya";
  if (text.includes("printer")) return "printers in Kenya";
  return `${category.name} Kenya`;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path)
    }))
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: SITE_LOGO_URL,
    telephone: "+254707143322",
    email: "info@cetertechnologies.com",
    sameAs: [
      "https://www.instagram.com/cetertechnologies/",
      "https://x.com/cetertechnologies",
      "https://www.facebook.com/cetertechnologies/",
      "https://www.tiktok.com/@cetertechnologies"
    ]
  };
}

export function productJsonLd(product: Product) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map(safeSocialImageUrl).filter(Boolean).slice(0, 3),
    description: truncateDescription(product.description, 500),
    brand: {
      "@type": "Brand",
      name: product.brand
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      price: product.price,
      priceCurrency: "KES",
      availability: schemaAvailability(product.stockStatus)
    }
  };
}

export function schemaAvailability(status: StockStatus) {
  if (status === "in_stock") return "https://schema.org/InStock";
  if (status === "backorder") return "https://schema.org/PreOrder";
  return "https://schema.org/OutOfStock";
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function firstCrawlableImage(images: string[]) {
  return images.find((image) => isCrawlableImageUrl(image)) ?? null;
}

export function safeSocialImageUrl(image: string | null | undefined) {
  if (!image || image.startsWith("data:")) return SITE_LOGO_URL;
  return absoluteUrl(image);
}

export function isCrawlableImageUrl(image: string | null | undefined) {
  return Boolean(image && !image.startsWith("data:"));
}

export function truncateDescription(value: string, maxLength = 155) {
  const text = value.replace(/\s+/g, " ").trim() || DEFAULT_DESCRIPTION;
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}.`;
}
