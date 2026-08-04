import { createClient } from "@/lib/supabase/server";
import { mapProduct } from "@/lib/product-mappers";
import type { Brand, Category, Product, ProductRow } from "@/lib/types";

const productSelect = "*, categories(id,name,slug), brands(id,name,slug)";

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id,name,slug,description,icon").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("brands").select("id,name,slug").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function getProducts(options?: { featured?: boolean; category?: string | null; brand?: string | null; limit?: number }): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select(productSelect).order("is_featured", { ascending: false }).order("created_at", { ascending: false });
  if (options?.featured) query = query.eq("is_featured", true);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;

  let products = ((data ?? []) as ProductRow[]).map(mapProduct);
  if (options?.category) products = products.filter((product) => product.category === options.category || product.categoryId === options.category);
  if (options?.brand) products = products.filter((product) => product.brand === options.brand || product.brandId === options.brand);
  return products;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? mapProduct(data as ProductRow) : null;
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  const products = await getProducts({ category: product.categoryId, limit: 8 });
  return products.filter((item) => item.id !== product.id).slice(0, 4);
}
