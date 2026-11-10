import Image from "next/image";
import Link from "next/link";
import { resendRecoveryOtpAction, verifyRecoveryOtpAndUpdatePasswordAction } from "@/app/actions";
import { AuthFooter } from "@/components/AuthFooter";
import { OtpVerificationForm } from "@/components/OtpVerificationForm";

export const metadata = { title: "Choose a New Password", robots: { index: false, follow: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ email?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const email = String(params.email ?? "").trim().toLowerCase();
  return <main className="ceter-auth-page"><div className="ceter-auth-dots" aria-hidden="true" /><section className="ceter-auth-card ceter-otp-card"><Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={210} height={50} className="ceter-auth-logo" priority /><h1>Choose a new password</h1><p className="ceter-auth-subtitle">Enter the six-digit code from your email, then choose a new password.</p>{params.error ? <p className="ceter-auth-message error">{params.error}</p> : null}{params.success ? <p className="ceter-auth-message success">{params.success}</p> : null}<OtpVerificationForm action={verifyRecoveryOtpAndUpdatePasswordAction} email={email} submitLabel="Update password"><label>New password<input name="password" type="password" autoComplete="new-password" required minLength={6} /></label></OtpVerificationForm><form action={resendRecoveryOtpAction} className="ceter-auth-resend"><input type="hidden" name="email" value={email} />Didn&apos;t receive it? <button>Resend password-reset code</button></form><p className="ceter-auth-signup"><Link href="/login">Back to sign in</Link></p><AuthFooter /></section></main>;
}
