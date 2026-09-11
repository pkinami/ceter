"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/admin/auth";
import { roleLabels, type BusinessRole } from "@/lib/admin/roles";
import { prisma } from "@/lib/prisma";

export async function roleMaintenanceAction(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const role = String(formData.get("role") ?? "") as BusinessRole;
  const action = String(formData.get("action") ?? "");
  if (!role || !["clone", "delete"].includes(action)) throw new Error("Valid role action is required.");
  if (action === "delete") {
    await prisma.auditLog.create({
      data: {
        user_id: session.userId,
        entity: "Role",
        entity_id: role,
        action: "roles.delete.blocked",
        after: { outcome: "blocked", reason: "System roles cannot be deleted while legacy Profile roles depend on them." }
      }
    });
    redirect("/admin/roles?error=System roles cannot be deleted safely");
  }
  await prisma.auditLog.create({
    data: {
      user_id: session.userId,
      entity: "Role",
      entity_id: role,
      action: "roles.clone.requested",
      after: { source_role: roleLabels[role], outcome: "recorded", note: "Custom role persistence requires dynamic Role tables in a later additive migration." }
    }
  });
  revalidatePath("/admin/roles");
  redirect("/admin/roles?success=Role clone request recorded");
}
