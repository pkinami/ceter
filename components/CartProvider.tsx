"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { mapProduct } from "@/lib/product-mappers";
import type { CartLine, Product, ProductRow } from "@/lib/types";

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
const productSelect = "*, categories(id,name,slug), brands(id,name,slug)";

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

  const loadRemoteCart = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("cart_items")
      .select(`quantity, products(${productSelect})`)
      .eq("user_id", id)
      .order("updated_at", { ascending: false });

    if (error) {
      toast.error("Could not load saved cart");
      return [];
    }

    return (data ?? [])
      .map((row) => {
        const productRow = Array.isArray(row.products) ? row.products[0] : row.products;
        return productRow ? { product: mapProduct(productRow as ProductRow), quantity: Number(row.quantity) } : null;
      })
      .filter((item): item is CartLine => Boolean(item));
  }, [supabase]);

  const mergeGuestCart = useCallback(async (id: string) => {
    const stored = readGuestCart();
    const products = readGuestProducts();
    if (!stored.length) return;

    await Promise.all(stored.map((item) => supabase.from("cart_items").upsert({
      user_id: id,
      product_id: item.productId,
      quantity: item.quantity
    }, { onConflict: "user_id,product_id" })));

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
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function initialise() {
      const { data } = await supabase.auth.getUser();
      const id = data.user?.id ?? null;
      if (!active) return;
      setUserId(id);

      if (id) {
        const remote = await loadRemoteCart(id);
        if (!active) return;
        setItems(remote);
        await mergeGuestCart(id);
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
        await mergeGuestCart(nextUserId);
        setItems(await loadRemoteCart(nextUserId));
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
    await Promise.all(nextItems.map((line) => supabase.from("cart_items").upsert({
      user_id: userId,
      product_id: line.product.id,
      quantity: line.quantity
    }, { onConflict: "user_id,product_id" })));
  }

  async function addItem(product: Product, quantity = 1) {
    const nextItems = [...items];
    const existing = nextItems.find((item) => item.product.id === product.id);
    if (existing) existing.quantity += quantity;
    else nextItems.push({ product, quantity });
    await persist(nextItems);
  }

  async function updateItem(productId: string, quantity: number) {
    const nextItems = items.map((item) => item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item);
    await persist(nextItems);
    toast.success("Quantity updated");
  }

  async function removeItem(productId: string) {
    const nextItems = items.filter((item) => item.product.id !== productId);
    setItems(nextItems);
    if (userId) await supabase.from("cart_items").delete().eq("user_id", userId).eq("product_id", productId);
    else writeGuestCart(nextItems);
    toast.error("Item removed");
  }

  async function clearCart() {
    setItems([]);
    if (userId) await supabase.from("cart_items").delete().eq("user_id", userId);
    else writeGuestCart([]);
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
