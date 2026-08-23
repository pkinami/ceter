"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseDeliveryRegion } from "@/lib/delivery";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_ROLES = new Set(["admin", "owner", "manager", "sales", "store"]);

async function siteOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (configured) return configured.startsWith("http") ? configured : `https://${configured}`;

  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) return "http://localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function safeRedirectPath(value: FormDataEntryValue | null, fallback: string) {
  const next = String(value ?? fallback);
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

function authErrorMessage(message: string) {
  if (/email not confirmed|confirm your email|not confirmed/i.test(message)) {
    return "Verify your email address before signing in.";
  }
  if (/invalid login credentials|invalid credentials/i.test(message)) {
    return "The email or password is incorrect.";
  }
  return message || "Authentication failed. Try again.";
}

function signupErrorMessage(message: string) {
  if (/rate limit|email rate limit|too many|over_email_send_rate_limit/i.test(message)) {
    return "Too many verification emails were requested. Please wait a few minutes before trying again.";
  }
  return message || "We could not create the account. Please try again.";
}

async function findAuthUserByEmail(email: string) {
  const supabaseAdmin = createAdminClient();
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find((user) => user.email?.toLowerCase() === normalized);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/account`,
      data: {
        full_name: fullName,
        phone
      }
    }
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(signupErrorMessage(error.message))}`);
  if (data.user?.id) {
    await prisma.profile.upsert({
      where: { id: data.user.id },
      update: { full_name: fullName, phone, role: "customer" },
      create: { id: data.user.id, full_name: fullName, phone, role: "customer" }
    });
    const companyName = String(formData.get("company_name") ?? "").trim();
    if (fullName || email || phone || companyName) {
      const customerData = {
        name: fullName || email || "Customer",
        company_name: companyName || null,
        customer_type: companyName ? "business" as const : "individual" as const,
        phone: phone || null,
        email: email || null,
        tax_pin: null,
        notes: null
      };
      await prisma.customer.create({ data: { profile_id: data.user.id, ...customerData } });
    }
  }
  if (data.session) {
    await supabase.auth.signOut();
    redirect("/login?error=Email verification is not enforced in Supabase Auth yet. Configure email confirmation, then sign in after verifying your email.");
  }
  redirect("/login?error=Check your email to verify the account before signing in.");
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const safeNext = safeRedirectPath(formData.get("next"), "/account");
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent(authErrorMessage(error.message))}&next=${encodeURIComponent(safeNext)}`);
  revalidatePath("/", "layout");
  redirect(safeNext);
}

export async function adminSignInAction(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  let authUser;
  try {
    authUser = await findAuthUserByEmail(email);
  } catch {
    redirect("/admin/login?error=Could not verify the staff account. Check Supabase service role configuration.");
  }

  if (!authUser) {
    redirect("/admin/login?error=No staff account exists for that email address.");
  }

  if (!authUser.email_confirmed_at) {
    redirect("/admin/login?error=This staff account has not verified its email address.");
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/admin/login?error=${encodeURIComponent(authErrorMessage(error.message))}`);
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/admin/login?error=The admin session could not be established.");
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { role: true }
  });

  if (!profile) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=This account has no application profile. Ask an owner to create the staff profile.");
  }

  if (!ADMIN_ROLES.has(profile.role)) {
    await supabase.auth.signOut();
    redirect("/admin/login?error=This account is not authorized for the admin console.");
  }

  revalidatePath("/", "layout");
  redirect("/admin");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const returnTo = safeRedirectPath(formData.get("return_to"), "/account/edit");

  try {
    await prisma.profile.upsert({
      where: { id: userData.user.id },
      update: {
        full_name: String(formData.get("full_name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        email: String(formData.get("email") ?? userData.user.email ?? "").trim(),
        delivery_region: parseDeliveryRegion(formData.get("delivery_region")),
        delivery_location: String(formData.get("delivery_location") ?? "").trim() || null,
        delivery_instructions: String(formData.get("delivery_instructions") ?? "").trim() || null
      },
      create: {
        id: userData.user.id,
        full_name: String(formData.get("full_name") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        email: String(formData.get("email") ?? userData.user.email ?? "").trim(),
        delivery_region: parseDeliveryRegion(formData.get("delivery_region")),
        delivery_location: String(formData.get("delivery_location") ?? "").trim() || null,
        delivery_instructions: String(formData.get("delivery_instructions") ?? "").trim() || null,
        role: "customer"
      }
    });
    const name = String(formData.get("full_name") ?? "").trim();
    const email = String(formData.get("email") ?? userData.user.email ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const companyName = String(formData.get("company_name") ?? "").trim();
    const taxPin = String(formData.get("tax_pin") ?? "").trim();
    const billingInformation = String(formData.get("billing_information") ?? "").trim();
    if (name || email || phone || companyName || taxPin || billingInformation) {
      const existingCustomer = await prisma.customer.findFirst({ where: { profile_id: userData.user.id }, select: { id: true } });
      const customerData = {
        name: name || email || "Customer",
        company_name: companyName || null,
        customer_type: companyName ? "business" as const : "individual" as const,
        phone: phone || null,
        email: email || null,
        tax_pin: taxPin || null,
        notes: billingInformation || null
      };
      if (existingCustomer) {
        await prisma.customer.update({ where: { id: existingCustomer.id }, data: customerData });
      } else {
        await prisma.customer.create({ data: { profile_id: userData.user.id, ...customerData } });
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Profile could not be updated.";
    redirect(`${returnTo}?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/account");
  revalidatePath("/account/edit");
  redirect(`${returnTo}?success=Profile updated`);
}
