export type StockStatus = "in-stock" | "backorder";
export type ProductCondition = "New" | "Refurbished";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  price: number;
  inStock: boolean;
  stockStatus: StockStatus;
  condition: ProductCondition;
  image: string;
  specs: Record<string, string>;
};

export const categories = [
  "Printers & Photocopiers",
  "Toner, Ink & Consumables",
  "Printer Parts & Accessories",
  "Barcode, POS & ID Solutions",
  "Office Equipment & Services",
  "Multifunction Printers",
  "Photocopiers",
  "Toners and Ink",
  "Spare Parts",
  "Barcode and Label",
  "ID Card Printers"
];

export const brands = [
  "Kyocera",
  "HP",
  "Epson",
  "Zebra",
  "Canon",
  "Brother",
  "Ricoh",
  "Xerox",
  "Konica Minolta",
  "Evolis"
];

export const products: Product[] = [
  {
    id: "p-001",
    slug: "kyocera-taskalfa-2554ci",
    name: "Kyocera TASKalfa 2554ci A3 Colour MFP",
    brand: "Kyocera",
    category: "Multifunction Printers",
    description: "A3 colour multifunction printer for document-heavy offices.",
    price: 385000,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Speed: "25 ppm", Functions: "Print, copy, scan", Paper: "A3/A4", Network: "Ethernet, USB" }
  },
  {
    id: "p-002",
    slug: "hp-laserjet-pro-mfp-4103fdw",
    name: "HP LaserJet Pro MFP 4103fdw",
    brand: "HP",
    category: "Multifunction Printers",
    description: "Compact mono laser MFP with wireless printing.",
    price: 72500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Speed: "40 ppm", Functions: "Print, copy, scan, fax", Duplex: "Automatic", Connectivity: "Wi-Fi, Ethernet" }
  },
  {
    id: "p-003",
    slug: "epson-ecotank-l6490",
    name: "Epson EcoTank L6490 Business Ink Tank",
    brand: "Epson",
    category: "Multifunction Printers",
    description: "Low-cost ink tank printer for small teams.",
    price: 89500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Type: "Ink tank", Functions: "Print, copy, scan, fax", Duplex: "Automatic", Warranty: "1 year" }
  },
  {
    id: "p-004",
    slug: "ricoh-mp-3055-refurbished",
    name: "Ricoh MP 3055 Mono Photocopier",
    brand: "Ricoh",
    category: "Monochrome Copiers",
    description: "Refurbished A3 copier with service-ready configuration.",
    price: 225000,
    inStock: false,
    stockStatus: "backorder",
    condition: "Refurbished",
    image: "/product-placeholder.svg",
    specs: { Speed: "30 ppm", Paper: "A3/A4", Finisher: "Optional", Meter: "Low usage" }
  },
  {
    id: "p-005",
    slug: "konica-minolta-bizhub-c258",
    name: "Konica Minolta bizhub C258 Colour Copier",
    brand: "Konica Minolta",
    category: "Colour Copiers",
    description: "A3 colour copier for workgroups and print rooms.",
    price: 295000,
    inStock: true,
    stockStatus: "in-stock",
    condition: "Refurbished",
    image: "/product-placeholder.svg",
    specs: { Speed: "25 ppm", Color: "Full colour", Paper: "A3/A4", Scan: "Dual scan option" }
  },
  {
    id: "p-006",
    slug: "canon-ir-adv-dx-c3826i",
    name: "Canon imageRUNNER ADVANCE DX C3826i",
    brand: "Canon",
    category: "Multifunction Copiers",
    description: "Colour A3 device with secure workflow features.",
    price: 418000,
    inStock: false,
    stockStatus: "backorder",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Speed: "26 ppm", Security: "PIN and user controls", Paper: "A3/A4", Panel: "Touch display" }
  },
  {
    id: "p-007",
    slug: "xerox-altalink-c8030",
    name: "Xerox AltaLink C8030 Colour MFP",
    brand: "Xerox",
    category: "Multifunction Printers",
    description: "Enterprise colour MFP for managed office environments.",
    price: 365000,
    inStock: true,
    stockStatus: "in-stock",
    condition: "Refurbished",
    image: "/product-placeholder.svg",
    specs: { Speed: "30 ppm", Paper: "A3/A4", Workflow: "Scan to email", Network: "Gigabit Ethernet" }
  },
  {
    id: "p-008",
    slug: "brother-hl-l6210dw",
    name: "Brother HL-L6210DW Mono Laser Printer",
    brand: "Brother",
    category: "Multifunction Printers",
    description: "High-speed mono laser printer for admin desks.",
    price: 58500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Speed: "48 ppm", Duplex: "Automatic", Paper: "Expandable tray", Connectivity: "Wi-Fi, Ethernet" }
  },
  {
    id: "p-009",
    slug: "zebra-zd421-label-printer",
    name: "Zebra ZD421 Desktop Label Printer",
    brand: "Zebra",
    category: "Label Printers",
    description: "Thermal label printer for retail, logistics and inventory.",
    price: 64500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Method: "Direct thermal", Width: "4 inch", Resolution: "203 dpi", Interface: "USB, Ethernet" }
  },
  {
    id: "p-010",
    slug: "evolis-primacy-2-card-printer",
    name: "Evolis Primacy 2 ID Card Printer",
    brand: "Evolis",
    category: "ID Card Printers",
    description: "Card printer for staff IDs, schools and access teams.",
    price: 248000,
    inStock: false,
    stockStatus: "backorder",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Output: "Single or dual side", Cards: "PVC cards", Resolution: "300 dpi", Security: "Encoding option" }
  },
  {
    id: "p-011",
    slug: "hp-410a-toner-set",
    name: "HP 410A Original Toner Cartridge Set",
    brand: "HP",
    category: "HP Toners",
    description: "Original CMYK toner set for compatible LaserJet Pro units.",
    price: 48500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Pack: "CMYK set", Yield: "Up to 2,300 pages", Type: "Original", Compatibility: "M452, M477 series" }
  },
  {
    id: "p-012",
    slug: "kyocera-tk-8345-toner",
    name: "Kyocera TK-8345 Toner Cartridge",
    brand: "Kyocera",
    category: "Kyocera Toners",
    description: "High-yield toner for TASKalfa office systems.",
    price: 19500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Color: "Black", Yield: "Approx. 20,000 pages", Type: "Original", Compatibility: "TASKalfa 2552ci" }
  },
  {
    id: "p-013",
    slug: "canon-npg-67-toner",
    name: "Canon NPG-67 Toner Cartridge",
    brand: "Canon",
    category: "Canon Toners",
    description: "Original toner cartridge for imageRUNNER ADVANCE systems.",
    price: 16800,
    inStock: false,
    stockStatus: "backorder",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Color: "Cyan", Yield: "Approx. 19,000 pages", Type: "Original", Compatibility: "C33xx/C35xx series" }
  },
  {
    id: "p-014",
    slug: "ricoh-mpc-drum-unit",
    name: "Ricoh MPC Drum Unit Assembly",
    brand: "Ricoh",
    category: "Drum Units",
    description: "Replacement imaging drum assembly for Ricoh colour copiers.",
    price: 32500,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Part: "Drum unit", Type: "Replacement", Service: "Install available", Compatibility: "MPC series" }
  },
  {
    id: "p-015",
    slug: "epson-t673-ink-bottle-set",
    name: "Epson T673 Ink Bottle Multipack",
    brand: "Epson",
    category: "Ink Bottles",
    description: "Six-colour ink bottle set for Epson photo ink tank printers.",
    price: 11200,
    inStock: true,
    stockStatus: "in-stock",
    condition: "New",
    image: "/product-placeholder.svg",
    specs: { Pack: "6 bottles", Type: "Original ink", Volume: "70 ml each", Compatibility: "L800/L805 series" }
  }
];
