import Image from "next/image";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductImageFrame({
  src,
  alt,
  sizes,
  priority = false,
  className,
  imageClassName,
  placeholderClassName
}: {
  src?: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  placeholderClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-md border border-slate-200 bg-white", className)}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-contain object-center p-2", imageClassName)}
        />
      ) : (
        <div className={cn("flex h-full w-full items-center justify-center bg-slate-50 text-slate-500", placeholderClassName)}>
          <Package className="h-8 w-8" aria-hidden />
        </div>
      )}
    </div>
  );
}
