import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminSignInAction } from "@/app/actions";
import { AuthFooter } from "@/components/AuthFooter";
import { BrandIcon } from "@/components/BrandIcon";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { isAdminAuthBypassed } from "@/lib/admin/auth";

export const metadata = { title: "Admin Login", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (isAdminAuthBypassed()) redirect("/admin");
  const params = await searchParams;
  return <main className="ceter-auth-page"><div className="ceter-auth-dots" aria-hidden="true" /><section className="ceter-auth-card"><Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.svg" alt="Ceter Technologies Limited" width={210} height={50} className="ceter-auth-logo" priority /><h1>Admin login</h1><p className="ceter-auth-subtitle">Staff access for catalog, orders, stock, and operations.</p>{params.error ? <p className="ceter-auth-message error">{params.error}</p> : null}<form action={adminSignInAction} className="ceter-auth-form"><input type="hidden" name="next" value="/admin" /><label><span className="inline-flex items-center gap-2"><BrandIcon name="email" label="Email" size={18} className="h-4 w-4" />Staff email</span><input id="admin-login-email" name="email" type="email" autoComplete="username" placeholder="staff@example.com" required /></label><label>Password<input id="admin-login-password" name="password" type="password" autoComplete="current-password" placeholder="Your admin password" required minLength={6} /></label><FormSubmitButton pendingText="Signing in..." className="ceter-auth-primary">Sign in to admin</FormSubmitButton></form><p className="ceter-auth-signup">Customer account? <Link href="/login">Use customer login</Link></p><AuthFooter /></section></main>;
}
