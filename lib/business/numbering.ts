import { randomBytes } from "node:crypto";

export function createBusinessNumber(prefix: string, now: Date = new Date()) {
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  const suffix = randomBytes(8).toString("hex").toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
}
