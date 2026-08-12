import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <Image src="/ceter-logo-pack/icon/ceter-icon-mono-navy.svg" alt="" width={64} height={64} className="mx-auto mb-5 h-16 w-16" />
      <h1 className="text-3xl font-black text-ink">Page not found</h1>
      <p className="mt-3 text-slate-500">The page you requested is unavailable. Browse the catalogue or request help from Ceter Technologies.</p>
      <Link href="/category" className="mt-6 inline-flex rounded-md bg-signal px-5 py-3 text-sm font-bold text-white">Back to catalog</Link>
    </div>
  );
}
