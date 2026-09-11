"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ProfileRole } from "@prisma/client";
import { requirePermission } from "@/lib/admin/auth";
import { assertKnownPermissions, assertRoleGrantAllowed, cancelInvitation, createAdminInvitation, createTaxType, createTemplateVersion, redactSecrets, sanitizeAdminHtml, setFeatureFlag, upsertBranch } from "@/lib/admin/administration";
import { roleLabels, type BusinessRole } from "@/lib/admin/roles";
import { prisma } from "@/lib/prisma";

const profileRoles: ProfileRole[] = ["admin", "owner", "manager", "sales", "store"];
const businessRoles = Object.keys(roleLabels) as BusinessRole[];

export async function createInvitationAction(formData: FormData) {
  const session = await requirePermission("users.invite");
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "") as ProfileRole;
  if (!email.includes("@") || !profileRoles.includes(role)) throw new Error("Valid email and admin role are required.");
  await createAdminInvitation({ email, role, invitedById: session.userId });
  revalidatePath("/admin/users/invitations");
  redirect("/admin/users/invitations?success=Invitation created with hashed token");
}

export async function cancelInvitationAction(formData: FormData) {
  const session = await requirePermission("users.invite");
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  await cancelInvitation(id, session.userId, reason);
  revalidatePath("/admin/users/invitations");
  redirect("/admin/users/invitations?success=Invitation cancelled");
}

export async function createRoleDefinitionAction(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const roleKey = String(formData.get("role_key") ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const name = String(formData.get("name") ?? "").trim();
  const permissions = String(formData.get("permissions") ?? "").split(/[,\s]+/).map((item) => item.trim()).filter(Boolean);
  assertKnownPermissions(permissions);
  if (!roleKey || !name) throw new Error("Role key and name are required.");
  await prisma.$transaction([
    prisma.adminRoleDefinition.create({ data: { role_key: roleKey, name, permissions, branch_scope: "assigned", created_by_id: session.userId } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "AdminRoleDefinition", entity_id: roleKey, action: "roles.custom.create", after: { name, permissions } } })
  ]);
  revalidatePath("/admin/roles");
  redirect("/admin/roles?success=Custom role recorded");
}

export async function privilegedRoleAssignmentAction(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const targetRole = String(formData.get("business_role") ?? "") as BusinessRole;
  if (!businessRoles.includes(targetRole)) throw new Error("Known business role is required.");
  assertRoleGrantAllowed(session.role, targetRole);
  await prisma.auditLog.create({ data: { user_id: session.userId, entity: "Role", entity_id: targetRole, action: "roles.privileged.assignment.validated", after: { role: roleLabels[targetRole], outcome: "validated" } } });
  revalidatePath("/admin/roles");
  redirect("/admin/roles?success=Privileged role assignment guard validated");
}

export async function saveBranchAction(formData: FormData) {
  const session = await requirePermission("branches.manage");
  await upsertBranch({
    id: String(formData.get("id") ?? "") || undefined,
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    timezone: String(formData.get("timezone") ?? "") || "Africa/Nairobi",
    defaultInventoryLocationId: String(formData.get("default_inventory_location_id") ?? "") || undefined,
    userId: session.userId
  });
  revalidatePath("/admin/branches");
  redirect("/admin/branches?success=Branch saved");
}

export async function saveNoticeAction(formData: FormData) {
  const session = await requirePermission("notices.manage");
  const title = String(formData.get("title") ?? "").trim();
  const message = sanitizeAdminHtml(String(formData.get("message") ?? ""));
  if (!title || !message) throw new Error("Notice title and message are required.");
  await prisma.$transaction(async (tx) => {
    const notice = await tx.adminNotice.create({
      data: {
        title,
        message,
        priority: String(formData.get("priority") ?? "normal"),
        audience: String(formData.get("audience") ?? "all_admins"),
        starts_at: new Date(String(formData.get("starts_at") || new Date().toISOString())),
        ends_at: String(formData.get("ends_at") || "") ? new Date(String(formData.get("ends_at"))) : null,
        status: String(formData.get("status") ?? "draft"),
        is_pinned: formData.get("is_pinned") === "on",
        acknowledgement_required: formData.get("acknowledgement_required") === "on",
        created_by_id: session.userId
      }
    });
    await tx.auditLog.create({ data: { user_id: session.userId, entity: "AdminNotice", entity_id: notice.id, action: "notices.create", after: { title, status: notice.status, sanitized: message !== String(formData.get("message") ?? "") } } });
  });
  revalidatePath("/admin/notices");
  redirect("/admin/notices?success=Notice saved");
}

export async function saveBusinessProfileAction(formData: FormData) {
  const session = await requirePermission("settings.business.manage");
  const latest = await prisma.businessProfileVersion.findFirst({ orderBy: { version: "desc" }, select: { version: true } });
  const payload = {
    legal_name: blank(formData.get("legal_name")),
    trading_name: blank(formData.get("trading_name")),
    registration_number: blank(formData.get("registration_number")),
    kra_pin: blank(formData.get("kra_pin")),
    vat_information: blank(formData.get("vat_information")),
    address: blank(formData.get("address")),
    telephone: blank(formData.get("telephone")),
    general_email: blank(formData.get("general_email")),
    sales_email: blank(formData.get("sales_email")),
    support_email: blank(formData.get("support_email")),
    website: blank(formData.get("website")),
    document_footer: blank(formData.get("document_footer")),
    business_description: blank(formData.get("business_description"))
  };
  await prisma.$transaction([
    prisma.businessProfileVersion.create({ data: { version: (latest?.version ?? 0) + 1, ...payload, approval_state: "draft", created_by_id: session.userId } }),
    prisma.auditLog.create({ data: { user_id: session.userId, entity: "BusinessProfileVersion", entity_id: "next", action: "settings.business.version.create", after: redactSecrets(payload) } })
  ]);
  revalidatePath("/admin/settings/business");
  redirect("/admin/settings/business?success=Business profile draft version saved");
}

