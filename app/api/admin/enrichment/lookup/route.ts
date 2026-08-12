import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireCapability } from "@/lib/admin/auth";
import {
  EnrichmentDisabledError,
  EnrichmentNoMatchError,
  EnrichmentPartialResponseError,
  EnrichmentRateLimitError,
  EnrichmentUnavailableError,
  icecatProvider
} from "@/lib/enrichment/icecat";
import type { EnrichmentLookup, EnrichmentResult } from "@/lib/enrichment/provider";
import { prisma } from "@/lib/prisma";

export const maxDuration = 30;

export async function POST(request: Request) {
  await requireCapability("price", ["edit"]);
  const input = await request.json() as EnrichmentLookup;
  const lookup: EnrichmentLookup = {
    brand: clean(input.brand),
    mpn: clean(input.mpn),
    gtin: clean(input.gtin)
  };
  const lookupKey = icecatProvider.lookupKey(lookup);

  try {
    const cached = await prisma.icecatLookupCache.findUnique({ where: { provider_lookup_key: { provider: "icecat", lookup_key: lookupKey } } });
    const result = cached ? cached.result as unknown as EnrichmentResult : await icecatProvider.lookup(lookup);
    if (!cached) {
      await prisma.icecatLookupCache.upsert({
        where: { provider_lookup_key: { provider: "icecat", lookup_key: result.lookupKey } },
        create: { provider: "icecat", lookup_key: result.lookupKey, result: result as unknown as Prisma.InputJsonValue },
        update: { result: result as unknown as Prisma.InputJsonValue }
      });
    }

    const duplicate = result.brand && result.mpn
      ? await prisma.product.findFirst({
        where: { brand: { name: { equals: result.brand, mode: "insensitive" } }, mpn: { equals: result.mpn, mode: "insensitive" } },
        select: { id: true, name: true, slug: true }
      })
      : null;
    const mapping = result.category
      ? await prisma.icecatCategoryMapping.findUnique({ where: { icecat_category: result.category }, include: { category: { select: { id: true, name: true, slug: true } } } })
      : null;

    return NextResponse.json({ result, duplicate, categorySuggestion: mapping?.category ?? null, cached: Boolean(cached) });
  } catch (error) {
    return enrichmentError(error);
  }
}

function clean(value?: string | null) {
  const text = String(value ?? "").trim();
  return text || undefined;
}

function enrichmentError(error: unknown) {
  const message = error instanceof Error ? error.message : "Enrichment failed.";
  if (error instanceof EnrichmentDisabledError) return NextResponse.json({ error: message, code: "disabled" }, { status: 409 });
  if (error instanceof EnrichmentNoMatchError) return NextResponse.json({ error: message, code: "no_match" }, { status: 404 });
  if (error instanceof EnrichmentRateLimitError) return NextResponse.json({ error: message, code: "rate_limited", retryAfterSeconds: 60 }, { status: 429 });
  if (error instanceof EnrichmentPartialResponseError) return NextResponse.json({ error: message, code: "partial_response" }, { status: 502 });
  if (error instanceof EnrichmentUnavailableError) return NextResponse.json({ error: message, code: "unreachable" }, { status: 503 });
  return NextResponse.json({ error: message, code: "unknown" }, { status: 500 });
}
