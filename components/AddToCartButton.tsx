"use client";

import { ReactNode, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useCart } from "@/components/CartProvider";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/types";

export function AddToCartButton({
  product,
  quantity = 1,
  children,
  className
}: {
  product: Product;
  quantity?: number;
  children: ReactNode;
  className?: string;
}) {
  const { addItem } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "success">("idle");

  async function click() {
    setState("loading");
    try {
      await addItem(product, quantity);
      toast.success("Added to cart", { description: product.name, duration: 3000, id: `add-to-cart-${product.id}` });
      setState("success");
      window.setTimeout(() => setState("idle"), 900);
    } catch {
      setState("idle");
    }
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={state === "loading"}
      className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-md bg-signal px-4 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70", className)}
    >
      {state === "loading" ? <LoadingSpinner /> : state === "success" ? <Check className="h-4 w-4" /> : children}
    </button>
  );
}
