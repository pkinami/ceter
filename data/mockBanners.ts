export type Banner = {
  id: string;
  title: string;
  kicker: string;
  body: string;
  cta: string;
  tone: "blue" | "teal" | "amber" | "slate";
};

export const banners: Banner[] = [
  {
    id: "b1",
    title: "Reliable copiers for busy Nairobi offices",
    kicker: "New arrivals",
    body: "Kyocera, Ricoh and Konica Minolta multifunction units with installation support.",
    cta: "View photocopiers",
    tone: "blue"
  },
  {
    id: "b2",
    title: "Original toners and inkjets in stock",
    kicker: "Fast supply",
    body: "HP, Epson, Canon and Kyocera consumables with public KES pricing.",
    cta: "Shop toners",
    tone: "teal"
  },
  {
    id: "b3",
    title: "Printer servicing, repairs and office solutions",
    kicker: "Service desk",
    body: "Book diagnostics, maintenance contracts, parts replacement and managed print support.",
    cta: "Request service",
    tone: "amber"
  },
  {
    id: "b4",
    title: "Barcode, label and ID card printing equipment",
    kicker: "Specialty print",
    body: "Zebra and Evolis devices for retail, logistics, schools and secure access teams.",
    cta: "Explore printers",
    tone: "slate"
  }
];
