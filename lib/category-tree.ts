import type { Category } from "@/lib/types";

export function buildCategoryTree(categories: Category[]) {
  const byId = new Map(categories.map((category) => [category.id, { ...category, children: [] as Category[] }]));
  const bySlug = new Map(categories.map((category) => [category.slug, byId.get(category.id)!]));
  const roots: Category[] = [];

  for (const category of byId.values()) {
    const parent = category.parentId ? byId.get(category.parentId) ?? bySlug.get(category.parentId) : null;
    if (parent) parent.children = [...(parent.children ?? []), category];
    else roots.push(category);
  }

  return sortCategories(roots);
}

export function categoryAndDescendantKeys(category: Category, categories: Category[]) {
  const tree = buildCategoryTree(categories);
  const found = findCategory(category.slug, tree) ?? category;
  const descendants = flattenBuiltTree([found]);
  return new Set(descendants.flatMap((item) => [item.id, item.slug, item.name.toLowerCase()]));
}

function flattenBuiltTree(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenBuiltTree(category.children ?? [])]);
}

function findCategory(slug: string, categories: Category[]): Category | null {
  for (const category of categories) {
    if (category.slug === slug) return category;
    const child = findCategory(slug, category.children ?? []);
    if (child) return child;
  }
  return null;
}

function sortCategories(categories: Category[]): Category[] {
  return [...categories]
    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name))
    .map((category) => ({ ...category, children: sortCategories(category.children ?? []) }));
}