export async function saveBrandingAction(formData: FormData) {
  const session = await requirePermission("settings.branding.manage");
  const primary = String(formData.get("primary_color") ?? "#0f3b57");
  const secondary = String(formData.get("secondary_color") ?? "#1f7a8c");
  const accent = String(formData.get("accent_color") ?? "#f5a524");
  for (const color of [primary, secondary, accent]) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("Brand colours must be six-digit hex values.");
  }
  const latest = await prisma.brandingProfile.findFirst({ orderBy: { version: "desc" }, select: { version: true } });
  await prisma.brandingProfile.create({ data: { version: (latest?.version ?? 0) + 1, primary_color: primary, secondary_color: secondary, accent_color: accent, created_by_id: session.userId } });
  revalidatePath("/admin/settings/branding");
  redirect("/admin/settings/branding?success=Branding draft version saved");
}

export async function savePaymentMethodAction(formData: FormData) {
  const session = await requirePermission("settings.payments.manage");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  if (!code || !name) throw new Error("Payment method code and name are required.");
  await prisma.paymentMethodSetting.upsert({
    where: { code },
    create: { code, name, method_type: String(formData.get("method_type") ?? "manual"), reference_required: formData.get("reference_required") === "on", customer_visible: formData.get("customer_visible") === "on", instructions: blank(formData.get("instructions")), created_by_id: session.userId },
    update: { name, method_type: String(formData.get("method_type") ?? "manual"), reference_required: formData.get("reference_required") === "on", customer_visible: formData.get("customer_visible") === "on", instructions: blank(formData.get("instructions")) }
  });
  revalidatePath("/admin/settings/payment-methods");
  redirect("/admin/settings/payment-methods?success=Payment method saved");
}

export async function saveTaxTypeAction(formData: FormData) {
  const session = await requirePermission("settings.tax.manage");
  await createTaxType({
    name: String(formData.get("name") ?? ""),
    internalCode: String(formData.get("internal_code") ?? "").trim().toUpperCase(),
    officialCode: blank(formData.get("official_code")) ?? undefined,
    rate: String(formData.get("rate") ?? "0"),
    effectiveFrom: new Date(String(formData.get("effective_from") ?? "")),
    effectiveTo: blank(formData.get("effective_to")) ? new Date(String(formData.get("effective_to"))) : null,
    userId: session.userId
  });
  revalidatePath("/admin/settings/tax");
  redirect("/admin/settings/tax?success=Tax type saved for finance review");
}

export async function saveIntegrationAction(formData: FormData) {
  const session = await requirePermission("settings.integrations.manage");
  const integrationType = String(formData.get("integration_type") ?? "");
  const environment = String(formData.get("environment") ?? "sandbox");
  const name = String(formData.get("name") ?? integrationType);
  await prisma.integrationSetting.upsert({
    where: { integration_type_environment_name: { integration_type: integrationType, environment, name } },
    create: { integration_type: integrationType, environment, name, enabled: false, credential_configured: false, secret_reference: blank(formData.get("secret_reference")), created_by_id: session.userId, sanitized_metadata: { secrets_visible: false } },
    update: { enabled: false, credential_configured: false, secret_reference: blank(formData.get("secret_reference")), sanitized_metadata: { secrets_visible: false } }
  });
  revalidatePath("/admin/settings/integrations");
  redirect("/admin/settings/integrations?success=Integration state saved without secrets");
}

export async function saveTemplateAction(formData: FormData) {
  const session = await requirePermission("settings.templates.manage");
  await createTemplateVersion({
    templateKey: String(formData.get("template_key") ?? ""),
    templateType: String(formData.get("template_type") ?? "document"),
    body: String(formData.get("body") ?? ""),
    allowedVariables: String(formData.get("allowed_variables") ?? "").split(/[,\s]+/).filter(Boolean),
    userId: session.userId
  });
  revalidatePath("/admin/settings/templates");
  redirect("/admin/settings/templates?success=Template draft version saved");
}

export async function saveLegalAction(formData: FormData) {
  const session = await requirePermission("settings.legal.manage");
  const key = String(formData.get("content_key") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = sanitizeAdminHtml(String(formData.get("body") ?? ""));
  if (!key || !title || !body) throw new Error("Legal content key, title and body are required.");
  const latest = await prisma.legalContentVersion.findFirst({ where: { content_key: key }, orderBy: { version: "desc" }, select: { version: true } });
  await prisma.legalContentVersion.create({ data: { content_key: key, title, body, version: (latest?.version ?? 0) + 1, created_by_id: session.userId } });
  revalidatePath("/admin/settings/legal");
  redirect("/admin/settings/legal?success=Legal draft version saved");
}

export async function setFeatureFlagAction(formData: FormData) {
  const session = await requirePermission("settings.feature_flags.manage");
  await setFeatureFlag({
    flagKey: String(formData.get("flag_key") ?? ""),
    name: String(formData.get("name") ?? ""),
    enabled: formData.get("enabled") === "on",
    reason: String(formData.get("reason") ?? ""),
    requiredConfigured: formData.get("required_configured") !== "false",
    userId: session.userId
  });
  revalidatePath("/admin/settings/security");
  redirect("/admin/settings/security?success=Feature flag updated");
}

function blank(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
