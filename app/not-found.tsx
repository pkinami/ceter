import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-3xl font-black text-ink">Product not found</h1>
      <p className="mt-3 text-slate-500">The mock product could not be found in this GUI pass.</p>
      <Link href="/category" className="mt-6 inline-flex rounded-md bg-signal px-5 py-3 text-sm font-bold text-white">Back to catalog</Link>
    </div>
  );
}
