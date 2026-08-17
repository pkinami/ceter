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

async function retryAdminRead<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientAdminReadError(error) || attempt === 2) break;
      await prisma.$disconnect().catch(() => undefined);
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

function isTransientAdminReadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  return code === "P2039" || /EAUTHTIMEOUT|timeout while waiting|timeout exceeded|Connection terminated|Can't reach database|ECONNRESET|ETIMEDOUT/i.test(message);
}

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

  const profile = await retryAdminRead(() => prisma.profile.findUnique({
    where: { id: data.user.id },
    select: { role: true, full_name: true }
  }));
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
