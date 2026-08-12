export type AdminRole = "ADMIN";

export const roleCapabilities = {
  ADMIN: { stock: "edit", price: "edit", cost: "edit", quotes: "full", orders: "full" }
} as const;

export function canSeeCost() {
  return true;
}

export function canEditCost() {
  return true;
}

export function canEditPrice() {
  return true;
}

export function canEditStock() {
  return true;
}
