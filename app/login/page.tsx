import Image from "next/image";
import Link from "next/link";
import { signInAction } from "@/app/actions";
import { AuthFooter } from "@/components/AuthFooter";
import { AuthPasswordInput } from "@/components/AuthPasswordInput";

export const metadata = {
  title: "Customer Login",
  robots: { index: false, follow: false }
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <main className="ceter-auth-page"><div className="ceter-auth-dots" aria-hidden="true" /><section className="ceter-auth-card"><Image src="/ceter-logo-pack/lockup/ceter-logo-horizontal.png" alt="Ceter Technologies Limited" width={210} height={81} sizes="210px" priority unoptimized className="ceter-auth-logo" /><h1>Welcome back</h1><p className="ceter-auth-subtitle">Use your Email Address and password to log in to Ceter</p>{params.error ? <p className="ceter-auth-message error">{params.error}</p> : null}{params.success ? <p className="ceter-auth-message success">{params.success}</p> : null}<form action={signInAction} className="ceter-auth-form"><input type="hidden" name="next" value={params.next ?? "/account"} /><label>Email address<input id="login-email" name="email" type="email" autoComplete="username" placeholder="Email Address" required /></label><label>Password<AuthPasswordInput id="login-password" /></label><p className="ceter-auth-right-link"><Link href="/forgot-password">Forgot your password?</Link></p><button className="ceter-auth-primary">Log in</button></form><p className="ceter-auth-signup">New customer? <Link href="/signup">Sign Up</Link></p><AuthFooter /></section></main>
  );
}
