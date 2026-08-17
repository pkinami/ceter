export type StockStatus = "in_stock" | "backorder" | "out_of_stock";
export type ProductCondition = "new" | "refurbished";
export type ProfileRole = "customer" | "admin" | "owner" | "manager" | "sales" | "store";
export type OrderStatus = "pending" | "processing" | "paid" | "fulfilled" | "cancelled";
export type QuoteStatus = "new" | "contacted" | "closed";
export type BannerPlacement = "main" | "category" | "services" | "top" | "middle" | "bottom";
export type HomepageSectionType = "category_products" | "latest_products" | "services" | "brands";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId?: string | null;
  sortOrder: number;
  depth?: number;
  children?: Category[];
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  brandId: string | null;
  category: string;
  categoryId: string | null;
  categorySlug: string | null;
  description: string;
  price: number;
  previousPrice: number | null;
  inStock: boolean;
  stockStatus: StockStatus;
  stockQuantity: number;
  condition: ProductCondition;
  image: string;
  images: string[];
  specs: Record<string, string>;
  isFeatured: boolean;
  showOfferBadge: boolean;
  showFlashSaleBadge: boolean;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: string | null;
  brand_id: string | null;
  price_kes: number;
  condition: ProductCondition;
  stock_status: StockStatus;
  stock_quantity: number;
  images: unknown;
  specs: unknown;
  is_featured: boolean;
  show_offer_badge?: boolean;
  show_flash_sale_badge?: boolean;
  price_history?: Array<{ price_kes: number; effective_from: string; effective_to: string | null }>;
  categories?: { id: string; name: string; slug: string } | null;
  brands?: { id: string; name: string; slug: string } | null;
};

export type CartLine = {
  product: Product;
  quantity: number;
};

export type Banner = {
  id: string;
  title: string;
  kicker: string | null;
  body: string;
  alt: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  image: string | null;
  laptopImage?: string | null;
  mobileImage: string | null;
  imageVariants?: BannerImageVariant[];
  placement: BannerPlacement;
  categoryId: string | null;
  sortOrder: number;
};

export type BannerImageVariant = {
  slot: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: string;
  shape: "wide" | "mid" | "tall";
};

export type ServiceEntry = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string | null;
  priceKes: number | null;
  showRequestQuote: boolean;
};

export type HomepageSection = {
  id: string;
  title: string;
  sectionType: HomepageSectionType;
  sortOrder: number;
  productLimit: number;
  category?: Category | null;
};
