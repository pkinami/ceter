export type EnrichmentLookup = {
  brand?: string | null;
  mpn?: string | null;
  gtin?: string | null;
};

export type EnrichmentResult = {
  provider: string;
  lookupKey: string;
  brand?: string;
  mpn?: string;
  gtin?: string;
  category?: string;
  title?: string;
  description?: string;
  images: string[];
  specs: Record<string, string>;
  manuals: string[];
  raw: unknown;
};

export interface CatalogEnrichmentProvider {
  name: string;
  enabled(): boolean;
  lookupKey(input: EnrichmentLookup): string;
  lookup(input: EnrichmentLookup): Promise<EnrichmentResult>;
}
