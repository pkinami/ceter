import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/ProductDetail";
import { getCategories, getProductBySlug, getRelatedProducts } from "@/lib/data";
import { JsonLd, breadcrumbJsonLd, productJsonLd, productMetadata } from "@/lib/seo";
import type { Category, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return product ? productMetadata(product) : { title: "Product" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  const [related, categories] = await Promise.all([getRelatedProducts(product), getCategories()]);
  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <JsonLd data={breadcrumbJsonLd(productBreadcrumbs(product, categories))} />
      <ProductDetail product={product} related={related} />
    </>
  );
}

function productBreadcrumbs(product: Product, categories: Category[]) {
  const trail: Category[] = [];
  let current = product.categoryId ? categories.find((category) => category.id === product.categoryId) : product.categorySlug ? categories.find((category) => category.slug === product.categorySlug) : undefined;
  while (current) {
    trail.unshift(current);
    current = current.parentId ? categories.find((category) => category.id === current?.parentId) : undefined;
  }
  return [
    { name: "Home", path: "/" },
    { name: "Catalogue", path: "/category" },
    ...trail.map((category) => ({ name: category.name, path: `/category/${category.slug}` })),
    { name: product.name, path: `/product/${product.slug}` }
  ];
}
