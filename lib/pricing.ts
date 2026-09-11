export const PREVIOUS_PRICE_DISPLAY_DAYS = 60;
export const PREVIOUS_PRICE_MIN_LIVE_DAYS = 14;
export const DEFAULT_VAT_RATE = 0.16;

export type PriceTaxMode = "inclusive" | "exclusive";

export type PricingBreakdown = {
  mode: PriceTaxMode;
  vatRate: number;
  subtotalKes: number;
  netKes: number;
  vatKes: number;
  totalKes: number;
};

export type PreviousPriceInput = {
  price_kes: number;
  effective_from: string;
  effective_to: string | null;
};

export function findPreviousPrice(history: PreviousPriceInput[], currentPrice: number, now = new Date()) {
  const cutoff = now.getTime() - PREVIOUS_PRICE_DISPLAY_DAYS * 24 * 60 * 60 * 1000;
  return history
    .filter((entry) => entry.effective_to)
    .map((entry) => ({
      price: entry.price_kes,
      from: new Date(entry.effective_from),
      to: new Date(entry.effective_to as string)
    }))
    .filter((entry) => entry.to.getTime() >= cutoff && entry.price !== currentPrice)
    .filter((entry) => entry.to.getTime() - entry.from.getTime() >= PREVIOUS_PRICE_MIN_LIVE_DAYS * 24 * 60 * 60 * 1000)
    .sort((a, b) => b.to.getTime() - a.to.getTime())[0]?.price ?? null;
}

export function priceTaxMode(): PriceTaxMode {
  const value = (process.env.PRICE_TAX_MODE ?? process.env.NEXT_PUBLIC_PRICE_TAX_MODE ?? "inclusive").toLowerCase();
  return value === "exclusive" ? "exclusive" : "inclusive";
}

export function vatRate() {
  const configured = Number(process.env.VAT_RATE ?? process.env.NEXT_PUBLIC_VAT_RATE ?? DEFAULT_VAT_RATE);
  return Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_VAT_RATE;
}

export function calculatePricingBreakdown(subtotalKes: number, options: { mode?: PriceTaxMode; vatRate?: number } = {}): PricingBreakdown {
  const subtotal = money(subtotalKes);
  const rate = Number.isFinite(options.vatRate) ? Math.max(0, Number(options.vatRate)) : vatRate();
  const mode = options.mode ?? priceTaxMode();
  if (mode === "exclusive") {
    const vatKes = money(subtotal * rate);
    return { mode, vatRate: rate, subtotalKes: subtotal, netKes: subtotal, vatKes, totalKes: subtotal + vatKes };
  }
  const netKes = rate > 0 ? money(subtotal / (1 + rate)) : subtotal;
  const vatKes = subtotal - netKes;
  return { mode, vatRate: rate, subtotalKes: subtotal, netKes, vatKes, totalKes: subtotal };
}

export function calculateOrderTotal(input: { subtotalKes: number; deliveryFeeKes?: number; mode?: PriceTaxMode; vatRate?: number }) {
  const products = calculatePricingBreakdown(input.subtotalKes, input);
  const deliveryFeeKes = money(input.deliveryFeeKes ?? 0);
  return {
    ...products,
    deliveryFeeKes,
    payableKes: products.totalKes + deliveryFeeKes
  };
}

export function taxCopy(mode = priceTaxMode(), rate = vatRate()) {
  const percent = Math.round(rate * 100);
  return mode === "inclusive" ? `Inclusive of ${percent}% VAT` : `Excludes ${percent}% VAT`;
}

function money(value: number) {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}
