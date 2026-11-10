import Image from "next/image";
import { resendEmailConfirmationAction, verifySignupOtpAction } from "@/app/actions";
import { AuthFooter } from "@/components/AuthFooter";
import { OtpVerificationForm } from "@/components/OtpVerificationForm";

export const metadata = { title: "Confirm your email", robots: { index: false, follow: false } };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const email = String(params.email ?? "").trim().toLowerCase();
  return <main className="ceter-auth-page"><div className="ceter-auth-dots" aria-hidden="true" /><section className="ceter-auth-card ceter-otp-card"><Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={210} height={50} className="ceter-auth-logo" priority /><p className="ceter-auth-kicker">CETER ACCOUNT</p><h1>Check your email</h1><p className="ceter-auth-subtitle">We sent a six-digit verification code to <strong>{mask(email) || "your email address"}</strong>. Enter it below to activate your account.</p>{params.error ? <p className="ceter-auth-message error">{params.error}</p> : null}{params.success ? <p className="ceter-auth-message success">{params.success}</p> : null}<OtpVerificationForm action={verifySignupOtpAction} email={email} submitLabel="Verify email" /><form action={resendEmailConfirmationAction} className="ceter-auth-resend"><input type="hidden" name="email" value={email} />Didn&apos;t receive it? <button>Resend verification code</button></form><AuthFooter /></section></main>;
}

function mask(email: string) { const [name, domain] = email.split("@"); return name && domain ? `${name.slice(0, 2)}${"•".repeat(Math.max(3, name.length - 2))}@${domain}` : ""; }
