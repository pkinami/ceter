import Image from "next/image";
import Link from "next/link";
import { signInAction } from "@/app/actions";
import { BrandIcon } from "@/components/BrandIcon";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const metadata = {
  title: "Admin Login"
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form action={signInAction} className="rounded-lg border border-[#DDE8EE] bg-white p-6 shadow-[0_1px_2px_rgba(11,30,57,0.04)]">
        <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={190} height={45} className="mb-5 h-10 w-auto" />
        <h1 className="text-2xl font-black text-ink">Admin Login</h1>
        <p className="mt-2 text-sm text-slate-500">Staff access for catalog, orders, stock, and operations.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        <input type="hidden" name="next" value="/admin" />
        <label className="mt-5 block text-sm font-bold text-slate-700">
          <span className="inline-flex items-center gap-2"><BrandIcon name="email" label="Email" size={18} className="h-4 w-4" /> Staff email</span>
          <input name="email" type="email" required className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Password
          <input name="password" type="password" required minLength={6} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <FormSubmitButton pendingText="Signing in..." className="mt-5 h-11 w-full rounded-md bg-ink px-5 text-sm font-bold text-white hover:bg-slate-800">Sign in to admin</FormSubmitButton>
        <p className="mt-4 text-sm text-slate-600">Customer account? <Link href="/login" className="font-bold text-signal">Use customer login</Link></p>
      </form>
    </div>
  );
}
