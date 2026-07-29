import { cn } from "@/lib/utils";

export function SkeletonLoader({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-slate-200", className)} />;
}
