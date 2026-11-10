"use client";

import { ReactNode, useEffect } from "react";
import { CartProvider } from "@/components/CartProvider";
import { RouteStatusIndicator } from "@/components/RouteStatusIndicator";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    const clearZero = (event: FocusEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "number" || input.value !== "0") return;
      input.dataset.clearedZero = "true";
      input.value = "";
    };
    const restoreEmptyZero = (event: FocusEvent) => {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== "number" || input.dataset.clearedZero !== "true") return;
      delete input.dataset.clearedZero;
      if (input.value === "") input.value = "0";
    };
    document.addEventListener("focusin", clearZero);
    document.addEventListener("focusout", restoreEmptyZero);
    return () => {
      document.removeEventListener("focusin", clearZero);
      document.removeEventListener("focusout", restoreEmptyZero);
    };
  }, []);

  return <CartProvider>{children}<RouteStatusIndicator /></CartProvider>;
}
