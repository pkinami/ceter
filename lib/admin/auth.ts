import { redirect } from "next/navigation";
import type { ProfileRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { roleCapabilities, type AdminRole } from "@/lib/admin/roles";

export type { AdminRole } from "@/lib/admin/roles";

export type AdminSession = {
  userId: string;
  email: string | null;
  name: string | null;
  role: AdminRole;
  legacyRole: ProfileRole;
};

const ROLE_MAP: Record<string, AdminRole | null> = {
  admin: "ADMIN",
  owner: "ADMIN",
  manager: "ADMIN",
  sales: "ADMIN",
  store: "ADMIN",
  customer: null
};


export async function getAdminSession(): Promise<AdminSession | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true, full_name: true }
  });
  if (!profile) return null;

  const role = ROLE_MAP[profile.role] ?? null;
  if (!role) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? null,
    name: profile.full_name,
    role,
    legacyRole: profile.role
  };
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function requireCapability(capability: keyof typeof roleCapabilities.ADMIN, allowed: readonly string[]) {
  const session = await getAdminSession();
  if (!session) throw new Error("Admin access is required.");
  const value = roleCapabilities[session.role][capability];
  if (!allowed.includes(value)) throw new Error("Your role is not permitted to perform this action.");
  return session;
}
