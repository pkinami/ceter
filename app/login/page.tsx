import Link from "next/link";
import { signInAction } from "@/app/actions";

export const metadata = {
  title: "Sign in"
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form action={signInAction} className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black text-ink">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Access saved cart items, orders, and account details.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        <label className="mt-5 block text-sm font-bold text-slate-700">
          Email
          <input name="email" type="email" required className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Password
          <input name="password" type="password" required minLength={6} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <button className="mt-5 h-11 w-full rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Sign in</button>
        <p className="mt-4 text-sm text-slate-600">New customer? <Link href="/signup" className="font-bold text-signal">Create an account</Link></p>
      </form>
    </div>
  );
}
