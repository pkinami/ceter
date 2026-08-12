"use client";

import type { Product } from "@/lib/types";
import { BrandIcon } from "@/components/BrandIcon";
import { formatKes } from "@/lib/utils";
import { cn } from "@/lib/utils";

type WhatsAppOrderButtonProps = {
  product: Product;
  className?: string;
};

export function WhatsAppOrderButton({ product, className }: WhatsAppOrderButtonProps) {
  const message = `Hi, I'm interested in ${product.name} (${formatKes(product.price)}) listed on your site.`;
  const href = `https://wa.me/254707143322?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-md border border-signal bg-white px-4 text-sm font-semibold text-ink shadow-sm hover:bg-teal-50 hover:text-teal-800",
        className
      )}
    >
      <BrandIcon name="whatsapp" label="WhatsApp" size={18} className="h-4 w-4" />
      Order via WhatsApp
    </a>
  );
}
