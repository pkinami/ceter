import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingSpinner({ className, label = "Loading" }: { className?: string; label?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin motion-reduce:animate-none", className)} role="img" aria-label={label} />;
}
