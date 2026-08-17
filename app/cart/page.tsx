import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = {
  title: "Cart",
  description: "Saved cart and pending order creation for Ceter Technologies Limited.",
  robots: { index: false, follow: false }
};

export default function CartPage() {
  return <CartView />;
}
