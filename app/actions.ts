"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const phone = String(formData.get("phone") ?? "");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        phone
      }
    }
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  const { data: userData } = await supabase.auth.getUser();
  if (userData.user) redirect("/account");
  redirect("/login?error=Check your email to confirm the account");
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/account");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { error } = await supabase.from("profiles").update({
    full_name: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? "")
  }).eq("id", userData.user.id);

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/account");
  redirect("/account?success=Profile updated");
}
