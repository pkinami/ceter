import { BadgeCheck, Barcode, Printer, Settings, Tags, Wrench, type LucideIcon } from "lucide-react";

export const BUILT_IN_PARENT_CATEGORIES = [
  {
    slug: "printers-and-photocopiers",
    name: "Printers and Photocopiers",
    icon: "Printer",
    description: "Printers, photocopiers and multifunction office machines.",
    sortOrder: 10
  },
  {
    slug: "toner-ink-and-consumables",
    name: "Toner, Ink and Consumables",
    icon: "Tags",
    description: "Toner cartridges, ink, drums and printing consumables.",
    sortOrder: 20
  },
  {
    slug: "printer-parts-and-accessories",
    name: "Printer Parts and Accessories",
    icon: "Settings",
    description: "Printer spares, maintenance parts and office equipment accessories.",
    sortOrder: 30
  },
  {
    slug: "barcode-pos-and-id-solutions",
    name: "Barcode, POS and ID Solutions",
    icon: "Barcode",
    description: "Barcode scanners, POS equipment and ID card solutions.",
    sortOrder: 40
  },
  {
    slug: "office-equipment-and-services",
    name: "Office Equipment and Services",
    icon: "Wrench",
    description: "Office technology, support services and related equipment.",
    sortOrder: 50
  }
] as const;

export const BUILT_IN_PARENT_CATEGORY_SLUGS = BUILT_IN_PARENT_CATEGORIES.map((category) => category.slug);

export const categoryIconMap: Record<string, LucideIcon> = {
  Printer,
  Tags,
  Settings,
  Barcode,
  Wrench,
  BadgeCheck
};

export function builtInParentCategoryBySlug(slug: string) {
  return BUILT_IN_PARENT_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function iconForCategory(icon: string | null | undefined, slug?: string) {
  const builtIn = slug ? builtInParentCategoryBySlug(slug) : null;
  return categoryIconMap[icon ?? ""] ?? categoryIconMap[builtIn?.icon ?? ""] ?? Printer;
}
