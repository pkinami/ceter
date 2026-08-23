"use client";

import Link from "next/link";
import { LogOut, UserPen, UserRound } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

type Profile = { full_name: string | null; role: "customer" };

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "CT";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function AuthMenu() {
  const supabase = useMemo(() => createClient(), []);
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const loadForUser = useCallback(async (user: User | null) => {
    setEmail(user?.email ?? null);
    if (!user) {
      setProfile(null);
      setInitialized(true);
      return;
    }
    const { data: profileData } = await supabase.from("profiles").select("full_name,role").eq("id", user.id).maybeSingle();
    setProfile(profileData as Profile | null);
    setInitialized(true);
  }, [supabase]);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadForUser(data.session?.user ?? null);
  }, [loadForUser, supabase]);

  useEffect(() => {
    load();
    setOpen(false);
  }, [load, pathname]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadForUser(session?.user ?? null);
      router.refresh();
    });
    return () => data.subscription.unsubscribe();
  }, [loadForUser, router, supabase]);

  async function logout() {
    setEmail(null);
    setProfile(null);
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!initialized) {
    return <span className="h-10 w-10 rounded-full border border-slate-200 bg-slate-100 sm:h-11 sm:w-20 sm:rounded-md" aria-hidden="true" />;
  }

  if (!email) {
    return (
      <Link href="/login" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-ink hover:bg-slate-50 sm:h-11 sm:w-auto sm:rounded-md sm:px-3 sm:py-2 sm:text-sm sm:font-bold" aria-label="Sign in">
        <UserRound className="h-5 w-5 sm:hidden" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-ink shadow-sm hover:bg-slate-50 sm:h-11 sm:w-11"
        aria-label="Account menu"
      >
        {initials(profile?.full_name, email)}
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-56 rounded-md border border-slate-300 bg-white p-2 text-sm shadow-industrial">
          <p className="truncate px-3 py-2 text-xs font-bold text-slate-500">{email}</p>
          <Link href="/account" className="flex items-center gap-2 rounded px-3 py-2 font-semibold text-ink hover:bg-teal-50"><UserRound className="h-4 w-4 text-signal" /> Account</Link>
          <Link href="/account#orders" className="block rounded px-3 py-2 font-semibold text-ink hover:bg-teal-50">Order history</Link>
          <Link href="/account/edit" className="flex items-center gap-2 rounded px-3 py-2 font-semibold text-ink hover:bg-teal-50"><UserPen className="h-4 w-4 text-signal" /> Edit Account</Link>
          <button onClick={logout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left font-semibold text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" /> Log out</button>
        </div>
      ) : null}
    </div>
  );
}
