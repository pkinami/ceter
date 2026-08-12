import type { Category } from "@/lib/types";

export type CategoryTreeSeed = {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  children?: CategoryTreeSeed[];
};

export const categoryTree: CategoryTreeSeed[] = [
  {
    name: "Printers & Photocopiers",
    slug: "printers-and-photocopiers",
    description: "Printers, photocopiers and large format print equipment.",
    icon: "Printer",
    children: [
      {
        name: "Printers",
        slug: "printers",
        children: [
          { name: "Laser Printers", slug: "laser-printers" },
          { name: "Inkjet Printers", slug: "inkjet-printers" },
          { name: "Multifunction Printers", slug: "multifunction-printers" }
        ]
      },
      {
        name: "Photocopiers",
        slug: "photocopiers",
        children: [
          { name: "Monochrome Copiers", slug: "monochrome-copiers" },
          { name: "Colour Copiers", slug: "colour-copiers" },
          { name: "Multifunction Copiers", slug: "multifunction-copiers" }
        ]
      },
      {
        name: "Large Format Printers",
        slug: "large-format-printers",
        children: [
          { name: "Plotters", slug: "plotters" },
          { name: "CAD Printers", slug: "cad-printers" },
          { name: "Graphics Printers", slug: "graphics-printers" }
        ]
      }
    ]
  },
  {
    name: "Toner, Ink & Consumables",
    slug: "toner-ink-and-consumables",
    description: "Toner, ink, maintenance consumables, paper and media.",
    icon: "BadgeCheck",
    children: [
      {
        name: "Toner Cartridges",
        slug: "toner-cartridges",
        children: [
          { name: "HP Toners", slug: "hp-toners" },
          { name: "Canon Toners", slug: "canon-toners" },
          { name: "Kyocera Toners", slug: "kyocera-toners" },
          { name: "Brother/Ricoh/Xerox/Konica Minolta Toners", slug: "brother-ricoh-xerox-konica-minolta-toners" }
        ]
      },
      {
        name: "Ink",
        slug: "ink",
        children: [
          { name: "Ink Cartridges", slug: "ink-cartridges" },
          { name: "Ink Bottles", slug: "ink-bottles" }
        ]
      },
      {
        name: "Printer Consumables",
        slug: "printer-consumables",
        children: [
          { name: "Drum Units", slug: "printer-consumables-drum-units" },
          { name: "Imaging Units", slug: "imaging-units" },
          { name: "Developer Units", slug: "printer-consumables-developer-units" },
          { name: "Waste Toner Bottles", slug: "waste-toner-bottles" }
        ]
      },
      {
        name: "Paper & Media",
        slug: "paper-and-media",
        children: [
          { name: "A4/A3 Paper", slug: "a4-a3-paper" },
          { name: "Photo Paper", slug: "photo-paper" },
          { name: "Thermal Rolls", slug: "thermal-rolls" },
          { name: "Barcode Labels", slug: "paper-and-media-barcode-labels" }
        ]
      }
    ]
  },
  {
    name: "Printer Parts & Accessories",
    slug: "printer-parts-and-accessories",
    description: "Printer and photocopier spare parts, accessories and maintenance kits.",
    icon: "Settings",
    children: [
      {
        name: "Printer Spare Parts",
        slug: "printer-spare-parts",
        children: [
          { name: "Pickup Rollers", slug: "pickup-rollers" },
          { name: "Print Heads", slug: "print-heads" },
          { name: "Transfer Rollers", slug: "transfer-rollers" },
          { name: "Fuser Units", slug: "fuser-units" }
        ]
      },
      {
        name: "Photocopier Spare Parts",
        slug: "photocopier-spare-parts",
        children: [
          { name: "Drum Units", slug: "photocopier-spare-parts-drum-units" },
          { name: "Developer Units", slug: "photocopier-spare-parts-developer-units" },
          { name: "Transfer Units", slug: "transfer-units" },
          { name: "Maintenance Kits", slug: "maintenance-kits" }
        ]
      },
      {
        name: "Printer Accessories",
        slug: "printer-accessories",
        children: [
          { name: "Printer Cables", slug: "printer-cables" },
          { name: "Paper Trays", slug: "paper-trays" },
          { name: "Printer Stands", slug: "printer-stands" },
          { name: "Power Accessories", slug: "power-accessories" }
        ]
      }
    ]
  },
  {
    name: "Barcode, POS & ID Solutions",
    slug: "barcode-pos-and-id-solutions",
    description: "Barcode, POS and ID card equipment and supplies.",
    icon: "Tags",
    children: [
      {
        name: "Barcode & Label Printing",
        slug: "barcode-and-label-printing",
        children: [
          { name: "Barcode Printers", slug: "barcode-printers" },
          { name: "Label Printers", slug: "label-printers" },
          { name: "Barcode Labels", slug: "barcode-and-label-printing-barcode-labels" },
          { name: "Thermal Ribbons", slug: "thermal-ribbons" }
        ]
      },
      {
        name: "POS Equipment",
        slug: "pos-equipment",
        children: [
          { name: "Receipt Printers", slug: "receipt-printers" },
          { name: "Barcode Scanners", slug: "barcode-scanners" },
          { name: "Cash Drawers", slug: "cash-drawers" },
          { name: "Receipt Rolls", slug: "receipt-rolls" }
        ]
      },
      {
        name: "ID Card Printing",
        slug: "id-card-printing",
        children: [
          { name: "ID Card Printers", slug: "id-card-printers" },
          { name: "Printer Ribbons", slug: "printer-ribbons" },
          { name: "PVC Cards", slug: "pvc-cards" },
          { name: "Lanyards & Card Holders", slug: "lanyards-and-card-holders" }
        ]
      }
    ]
  },
  {
    name: "Office Equipment & Services",
    slug: "office-equipment-and-services",
    description: "Office equipment, printer services, copier services and business solutions.",
    icon: "ScanLine",
    children: [
      {
        name: "Office Equipment",
        slug: "office-equipment",
        children: [
          { name: "Document Scanners", slug: "document-scanners" },
          { name: "Laminators", slug: "laminators" },
          { name: "Binding Machines", slug: "binding-machines" },
          { name: "Shredders", slug: "shredders" },
          { name: "Paper Cutters", slug: "paper-cutters" }
        ]
      },
      {
        name: "Printer Services",
        slug: "printer-services",
        children: [
          { name: "Repair", slug: "printer-services-repair" },
          { name: "Installation", slug: "printer-services-installation" },
          { name: "Maintenance", slug: "printer-services-maintenance" }
        ]
      },
      {
        name: "Photocopier Services",
        slug: "photocopier-services",
        children: [
          { name: "Repair", slug: "photocopier-services-repair" },
          { name: "Installation", slug: "photocopier-services-installation" },
          { name: "Maintenance", slug: "photocopier-services-maintenance" }
        ]
      },
      {
        name: "Business Solutions",
        slug: "business-solutions",
        children: [
          { name: "Managed Print Services", slug: "managed-print-services" },
          { name: "Toner Supply Contracts", slug: "toner-supply-contracts" },
          { name: "Maintenance Contracts", slug: "maintenance-contracts" },
          { name: "Equipment Installation", slug: "equipment-installation" }
        ]
      }
    ]
  }
];

export function flattenCategoryTree(nodes: CategoryTreeSeed[] = categoryTree, parentId: string | null = null, depth = 0): Category[] {
  return nodes.flatMap((node, index) => {
    const category: Category = {
      id: node.slug,
      name: node.name,
      slug: node.slug,
      description: node.description ?? null,
      icon: node.icon ?? null,
      parentId,
      sortOrder: (index + 1) * 10,
      depth,
      children: []
    };
    return [category, ...flattenCategoryTree(node.children ?? [], node.slug, depth + 1)];
  });
}

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
