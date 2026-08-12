import { HeaderClient } from "@/components/HeaderClient";
import { getBrands, getCategories } from "@/lib/data";

export async function Header() {
  const [categories, brands] = await Promise.all([getCategories(), getBrands()]);

  return <HeaderClient categories={categories} brands={brands.map((brand) => brand.name)} />;
}
