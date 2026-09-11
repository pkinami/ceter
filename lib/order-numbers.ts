import { randomUUID } from "node:crypto";

export const ORDER_NUMBER_PATTERN = /^CT-\d{8}-[0-9A-F]{8}$/;

export function createStorefrontOrderNumber(now: Date = new Date(), suffix: string = randomUUID()) {
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const token = suffix.replace(/[^a-fA-F0-9]/g, "").slice(0, 8).toUpperCase();
  return `CT-${date}-${token.padEnd(8, "0")}`;
}

export function assertOrderNumber(value: string | null | undefined): asserts value is string {
  if (!value || !ORDER_NUMBER_PATTERN.test(value)) {
    throw new Error("Order number is required before an order can be created.");
  }
}
