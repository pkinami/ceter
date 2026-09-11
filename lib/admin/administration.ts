import crypto from "node:crypto";
import { Prisma, type ProfileRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { legacyRoleMapping, roleLabels, rolePermissions, type BusinessRole, type PermissionKey } from "@/lib/admin/roles";

const secretPattern = /secret|token|password|private|certificate|key|credential|passphrase|consumer|service_role/i;
const allowedTemplateVariables = new Set([
  "business.name", "business.email", "business.phone", "document.number", "document.date",
  "customer.name", "invoice.number", "order.number", "ticket.number", "contract.number",
  "verification.url", "kra.reference", "total.amount"
]);

export function createInvitationToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function redactSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redactSecrets) as T;
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, secretPattern.test(key) ? "[REDACTED]" : redactSecrets(entry)])) as T;
}

export function sanitizeAdminHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

export function assertSafeWebhookUrl(url: string) {
  const parsed = new URL(url);
  if (!["https:"].includes(parsed.protocol)) throw new Error("Webhook URLs must use HTTPS.");
  if (/^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.|169\.254\.)/i.test(parsed.hostname)) {
    throw new Error("Private, loopback or link-local webhook targets are blocked.");
  }
  return parsed.toString();
}

export function assertKnownPermissions(permissions: string[]): asserts permissions is PermissionKey[] {
  const known = new Set(Object.values(rolePermissions).flat());
  const unknown = permissions.filter((permission) => !known.has(permission as PermissionKey));
  if (unknown.length) throw new Error(`Unknown permission keys are not allowed: ${unknown.join(", ")}`);
}

export function assertRoleGrantAllowed(actor: BusinessRole, targetRole: BusinessRole) {
  if (targetRole === "super_administrator" && actor !== "super_administrator") {
    throw new Error("Only Super Administrators can grant Super Administrator access.");
  }
}

export async function assertLastSuperAdministratorSafe(targetUserId: string, nextRole?: ProfileRole, deactivating = false) {
  const current = await prisma.profile.findUnique({ where: { id: targetUserId }, select: { role: true } });
  if (!current) throw new Error("User not found.");
  const currentlySuper = legacyRoleMapping[current.role] === "super_administrator";
  const remainsSuper = nextRole ? legacyRoleMapping[nextRole] === "super_administrator" : currentlySuper;
  if (!currentlySuper || (remainsSuper && !deactivating)) return;
  const superCount = await prisma.profile.count({ where: { role: { in: ["admin", "owner"] } } });
  if (superCount <= 1) throw new Error("The last active Super Administrator cannot be demoted, suspended or deactivated.");
}

export async function createAdminInvitation(input: {
  email: string;
  role: ProfileRole;
  branchIds?: string[];
  invitedById: string;
}) {
  const mapped = legacyRoleMapping[input.role];
  if (!mapped) throw new Error("Invitations must grant an admin-capable role.");
  const existingUser = await prisma.profile.findFirst({ where: { email: { equals: input.email, mode: "insensitive" } }, select: { id: true } });
  if (existingUser) throw new Error("An existing user profile already uses this email.");
  const existingInvitation = await prisma.adminInvitation.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" }, status: "pending", expires_at: { gt: new Date() } }
  });
  if (existingInvitation) throw new Error("A pending invitation already exists for this email.");
  const { tokenHash } = createInvitationToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.adminInvitation.create({
      data: {
        email: input.email.trim().toLowerCase(),
        role: input.role,
        branch_ids: input.branchIds ?? [],
        token_hash: tokenHash,
        expires_at: expiresAt,
        invited_by_id: input.invitedById
      }
    });
    await tx.auditLog.create({
      data: {
        user_id: input.invitedById,
        entity: "AdminInvitation",
        entity_id: invitation.id,
        action: "users.invitation.create",
        after: { email: invitation.email, role: roleLabels[mapped], expires_at: expiresAt.toISOString(), token: "[HASHED]" }
      }
    });
    return invitation;
  });
}

export async function cancelInvitation(id: string, userId: string, reason: string) {
  if (!reason.trim()) throw new Error("Cancellation reason is required.");
  return prisma.$transaction([
    prisma.adminInvitation.update({ where: { id }, data: { status: "cancelled", cancelled_at: new Date() } }),
    prisma.auditLog.create({ data: { user_id: userId, entity: "AdminInvitation", entity_id: id, action: "users.invitation.cancel", after: { reason } } })
  ]);
}

