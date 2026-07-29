import { Mail, MapPin, Phone } from "lucide-react";

export function TopBar() {
  return (
    <div className="bg-ink text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-2 text-xs sm:justify-between">
        <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Nairobi, Kenya</span>
        <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> +254 707 143322</span>
        <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> info@cetertechnologies.com</span>
      </div>
    </div>
  );
}
