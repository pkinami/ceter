"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

function parseImages(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return ["/product-placeholder.svg"];
  return text.split("\n").map((item) => item.trim()).filter(Boolean);
}

function parseSpecs(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) return {};
  return Object.fromEntries(
    text.split("\n").map((line) => line.split(":")).filter((pair) => pair.length >= 2).map(([key, ...rest]) => [key.trim(), rest.join(":").trim()])
  );
}

export async function upsertProductAction(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    category_id: String(formData.get("category_id") ?? "") || null,
    brand_id: String(formData.get("brand_id") ?? "") || null,
    price_kes: Number(formData.get("price_kes") ?? 0),
    condition: String(formData.get("condition") ?? "new"),
    stock_status: String(formData.get("stock_status") ?? "in_stock"),
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    images: parseImages(formData.get("images")),
    specs: parseSpecs(formData.get("specs")),
    is_featured: formData.get("is_featured") === "on"
  };

  const result = id
    ? await supabase.from("products").update(payload).eq("id", id)
    : await supabase.from("products").insert(payload);
  if (result.error) throw result.error;
  revalidatePath("/admin");
}

export async function deleteProductAction(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function updateOrderStatusAction(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "pending");
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}

export async function updateQuoteStatusAction(formData: FormData) {
  const supabase = createAdminClient();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "new");
  const { error } = await supabase.from("quote_requests").update({ status }).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin");
}
