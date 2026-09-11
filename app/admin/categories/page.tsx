import { requirePermission } from "@/lib/admin/auth";
import { prisma } from "@/lib/prisma";
import { ItemSubcategoriesClient, type ItemSubcategoryRow } from "@/components/admin/ItemSubcategoriesClient";
import BrandsPage from "@/app/admin/brands/page";
import type { ReactNode } from "react";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = single(params?.tab) === "brands" ? "brands" : "categories";
  if (tab === "brands") {
    return (
      <MergedCatalogShell active="brands">
        <BrandsPage searchParams={Promise.resolve(params ?? {})} />
      </MergedCatalogShell>
    );
  }

  await requirePermission("categories.view");
  const categories = await prisma.category.findMany({
    orderBy: [{ parent_id: "asc" }, { sort_order: "asc" }, { name: "asc" }],
    include: {
      parent: { select: { name: true } },
      children: { select: { id: true } },
      _count: { select: { products: true } }
    }
  });
  const rows: ItemSubcategoryRow[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    parentId: category.parent_id,
    parentName: category.parent?.name ?? "Main category",
    productCount: category._count.products,
    childCount: category.children.length,
    sortOrder: category.sort_order
  }));
  return (
    <MergedCatalogShell active="categories">
      <ItemSubcategoriesClient rows={rows} />
    </MergedCatalogShell>
  );
}

function MergedCatalogShell({ active, children }: { active: "categories" | "brands"; children: ReactNode }) {
  return (
    <>
      <nav className="ceter-admin-tabs" aria-label="Catalog records">
        <a className={active === "categories" ? "active" : ""} href="/admin/categories">Categories</a>
        <a className={active === "brands" ? "active" : ""} href="/admin/categories?tab=brands">Brands</a>
      </nav>
      {children}
    </>
  );
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
