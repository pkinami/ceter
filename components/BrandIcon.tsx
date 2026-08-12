import Image from "next/image";
import { cn } from "@/lib/utils";

const brandIcons = {
  whatsapp: "/brands/whatsapp.svg",
  instagram: "/brands/instagram.svg",
  tiktok: "/brands/tiktok.svg",
  x: "/brands/x.svg",
  facebook: "/brands/facebook.svg",
  email: "/brands/email.svg",
  mpesa: "/brands/mpesa.svg",
  visa: "/brands/visa.svg",
  mastercard: "/brands/mastercard.svg",
  card: "/brands/card.svg"
} as const;

export type BrandIconName = keyof typeof brandIcons;

export function BrandIcon({ name, label, className, size = 20 }: { name: BrandIconName; label?: string; className?: string; size?: number }) {
  return (
    <Image
      src={brandIcons[name]}
      alt={label ?? ""}
      width={size}
      height={size}
      className={cn("inline-block shrink-0 object-contain", className)}
      aria-hidden={label ? undefined : true}
    />
  );
}
