import { MapPin } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";

export function TopBar() {
  return (
    <div className="hidden bg-ink text-white sm:block">
      <div className="mx-auto flex min-h-7 max-w-[1440px] flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-1 text-xs sm:justify-between">
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Nairobi, Kenya</span>
        <span className="inline-flex items-center gap-1.5"><BrandIcon name="whatsapp" label="WhatsApp" size={16} className="h-3.5 w-3.5" /> +254 707 143322</span>
        <span className="inline-flex items-center gap-1.5"><BrandIcon name="email" label="Email" size={16} className="h-3.5 w-3.5" /> info@cetertechnologies.com</span>
      </div>
    </div>
  );
}
