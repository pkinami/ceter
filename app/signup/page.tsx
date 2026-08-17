import Link from "next/link";
import Image from "next/image";
import { signUpAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const metadata = {
  title: "Create account",
  robots: { index: false, follow: false }
};

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <form action={signUpAction} className="rounded-lg border border-slate-300 bg-white p-6 shadow-sm">
        <Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={190} height={45} className="mb-5 h-10 w-auto" />
        <h1 className="text-2xl font-black text-ink">Create account</h1>
        <p className="mt-2 text-sm text-slate-500">Create a customer profile for orders and saved carts.</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        <label className="mt-5 block text-sm font-bold text-slate-700">
          Full name
          <input id="signup-full-name" name="full_name" autoComplete="name" placeholder="Your full name" required className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Phone number
          <input id="signup-phone" name="phone" type="tel" autoComplete="tel" placeholder="Your mobile number" required className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Email address
          <input id="signup-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-700">
          Password
          <input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="Create a password" required minLength={6} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
        </label>
        <FormSubmitButton pendingText="Creating account..." className="mt-5 h-11 w-full rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Create account</FormSubmitButton>
        <p className="mt-4 text-sm text-slate-600">Already registered? <Link href="/login" className="font-bold text-signal">Sign in</Link></p>
      </form>
    </div>
  );
}
