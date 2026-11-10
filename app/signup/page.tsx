import Image from "next/image";
import Link from "next/link";
import { signUpAction } from "@/app/actions";
import { AuthFooter } from "@/components/AuthFooter";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const metadata = { title: "Create account", robots: { index: false, follow: false } };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <main className="ceter-auth-page"><div className="ceter-auth-dots" aria-hidden="true" /><section className="ceter-auth-card"><Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={210} height={50} className="ceter-auth-logo" priority /><h1>Create account</h1><p className="ceter-auth-subtitle">Create a customer profile for orders and saved carts.</p>{params.error ? <p className="ceter-auth-message error">{params.error}</p> : null}<form action={signUpAction} className="ceter-auth-form"><label>Full name<input id="signup-full-name" name="full_name" autoComplete="name" placeholder="Your full name" required /></label><label>Phone number<input id="signup-phone" name="phone" type="tel" autoComplete="tel" placeholder="Your mobile number" required /></label><label>Email address<input id="signup-email" name="email" type="email" autoComplete="username" placeholder="you@example.com" required /></label><label>Password<input id="signup-password" name="password" type="password" autoComplete="new-password" placeholder="Create a password" required minLength={6} /></label><FormSubmitButton pendingText="Creating account..." className="ceter-auth-primary">Create account</FormSubmitButton></form><p className="ceter-auth-signup">Already registered? <Link href="/login">Sign in</Link></p><AuthFooter /></section></main>;
}
