import type { DeliveryRegion } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DELIVERY_REGIONS: Array<{ value: DeliveryRegion; label: string }> = [
  { value: "within_nairobi", label: "Within Nairobi" },
  { value: "around_nairobi", label: "Around Nairobi" },
  { value: "countrywide", label: "Outside Nairobi / Countrywide" }
];

export function deliveryRegionLabel(region: DeliveryRegion | null | undefined) {
  return DELIVERY_REGIONS.find((item) => item.value === region)?.label ?? "Not selected";
}

export async function getDeliveryFees() {
  const rows = await prisma.deliveryFee.findMany({ orderBy: { region: "asc" } });
  const byRegion = new Map(rows.map((row) => [row.region, row]));
  return DELIVERY_REGIONS.map((item) => ({
    ...item,
    feeKes: byRegion.get(item.value)?.fee_kes ?? 0,
    isEnabled: byRegion.get(item.value)?.is_enabled ?? true
  }));
}

export async function getDeliveryFee(region: DeliveryRegion) {
  const row = await prisma.deliveryFee.findUnique({ where: { region } });
  if (!row?.is_enabled) throw new Error("Delivery is not currently available for the selected region.");
  return row.fee_kes;
}

export function parseDeliveryRegion(value: unknown): DeliveryRegion | null {
  return DELIVERY_REGIONS.some((item) => item.value === value) ? value as DeliveryRegion : null;
}
