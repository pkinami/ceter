import { BUILT_IN_PARENT_CATEGORIES } from "@/lib/category-icons";
import { prisma } from "@/lib/prisma";

export async function ensureBuiltInParentCategories() {
  await prisma.category.createMany({
    data: BUILT_IN_PARENT_CATEGORIES.map((category) => ({
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      sort_order: category.sortOrder,
      parent_id: null
    })),
    skipDuplicates: true
  });
}
