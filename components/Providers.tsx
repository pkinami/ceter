"use client";

import { ReactNode } from "react";
import { CartProvider } from "@/components/CartProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
