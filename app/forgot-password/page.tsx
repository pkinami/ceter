import Image from "next/image";
import Link from "next/link";
import { forgotPasswordAction } from "@/app/actions";
import { AuthFooter } from "@/components/AuthFooter";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const metadata = { title: "Forgot Password", robots: { index: false, follow: false } };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  return <main className="ceter-auth-page"><div className="ceter-auth-dots" aria-hidden="true" /><section className="ceter-auth-card"><Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={210} height={50} className="ceter-auth-logo" priority /><h1>Reset your password</h1><p className="ceter-auth-subtitle">Enter your account email and we&apos;ll send a six-digit password-reset code.</p>{params.error ? <p className="ceter-auth-message error">{params.error}</p> : null}{params.success ? <p className="ceter-auth-message success">{params.success}</p> : null}<form action={forgotPasswordAction} className="ceter-auth-form"><label>Email address<input name="email" type="email" autoComplete="email" required /></label><FormSubmitButton pendingText="Sending..." className="ceter-auth-primary">Send reset code</FormSubmitButton></form><p className="ceter-auth-signup"><Link href="/login">Back to sign in</Link></p><AuthFooter /></section></main>;
}
