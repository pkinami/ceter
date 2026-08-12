export const PREVIOUS_PRICE_DISPLAY_DAYS = 60;
export const PREVIOUS_PRICE_MIN_LIVE_DAYS = 14;

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
