"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { CartLine, Product } from "@/lib/types";

type StoredCartLine = { productId: string; quantity: number };

type CartContextValue = {
  items: CartLine[];
  loading: boolean;
  addItem: (product: Product, quantity?: number) => Promise<void>;
  updateItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);
const storageKey = "ceter_guest_cart";
const productsKey = "ceter_guest_cart_products";

function maxPurchasableQuantity(product: Product) {
  if (product.stockStatus === "backorder") return Number.POSITIVE_INFINITY;
  if (product.stockStatus !== "in_stock") return 0;
  return Math.max(0, product.stockQuantity);
}

function clampQuantity(product: Product, quantity: number) {
  const max = maxPurchasableQuantity(product);
  if (max === 0) return 0;
  return Math.max(1, Math.min(Math.floor(quantity), max));
}

function readGuestCart(): StoredCartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readGuestProducts(): Record<string, Product> {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(productsKey) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeGuestCart(items: CartLine[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))));
  window.localStorage.setItem(productsKey, JSON.stringify(Object.fromEntries(items.map((item) => [item.product.id, item.product]))));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<CartLine[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mutationRef = useRef<Promise<void>>(Promise.resolve());

  const runMutation = useCallback(async (operation: () => Promise<void>) => {
    const next = mutationRef.current.then(operation, operation);
    mutationRef.current = next.catch(() => undefined);
    await next;
  }, []);

  const loadRemoteCart = useCallback(async () => {
    const response = await fetch("/api/cart", { cache: "no-store" });
    if (!response.ok) {
      toast.error("Could not load saved cart");
      return [];
    }
    const data = await response.json() as { items?: CartLine[] };
    return data.items ?? [];
  }, []);

  const mergeGuestCart = useCallback(async () => {
    const stored = readGuestCart();
    const products = readGuestProducts();
    if (!stored.length) return;

    const response = await fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: stored.map((item) => ({ productId: item.productId, quantity: item.quantity })) })
    });
    if (!response.ok) throw new Error("Saved cart could not be updated.");

    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(productsKey);

    setItems((current) => {
      const merged = new Map<string, CartLine>(current.map((line) => [line.product.id, line]));
      stored.forEach((line) => {
        const product = products[line.productId];
        if (product) merged.set(line.productId, { product, quantity: line.quantity });
      });
      return Array.from(merged.values());
    });
  }, []);

  useEffect(() => {
    let active = true;

    async function initialise() {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      if (!active) return;
      setUserId(id);

      if (id) {
        const remote = await loadRemoteCart();
        if (!active) return;
        setItems(remote);
        await mergeGuestCart();
      } else {
        const stored = readGuestCart();
        const products = readGuestProducts();
        setItems(stored.map((line) => products[line.productId] ? { product: products[line.productId], quantity: line.quantity } : null).filter((line): line is CartLine => Boolean(line)));
      }
      setLoading(false);
    }

    initialise();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const nextUserId = session?.user.id ?? null;
      setUserId(nextUserId);
      if (nextUserId) {
        await mergeGuestCart();
        setItems(await loadRemoteCart());
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadRemoteCart, mergeGuestCart, supabase]);

  async function persist(nextItems: CartLine[]) {
    setItems(nextItems);
    if (!userId) {
      writeGuestCart(nextItems);
      return;
    }
    await runMutation(async () => {
      const response = await fetch("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: nextItems.map((line) => ({ productId: line.product.id, quantity: line.quantity })) })
      });
      if (!response.ok) throw new Error("Saved cart could not be updated.");
    });
  }

  async function addItem(product: Product, quantity = 1) {
    const nextItems = [...items];
    const existing = nextItems.find((item) => item.product.id === product.id);
    const requestedQuantity = (existing?.quantity ?? 0) + quantity;
    const nextQuantity = clampQuantity(product, requestedQuantity);
    if (nextQuantity === 0) {
      toast.error("This product is out of stock");
      return;
    }
    if (existing) existing.quantity = nextQuantity;
    else nextItems.push({ product, quantity: nextQuantity });
    if (Number.isFinite(maxPurchasableQuantity(product)) && nextQuantity < requestedQuantity) {
      toast.error(`Only ${product.stockQuantity} unit${product.stockQuantity === 1 ? "" : "s"} available`);
    }
    await persist(nextItems);
  }

  async function updateItem(productId: string, quantity: number) {
    let capped = false;
    const nextItems = items
      .map((item) => {
        if (item.product.id !== productId) return item;
        const nextQuantity = clampQuantity(item.product, quantity);
        capped = nextQuantity !== Math.max(1, Math.floor(quantity));
        return nextQuantity > 0 ? { ...item, quantity: nextQuantity } : null;
      })
      .filter((item): item is CartLine => Boolean(item));
    await persist(nextItems);
    toast.success(capped ? "Quantity limited to available stock" : "Quantity updated");
  }

  async function removeItem(productId: string) {
    const nextItems = items.filter((item) => item.product.id !== productId);
    if (userId) {
      await runMutation(async () => {
        const response = await fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
        if (!response.ok) throw new Error("Saved cart item could not be removed.");
      });
    }
    else writeGuestCart(nextItems);
    setItems(nextItems);
    toast.error("Item removed");
  }

  async function clearCart() {
    if (userId) {
      await runMutation(async () => {
        const response = await fetch("/api/cart", { method: "DELETE" });
        if (!response.ok) throw new Error("Saved cart could not be cleared.");
      });
    }
    else writeGuestCart([]);
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, loading, addItem, updateItem, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
