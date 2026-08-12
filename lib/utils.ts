import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKes(price: number) {
  return `KSh ${new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(price)}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 }).format(value);
}

export function formatCompactKes(price: number) {
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}k`;
  return formatKes(price);
}
