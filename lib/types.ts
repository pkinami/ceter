export type StockStatus = "in_stock" | "backorder" | "out_of_stock";
export type ProductCondition = "new" | "refurbished";
export type ProfileRole = "customer" | "admin";
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
  inStock: boolean;
  stockStatus: StockStatus;
  stockQuantity: number;
  condition: ProductCondition;
  image: string;
  images: string[];
  specs: Record<string, string>;
  isFeatured: boolean;
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
  ctaLabel: string | null;
  ctaHref: string | null;
  image: string | null;
  mobileImage: string | null;
  placement: BannerPlacement;
  categoryId: string | null;
  sortOrder: number;
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
