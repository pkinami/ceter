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
      className="group rounded-lg border border-slate-300 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:border-signal hover:shadow-industrial"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-panel text-signal group-hover:bg-signal group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-black text-ink">{name}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
    </Link>
  );
}
