"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Profile = { full_name: string | null; role: "customer" | "admin" };

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "CT";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AuthMenu() {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
      if (data.user) {
        const { data: profileData } = await supabase.from("profiles").select("full_name,role").eq("id", data.user.id).maybeSingle();
        setProfile(profileData as Profile | null);
      }
    }
    load();

    const { data } = supabase.auth.onAuthStateChange(() => load());
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (!email) {
    return <Link href="/login" className="h-10 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-ink hover:bg-slate-50">Sign in</Link>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-sm font-black text-white"
        aria-label="Account menu"
      >
        {initials(profile?.full_name, email)}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-md border border-slate-300 bg-white p-2 text-sm shadow-industrial">
          <p className="truncate px-3 py-2 text-xs font-bold text-slate-500">{email}</p>
          <Link href="/account" className="flex items-center gap-2 rounded px-3 py-2 font-semibold text-ink hover:bg-teal-50"><UserRound className="h-4 w-4 text-signal" /> Account</Link>
          <Link href="/account#orders" className="block rounded px-3 py-2 font-semibold text-ink hover:bg-teal-50">Order history</Link>
          {profile?.role === "admin" ? <Link href="/admin" className="block rounded px-3 py-2 font-semibold text-ink hover:bg-teal-50">Admin panel</Link> : null}
          <button onClick={logout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      ) : null}
    </div>
  );
}
