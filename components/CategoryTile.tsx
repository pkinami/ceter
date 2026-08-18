import Link from "next/link";
import { LucideIcon } from "lucide-react";

export function CategoryTile({
  name,
  slug,
  description,
  icon: Icon
}: {
  name: string;
  slug?: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Link
      href={slug ? `/category/${slug}` : `/category?category=${encodeURIComponent(name)}`}
      className="group flex min-h-[92px] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:-translate-y-0.5 hover:border-signal hover:shadow-industrial sm:min-h-[108px] sm:p-3 xl:min-h-[112px] xl:p-4"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-panel text-signal group-hover:bg-signal group-hover:text-white">
        <Icon className="h-5 w-5 sm:h-5 sm:w-5" />
      </span>
      <p className="mt-2.5 line-clamp-2 text-[14px] font-semibold leading-5 text-ink sm:text-[15px]">{name}</p>
      <p className="sr-only">{description}</p>
    </Link>
  );
}