export async function upsertBranch(input: { id?: string; code: string; name: string; timezone?: string; defaultInventoryLocationId?: string; userId: string }) {
  if (!input.code.trim() || !input.name.trim()) throw new Error("Branch code and name are required.");
  if (input.defaultInventoryLocationId) {
    const location = await prisma.inventoryLocation.findUnique({ where: { id: input.defaultInventoryLocationId }, select: { id: true } });
    if (!location) throw new Error("Default inventory location must exist.");
  }
  const data = {
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    timezone: input.timezone || "Africa/Nairobi",
    default_inventory_location_id: input.defaultInventoryLocationId || null,
    created_by_id: input.userId
  };
  return prisma.$transaction(async (tx) => {
    const branch = input.id ? await tx.branch.update({ where: { id: input.id }, data }) : await tx.branch.create({ data });
    await tx.auditLog.create({ data: { user_id: input.userId, entity: "Branch", entity_id: branch.id, action: input.id ? "branches.update" : "branches.create", after: data } });
    return branch;
  });
}

export async function createTaxType(input: { name: string; internalCode: string; rate: Prisma.Decimal.Value; effectiveFrom: Date; effectiveTo?: Date | null; userId: string; officialCode?: string }) {
  if (!input.name.trim() || !input.internalCode.trim()) throw new Error("Tax name and internal code are required.");
  const overlap = await prisma.taxTypeSetting.findFirst({
    where: {
      internal_code: input.internalCode,
      OR: [
        { effective_to: null },
        { effective_to: { gte: input.effectiveFrom } }
      ]
    }
  });
  if (overlap) throw new Error("Overlapping tax effective periods are not allowed.");
  return prisma.$transaction(async (tx) => {
    const row = await tx.taxTypeSetting.create({
      data: {
        name: input.name,
        internal_code: input.internalCode,
        official_code: input.officialCode || null,
        rate: input.rate,
        effective_from: input.effectiveFrom,
        effective_to: input.effectiveTo ?? null,
        review_status: input.officialCode ? "requires_official_review" : "requires_review",
        last_verified_at: new Date(),
        created_by_id: input.userId
      }
    });
    await tx.auditLog.create({ data: { user_id: input.userId, entity: "TaxTypeSetting", entity_id: row.id, action: "settings.tax.create", after: { code: row.internal_code, rate: row.rate.toString(), official_code: row.official_code ?? "not_set" } } });
    return row;
  });
}

export async function createTemplateVersion(input: { templateKey: string; templateType: string; body: string; allowedVariables: string[]; userId: string }) {
  assertKnownTemplateVariables(input.allowedVariables);
  const body = sanitizeAdminHtml(input.body);
  const latest = await prisma.templateVersion.findFirst({ where: { template_key: input.templateKey }, orderBy: { version: "desc" }, select: { version: true } });
  return prisma.templateVersion.create({
    data: {
      template_key: input.templateKey,
      template_type: input.templateType,
      version: (latest?.version ?? 0) + 1,
      body,
      allowed_variables: input.allowedVariables,
      sanitized_preview: { script_removed: body !== input.body },
      created_by_id: input.userId
    }
  });
}

export function assertKnownTemplateVariables(variables: string[]) {
  const unknown = variables.filter((variable) => !allowedTemplateVariables.has(variable));
  if (unknown.length) throw new Error(`Template variables are not allowlisted: ${unknown.join(", ")}`);
}

export async function setFeatureFlag(input: { flagKey: string; name: string; enabled: boolean; userId: string; reason: string; requiredConfigured?: boolean }) {
  if (!input.reason.trim()) throw new Error("Feature flag changes require a reason.");
  if (input.enabled && input.requiredConfigured === false) throw new Error("This feature cannot be enabled until required configuration is complete.");
  const existing = await prisma.featureFlag.findUnique({ where: { flag_key: input.flagKey } });
  const history = [...((existing?.history as Prisma.JsonArray | null) ?? []), { at: new Date().toISOString(), enabled: input.enabled, by: input.userId, reason: input.reason }];
  return prisma.featureFlag.upsert({
    where: { flag_key: input.flagKey },
    create: { flag_key: input.flagKey, name: input.name, enabled: input.enabled, history, updated_by_id: input.userId },
    update: { name: input.name, enabled: input.enabled, history, updated_by_id: input.userId }
  });
}

export function integrationStatus(name: string, configured: boolean, enabled: boolean) {
  if (!configured) return `${name} credentials not configured.`;
  return enabled ? `${name} enabled.` : `${name} configured but disabled.`;
}
