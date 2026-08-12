import type { CatalogEnrichmentProvider, EnrichmentLookup, EnrichmentResult } from "@/lib/enrichment/provider";

type IcecatFeature = {
  LocalName?: { Value?: string };
  LocalValue?: string;
  Value?: string;
};

type IcecatResponse = {
  data?: {
    GeneralInfo?: { Title?: string; Description?: string; Brand?: string; BrandPartCode?: string; GTIN?: string | string[]; Category?: { Name?: { Value?: string } } };
    Image?: { HighPic?: string; Pic?: string };
    Gallery?: Array<{ Pic?: string; HighPic?: string }>;
    FeaturesGroups?: Array<{ Features?: IcecatFeature[] }>;
    Multimedia?: Array<{ URL?: string; Type?: string; ContentType?: string }>;
  };
  msg?: string;
};

export class EnrichmentDisabledError extends Error {}
export class EnrichmentNoMatchError extends Error {}
export class EnrichmentUnavailableError extends Error {}
export class EnrichmentRateLimitError extends Error {}
export class EnrichmentPartialResponseError extends Error {}

export class IcecatEnrichmentProvider implements CatalogEnrichmentProvider {
  name = "icecat";

  enabled() {
    return process.env.CATALOG_ENRICHMENT_PROVIDER === "icecat" && Boolean(process.env.ICECAT_USERNAME || process.env.ICECAT_API_TOKEN);
  }

  lookupKey(input: EnrichmentLookup) {
    if (input.gtin) return `gtin:${normalize(input.gtin)}`;
    return `brand-mpn:${normalize(input.brand)}:${normalize(input.mpn)}`;
  }

  async lookup(input: EnrichmentLookup): Promise<EnrichmentResult> {
    if (!this.enabled()) throw new EnrichmentDisabledError("Icecat enrichment is disabled.");
    const url = new URL("https://live.icecat.biz/api/");
    url.searchParams.set("lang", process.env.ICECAT_LANGUAGE ?? "en");
    url.searchParams.set("content", "");
    const username = process.env.ICECAT_USERNAME;
    if (username) url.searchParams.set("shopname", username);
    if (input.gtin) url.searchParams.set("GTIN", input.gtin);
    else {
      if (!input.brand || !input.mpn) throw new EnrichmentNoMatchError("Brand and MPN, or GTIN, are required.");
      url.searchParams.set("Brand", input.brand);
      url.searchParams.set("ProductCode", input.mpn);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.ICECAT_TIMEOUT_MS ?? 9000));
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          ...(process.env.ICECAT_API_TOKEN ? { "api-token": process.env.ICECAT_API_TOKEN } : {}),
          ...(process.env.ICECAT_CONTENT_TOKEN ? { "content-token": process.env.ICECAT_CONTENT_TOKEN } : {})
        },
        signal: controller.signal,
        next: { revalidate: 0 }
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw new EnrichmentUnavailableError("Icecat request timed out.");
      throw new EnrichmentUnavailableError("Icecat is unreachable.");
    } finally {
      clearTimeout(timeout);
    }
    if (response.status === 429) throw new EnrichmentRateLimitError("Icecat rate limit reached. Retry after backoff.");
    if (response.status === 404) throw new EnrichmentNoMatchError("No match for that part number.");
    if (!response.ok) throw new EnrichmentUnavailableError(`Icecat returned HTTP ${response.status}.`);

    const json = await response.json() as IcecatResponse;
    if (json.msg && json.msg !== "OK") {
      if (/not found|no product|not exist/i.test(json.msg)) throw new EnrichmentNoMatchError("No match for that part number.");
      throw new EnrichmentUnavailableError(json.msg);
    }
    const data = json.data;
    if (!data) throw new EnrichmentNoMatchError("No match for that part number.");
    if (!data.GeneralInfo?.Title && !data.FeaturesGroups?.length) throw new EnrichmentPartialResponseError("Icecat returned a partial response without title or specifications.");

    const specs: Record<string, string> = {};
    for (const group of data.FeaturesGroups ?? []) {
      for (const feature of group.Features ?? []) {
        const key = feature.LocalName?.Value;
        const value = feature.LocalValue ?? feature.Value;
        if (key && value) specs[key] = value;
      }
    }

    return {
      provider: this.name,
      lookupKey: this.lookupKey(input),
      brand: data.GeneralInfo?.Brand ?? input.brand ?? undefined,
      mpn: data.GeneralInfo?.BrandPartCode ?? input.mpn ?? undefined,
      gtin: Array.isArray(data.GeneralInfo?.GTIN) ? data.GeneralInfo?.GTIN[0] : data.GeneralInfo?.GTIN ?? input.gtin ?? undefined,
      category: data.GeneralInfo?.Category?.Name?.Value,
      title: data.GeneralInfo?.Title,
      description: data.GeneralInfo?.Description,
      images: [data.Image?.HighPic, data.Image?.Pic, ...(data.Gallery ?? []).flatMap((image) => [image.HighPic, image.Pic])].filter((value): value is string => Boolean(value)),
      specs,
      manuals: (data.Multimedia ?? []).filter((item) => item.ContentType === "application/pdf" || item.Type?.toLowerCase().includes("manual")).map((item) => item.URL).filter((value): value is string => Boolean(value)),
      raw: json
    };
  }
}

export const icecatProvider = new IcecatEnrichmentProvider();

function normalize(value?: string | null) {
  return String(value ?? "").trim().toUpperCase();
}
