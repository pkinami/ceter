"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProfileRole } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";
import { legacyRoleMapping, roleLabels } from "@/lib/admin/roles";
import { prisma } from "@/lib/prisma";

const profileRoles: ProfileRole[] = ["customer", "admin", "owner", "manager", "sales", "store"];

export async function updateUserRoleAction(formData: FormData) {
  const session = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as ProfileRole;
  if (!id || !profileRoles.includes(role)) throw new Error("Valid user and role are required.");
  const before = await prisma.profile.findUnique({ where: { id }, select: { role: true, email: true, full_name: true } });
  if (!before) throw new Error("User not found.");
  const beforeBusinessRole = legacyRoleMapping[before.role];
  const afterBusinessRole = legacyRoleMapping[role];
  await prisma.$transaction([
    prisma.profile.update({ where: { id }, data: { role } }),
    prisma.auditLog.create({
      data: {
        user_id: session.userId,
        entity: "Profile",
        entity_id: id,
        action: "users.role.update",
        before: { role: before.role, business_role: beforeBusinessRole ? roleLabels[beforeBusinessRole] : null },
        after: { role, business_role: afterBusinessRole ? roleLabels[afterBusinessRole] : null }
      }
    })
  ]);
  revalidatePath("/admin/users");
  redirect("/admin/users?success=User role updated");
}

export async function updateUserStatusAction(formData: FormData) {
  const session = await requirePermission("users.manage");
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!id || !["activate", "deactivate", "invite", "resend"].includes(next)) throw new Error("Valid user and action are required.");
  await prisma.auditLog.create({
    data: {
      user_id: session.userId,
      entity: "Profile",
      entity_id: id,
      action: `users.${next}`,
      after: { status: next === "deactivate" ? "inactive_requested" : "active_or_invited", note: "Supabase auth account state is managed outside Profile." }
    }
  });
  revalidatePath("/admin/users");
  redirect(`/admin/users?success=${encodeURIComponent(next === "resend" ? "Invitation resend recorded" : "User status action recorded")}`);
}
