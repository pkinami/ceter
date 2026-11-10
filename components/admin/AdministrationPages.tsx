import Link from "next/link";
import { hasPermission, requirePermission } from "@/lib/admin/auth";
import { integrationStatus } from "@/lib/admin/administration";
import { permissionGroups, roleLabels, rolePermissions, type BusinessRole } from "@/lib/admin/roles";
import { prisma } from "@/lib/prisma";
import { ToggleSwitch } from "@/components/admin/ToggleSwitch";
import {
  cancelInvitationAction,
  createInvitationAction,
  createRoleDefinitionAction,
  privilegedRoleAssignmentAction,
  saveBranchAction,
  saveBrandingAction,
  saveBusinessProfileAction,
  saveIntegrationAction,
  saveLegalAction,
  saveNoticeAction,
  savePaymentMethodAction,
  saveTaxTypeAction,
  saveTemplateAction,
  setFeatureFlagAction
} from "@/app/admin/administration-actions";

export async function UsersPage({ view, id, form = false }: { view: "list" | "invitations"; id?: string; form?: boolean }) {
  await requirePermission(view === "invitations" ? "users.invite" : "users.view");
  const [users, invitations] = await Promise.all([
    prisma.profile.findMany({ where: id ? { id } : { role: { not: "customer" } }, orderBy: { created_at: "desc" }, take: 100 }),
    prisma.adminInvitation.findMany({ orderBy: { created_at: "desc" }, take: 100 })
  ]);
  if (form) return <Shell eyebrow="Administration" title="Invite User" subtitle="Create an expiring invitation through the real admin RBAC path; raw tokens are never stored."><InviteForm /></Shell>;
  if (view === "invitations") return <Shell eyebrow="Administration" title="User Invitations" subtitle="Expiring, single-use invitations store token hashes only." action={<Link className="ceter-admin-primary-button" href="/admin/users/new">Invite user</Link>}>
    <Kpis items={[["Pending", invitations.filter((i) => i.status === "pending").length], ["Expired", invitations.filter((i) => i.expires_at < new Date()).length], ["Cancelled", invitations.filter((i) => i.status === "cancelled").length]]} />
    <InviteForm />
    <Table columns={["Email", "Role", "Status", "Expires", "Token", "Actions"]} rows={invitations.map((i) => [i.email, label(i.role), <Badge key={i.id} value={i.status} />, date(i.expires_at), "Stored as SHA-256 hash", <CancelInvitation key={`${i.id}-a`} id={i.id} />])} empty="No invitations recorded." />
  </Shell>;
  return <Shell eyebrow="Administration" title={id ? "User Detail" : "User Management"} subtitle="Supabase-backed profiles, legacy role compatibility and protected administrator changes." action={<Link className="ceter-admin-primary-button" href="/admin/users/new">Invite user</Link>}>
    <Kpis items={[["Admin users", users.length], ["Super administrators", users.filter((u) => ["admin", "owner"].includes(u.role)).length], ["Suspension", "Audited"], ["Passwords", "Never stored"]]} />
    <FilterBar placeholder="Search users by name or email..." />
    <Table columns={["Name", "Email", "Legacy role", "Admin role", "MFA", "Last sign-in", "Status", "Open"]} rows={users.map((u) => {
      const mapped = roleLabelForLegacy(u.role);
      return [u.full_name ?? "Unnamed user", u.email ?? "-", u.role, mapped, "Provider status", "Provider history", <Badge key={u.id} value={mapped === "No admin access" ? "no_admin_access" : "active"} />, <Link key="a" href={`/admin/users/${u.id}`}>Open</Link>];
    })} empty="No admin users found." />
  </Shell>;
}

export async function RolesPage({ id, form = false }: { id?: string; form?: boolean }) {
  await requirePermission(form ? "roles.manage" : "roles.view");
  const [customRoles, profiles] = await Promise.all([
    prisma.adminRoleDefinition.findMany({ orderBy: { created_at: "desc" }, take: 100 }),
    prisma.profile.groupBy({ by: ["role"], _count: true })
  ]);
  if (form) return <Shell eyebrow="Administration" title="New Custom Role" subtitle="Custom role permissions are validated against the code-level permission catalogue."><CustomRoleForm /></Shell>;
  const roles = Object.keys(roleLabels) as BusinessRole[];
  return <Shell eyebrow="Administration" title={id ? "Role Detail" : "Roles & Permissions"} subtitle="System roles remain protected; custom roles cannot introduce unknown permissions." action={<Link className="ceter-admin-primary-button" href="/admin/roles/new">New role</Link>}>
    <Kpis items={[["System roles", roles.length], ["Custom roles", customRoles.length], ["Permission groups", permissionGroups.length], ["Super admin guard", "Enabled"]]} />
    <Table columns={["Role", "Users", "Permissions", "Type", "Privileged guard"]} rows={roles.map((role) => [roleLabels[role], userCount(role, profiles), rolePermissions[role].length, <Badge key={role} value="system" />, <ValidateRoleGrant key={`${role}-a`} role={role} />])} empty="No roles." />
    <Table columns={["Custom role", "Key", "Permissions", "Scope", "Status"]} rows={customRoles.map((role) => [role.name, role.role_key, role.permissions.length, role.branch_scope, <Badge key={role.id} value={role.archived_at ? "archived" : "active"} />])} empty="No custom roles yet." />
  </Shell>;
}

export async function AdministrationPage({ view, id, form = false }: { view: "sales-team" | "branches" | "compliance" | "activity" | "notices"; id?: string; form?: boolean }) {
  if (view === "activity") return <Activity />;
  await requirePermission(view === "sales-team" ? "sales_team.view" : view === "branches" ? "branches.view" : view === "compliance" ? "compliance.view" : "notices.view");
  if (view === "branches") return <Branches id={id} form={form} />;
  if (view === "sales-team") return <SalesTeam id={id} />;
  if (view === "compliance") return <Compliance id={id} />;
  return <Notices id={id} form={form} />;
}

export async function SettingsPage({ view }: { view: "business" | "branding" | "payment-methods" | "tax" | "sms" | "integrations" | "mpesa" | "etims" | "signing" | "security" | "notifications" | "templates" | "legal" | "help" }) {
  if (view === "help") return <Help />;
  await requirePermission(settingPermission(view));
  if (view === "business") return <BusinessProfile />;
  if (view === "branding") return <Branding />;
  if (view === "payment-methods") return <PaymentMethods />;
  if (view === "tax") return <TaxTypes />;
  if (view === "templates") return <Templates />;
  if (view === "legal") return <Legal />;
  if (view === "security") return <Security />;
  return <IntegrationSettings view={view} />;
}

async function Branches({ id, form }: { id?: string; form?: boolean }) {
  const [branches, locations] = await Promise.all([
    prisma.branch.findMany({ where: id ? { id } : undefined, orderBy: { code: "asc" }, take: 100 }),
    prisma.inventoryLocation.findMany({ orderBy: { name: "asc" }, take: 100 })
  ]);
  if (form) return <Shell eyebrow="Administration" title="New Branch" subtitle="Branch codes are unique and default inventory locations must exist."><BranchForm locations={locations} /></Shell>;
  return <Shell eyebrow="Administration" title={id ? "Branch Detail" : "Branches"} subtitle="Branch records hold non-secret location, numbering and pay-point metadata." action={<Link className="ceter-admin-primary-button" href="/admin/branches/new">New branch</Link>}>
    <Kpis items={[["Branches", branches.length], ["Active", branches.filter((b) => b.status === "active").length], ["Archived", branches.filter((b) => b.archived_at).length]]} />
    <Table columns={["Code", "Name", "Timezone", "Inventory location", "Status", "Open"]} rows={branches.map((b) => [b.code, b.name, b.timezone, b.default_inventory_location_id?.slice(0, 8) ?? "Not set", <Badge key={b.id} value={b.archived_at ? "archived" : b.status} />, <Link key="a" href={`/admin/branches/${b.id}`}>Open</Link>])} empty="No branches configured." />
  </Shell>;
}

async function SalesTeam({ id }: { id?: string }) {
  await requirePermission("sales_team.view");
  const [members, users, orders, quotes] = await Promise.all([
    prisma.salesTeamMember.findMany({ where: id ? { id } : undefined, orderBy: { created_at: "desc" }, take: 100 }),
    prisma.profile.findMany({ where: { role: "sales" }, take: 100 }),
    prisma.order.groupBy({ by: ["user_id"], _sum: { total_kes: true }, _count: { _all: true } }),
    prisma.quote.groupBy({ by: ["created_by_id"], _count: { _all: true } })
  ]);
  return <Shell eyebrow="Administration" title={id ? "Sales Team Member" : "Sales Team"} subtitle="Sales People and Sales Team are consolidated without duplicating users." >
    <Kpis items={[["Configured members", members.length], ["Sales profiles", users.length], ["Orders tracked", orders.reduce((sum, row) => sum + row._count._all, 0)], ["Targets", "Not invented"]]} />
    <Table columns={["User", "Sales code", "Branch", "Manager", "Orders", "Quotations", "Status", "Open"]} rows={members.map((m) => [m.user_id.slice(0, 8), m.sales_code, m.branch_id?.slice(0, 8) ?? "All", m.manager_id?.slice(0, 8) ?? "-", orders.find((o) => o.user_id === m.user_id)?._count._all ?? 0, quotes.find((q) => q.created_by_id === m.user_id)?._count._all ?? 0, <Badge key={m.id} value={m.status} />, <Link key="a" href={`/admin/sales-team/${m.id}`}>Open</Link>])} empty="No sales team members configured; existing sales profiles remain authoritative." />
  </Shell>;
}

async function Compliance({ id }: { id?: string }) {
  const docs = await prisma.complianceDocument.findMany({ where: id ? { id } : undefined, orderBy: [{ expiry_date: "asc" }, { created_at: "desc" }], take: 100 });
  return <Shell eyebrow="Administration" title={id ? "Compliance Document" : "Compliance & Tender Documents"} subtitle="Private, versioned compliance evidence; tender-pack inclusion requires approval.">
    <Kpis items={[["Documents", docs.length], ["Sensitive", docs.filter((d) => d.sensitivity !== "internal").length], ["Expiring", docs.filter((d) => d.expiry_date && d.expiry_date < daysFromNow(45)).length], ["Public sharing", "Expiring only"]]} />
    <FilterBar placeholder="Search document number, title or issuer..." />
    <Table columns={["Number", "Type", "Title", "Issuer", "Expiry", "Sensitivity", "Status", "Verification"]} rows={docs.map((d) => [d.document_number, label(d.document_type), d.title, d.issuer ?? "-", d.expiry_date ? date(d.expiry_date) : "Not set", <Badge key={`${d.id}-s`} value={d.sensitivity} />, <Badge key={d.id} value={d.status} />, d.verification_state])} empty="No compliance documents recorded." />
  </Shell>;
}

async function Activity() {
  const session = await requirePermission("audit.view");
  const canExport = hasPermission(session, "audit.export");
  const rows = await prisma.auditLog.findMany({ orderBy: { created_at: "desc" }, take: 100, include: { user: { select: { full_name: true, email: true } } } });
  return <Shell eyebrow="Administration" title="Activity Logs" subtitle="Immutable redacted audit trail with export guarded by a dedicated permission.">
    <Kpis items={[["Events", rows.length], ["Blocked", rows.filter((r) => r.action.includes("blocked")).length], ["audit.export", canExport ? "Allowed" : "Denied"]]} />
    <FilterBar placeholder="Search action, module, user or correlation id..." />
    <Table columns={["Date", "User", "Module", "Action", "Target", "Outcome", "Detail"]} rows={rows.map((r) => [dateTime(r.created_at), r.user?.full_name ?? r.user?.email ?? "System", r.entity, r.action, r.entity_id, r.action.includes("blocked") ? "blocked" : "success", <details key={r.id}><summary>Redacted</summary><pre>{JSON.stringify({ before: r.before, after: r.after }, null, 2)}</pre></details>])} empty="No activity records." />
  </Shell>;
}

async function Notices({ id, form }: { id?: string; form?: boolean }) {
  const notices = await prisma.adminNotice.findMany({ where: id ? { id } : undefined, orderBy: [{ is_pinned: "desc" }, { starts_at: "desc" }], take: 100 });
  if (form) return <Shell eyebrow="Administration" title="New Notice" subtitle="Draft, scheduled and audience-scoped notices are checked server-side."><NoticeForm /></Shell>;
  return <Shell eyebrow="Administration" title={id ? "Notice Detail" : "Notices"} subtitle="Internal notices never publish to the public storefront." action={<Link className="ceter-admin-primary-button" href="/admin/notices/new">New notice</Link>}>
    <Kpis items={[["Notices", notices.length], ["Active", notices.filter(isNoticeActive).length], ["Pinned", notices.filter((n) => n.is_pinned).length], ["Acknowledgement", notices.filter((n) => n.acknowledgement_required).length]]} />
    <Table columns={["Title", "Priority", "Audience", "Starts", "Ends", "Pinned", "Status", "Open"]} rows={notices.map((n) => [n.title, n.priority, n.audience, dateTime(n.starts_at), n.ends_at ? dateTime(n.ends_at) : "Open", n.is_pinned ? "Yes" : "No", <Badge key={n.id} value={n.status} />, <Link key="a" href={`/admin/notices/${n.id}`}>Open</Link>])} empty="No notices configured." />
  </Shell>;
}

async function BusinessProfile() {
  const profiles = await prisma.businessProfileVersion.findMany({ orderBy: { version: "desc" }, take: 20 });
  return <Shell eyebrow="Settings" title="Business Profile" subtitle="Confirmed company identity is versioned; issued documents keep their original snapshot.">
    <Kpis items={[["Versions", profiles.length], ["Active", profiles.find((p) => p.approval_state === "active")?.version ?? "None"], ["Base currency", profiles[0]?.base_currency ?? "KES"], ["Tax details", profiles[0]?.kra_pin ? "Configured" : "Missing"]]} />
    <BusinessProfileForm />
    <Table columns={["Version", "Legal name", "Trading name", "Email", "Currency", "State"]} rows={profiles.map((p) => [p.version, p.legal_name ?? "Missing", p.trading_name ?? "Missing", p.general_email ?? "-", p.base_currency, <Badge key={p.id} value={p.approval_state} />])} empty="No business profile versions." />
  </Shell>;
}

async function Branding() {
  const rows = await prisma.brandingProfile.findMany({ orderBy: { version: "desc" }, take: 20 });
  return <Shell eyebrow="Settings" title="Branding" subtitle="Logo and colour versions affect future screens/documents only."><BrandingForm /><Table columns={["Version", "Primary", "Secondary", "Accent", "Status", "Activated"]} rows={rows.map((r) => [r.version, <Swatch key={`${r.id}-p`} color={r.primary_color} />, <Swatch key={`${r.id}-s`} color={r.secondary_color} />, <Swatch key={`${r.id}-a`} color={r.accent_color} />, <Badge key={r.id} value={r.status} />, r.activated_at ? date(r.activated_at) : "-"])} empty="No branding versions." /></Shell>;
}

async function PaymentMethods() {
  const rows = await prisma.paymentMethodSetting.findMany({ orderBy: [{ sort_order: "asc" }, { name: "asc" }], take: 100 });
  return <Shell eyebrow="Settings" title="Payment Methods" subtitle="Payment method metadata is safe-archived and never stores card data or M-Pesa secrets."><PaymentMethodForm /><Table columns={["Name", "Code", "Type", "Reference", "Customer", "Mapping", "Status"]} rows={rows.map((r) => [r.name, r.code, r.method_type, r.reference_required ? "Required" : "Optional", r.customer_visible ? "Visible" : "Internal", r.accounting_mapping_ref ?? "Finance review", <Badge key={r.id} value={r.archived_at ? "archived" : r.is_active ? "active" : "inactive"} />])} empty="No payment methods configured." /></Shell>;
}

async function TaxTypes() {
  const rows = await prisma.taxTypeSetting.findMany({ orderBy: [{ internal_code: "asc" }, { effective_from: "desc" }], take: 100 });
  return <Shell eyebrow="Settings" title="Tax Types" subtitle="Effective-dated tax records require official review; overlapping periods are rejected."><TaxTypeForm /><Table columns={["Name", "Code", "Official", "Rate", "Effective", "Zero/exempt", "Review"]} rows={rows.map((r) => [r.name, r.internal_code, r.official_code ?? "Not invented", `${r.rate.toString()}%`, `${date(r.effective_from)} - ${r.effective_to ? date(r.effective_to) : "open"}`, r.is_zero_rated ? "Zero-rated" : r.is_exempt ? "Exempt" : "Standard", <Badge key={r.id} value={r.review_status} />])} empty="No tax types configured." /></Shell>;
}

async function IntegrationSettings({ view }: { view: "sms" | "integrations" | "mpesa" | "etims" | "signing" | "notifications" }) {
  const type = view === "mpesa" ? "mpesa" : view === "etims" ? "etims" : view === "signing" ? "signing" : view === "sms" ? "sms" : "generic";
  const rows = await prisma.integrationSetting.findMany({ where: view === "integrations" ? undefined : { integration_type: type }, orderBy: { updated_at: "desc" }, take: 100 });
  const title = view === "etims" ? "eTIMS Settings" : view === "mpesa" ? "M-Pesa Settings" : label(view);
  return <Shell eyebrow="Settings" title={title} subtitle={`${title} exposes configured-state only; secrets stay in environment variables or protected stores.`}>
    <Kpis items={[["Records", rows.length], ["Enabled", rows.filter((r) => r.enabled).length], ["Credentials", rows.filter((r) => r.credential_configured).length], ["Live actions", "Disabled until tested"]]} />
    {view !== "notifications" ? <IntegrationForm type={type} /> : <NotificationPreferences />}
    <Table columns={["Name", "Type", "Environment", "Enabled", "Credential state", "Webhook", "Status"]} rows={rows.map((r) => [r.name, r.integration_type, r.environment, r.enabled ? "Yes" : "No", r.credential_configured ? "Configured" : "Missing", r.webhook_status, integrationStatus(r.name, r.credential_configured, r.enabled)])} empty="No integration settings configured." />
  </Shell>;
}

async function Security() {
  const [settings, flags] = await Promise.all([
    prisma.securitySetting.findMany({ orderBy: { updated_at: "desc" }, take: 100 }),
    prisma.featureFlag.findMany({ orderBy: { flag_key: "asc" }, take: 100 })
  ]);
  return <Shell eyebrow="Settings" title="Security & Feature Flags" subtitle="Security settings use the real auth provider and feature flags are server-enforced."><FeatureFlagForm /><Table columns={["Code", "Status", "Reason", "Updated"]} rows={settings.map((s) => [s.code, <Badge key={s.id} value={s.status} />, s.reason ?? "-", dateTime(s.updated_at)])} empty="No security policy overrides recorded." /><Table columns={["Flag", "Name", "Enabled", "History"]} rows={flags.map((f) => [f.flag_key, f.name, f.enabled ? "Enabled" : "Disabled", Array.isArray(f.history) ? f.history.length : 0])} empty="No feature flags configured." /></Shell>;
}

async function Templates() {
  const rows = await prisma.templateVersion.findMany({ orderBy: [{ template_key: "asc" }, { version: "desc" }], take: 100 });
  return <Shell eyebrow="Settings" title="Templates" subtitle="Versioned templates use allowlisted variables, escaped content and no arbitrary JavaScript."><TemplateForm /><Table columns={["Key", "Type", "Version", "Variables", "Status", "Activated"]} rows={rows.map((r) => [r.template_key, r.template_type, r.version, r.allowed_variables.join(", ") || "None", <Badge key={r.id} value={r.status} />, r.activated_at ? date(r.activated_at) : "-"])} empty="No template versions." /></Shell>;
}

async function Legal() {
  const rows = await prisma.legalContentVersion.findMany({ orderBy: [{ content_key: "asc" }, { version: "desc" }], take: 100 });
  return <Shell eyebrow="Settings" title="Legal & Terms" subtitle="Legal content is versioned and cannot claim external legal approval without evidence."><LegalForm /><Table columns={["Key", "Title", "Version", "Status", "Published"]} rows={rows.map((r) => [r.content_key, r.title, r.version, <Badge key={r.id} value={r.status} />, r.published_at ? date(r.published_at) : "-"])} empty="No legal content versions." /></Shell>;
}

async function Help() {
  await requirePermission("help.view");
  return <Shell eyebrow="Help" title="Administration Help" subtitle="Role-aware guidance with safe diagnostics and confirmed support contacts.">
    <Kpis items={[["Build", "Local"], ["Diagnostics", "Secret-safe"], ["Support", "Configured contacts only"]]} />
    <Table columns={["Area", "Guidance", "Link"]} rows={[
      ["Imports", "Use preview and conflict review before commit.", <Link key="a" href="/admin/import">Open</Link>],
      ["Inventory", "Stock changes must post through inventory movements.", <Link key="b" href="/admin/inventory">Open</Link>],
      ["Fiscalization", "Production remains disabled until legitimate KRA onboarding is configured.", <Link key="c" href="/admin/fiscalization">Open</Link>],
      ["Accounting", "Statements use posted journals and show opening-balance blockers.", <Link key="d" href="/admin/accounting">Open</Link>]
    ]} empty="No help topics." />
  </Shell>;
}

function InviteForm() {
  return <Form action={createInvitationAction}><label>Email *<input name="email" type="email" required /></label><label>Role *<select name="role"><option value="manager">Administrator / Operations</option><option value="sales">Sales</option><option value="store">Inventory / Stores</option><option value="admin">Super Administrator</option></select></label><button className="ceter-admin-primary-button">Create invitation</button></Form>;
}

function CancelInvitation({ id }: { id: string }) {
  return <form action={cancelInvitationAction} className="ceter-admin-inline-form"><input type="hidden" name="id" value={id} /><input name="reason" placeholder="Reason" required /><button className="ceter-admin-secondary-button">Cancel</button></form>;
}

function CustomRoleForm() {
  return <Form action={createRoleDefinitionAction}><label>Role key *<input name="role_key" required /></label><label>Name *<input name="name" required /></label><label className="wide">Permissions *<textarea name="permissions" placeholder="Comma or space separated permission keys" required /></label><button className="ceter-admin-primary-button">Create role</button></Form>;
}

function ValidateRoleGrant({ role }: { role: BusinessRole }) {
  return <form action={privilegedRoleAssignmentAction} className="ceter-admin-inline-form"><input type="hidden" name="business_role" value={role} /><button className="ceter-admin-secondary-button">Validate grant</button></form>;
}

function BranchForm({ locations }: { locations: Array<{ id: string; name: string }> }) {
  return <Form action={saveBranchAction}><label>Code *<input name="code" required /></label><label>Name *<input name="name" required /></label><label>Timezone<input name="timezone" defaultValue="Africa/Nairobi" /></label><label>Default inventory location<select name="default_inventory_location_id"><option value="">Not selected</option>{locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label><button className="ceter-admin-primary-button">Save branch</button></Form>;
}

function NoticeForm() {
  return <Form action={saveNoticeAction}><label>Title *<input name="title" required /></label><label>Priority<select name="priority"><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Audience<select name="audience"><option value="all_admins">All admins</option><option value="role_scoped">Role scoped</option><option value="branch_scoped">Branch scoped</option></select></label><label>Status<select name="status"><option value="draft">Draft</option><option value="active">Active</option></select></label><label>Starts<input name="starts_at" type="datetime-local" /></label><label>Ends<input name="ends_at" type="datetime-local" /></label><label className="wide">Message *<textarea name="message" required /></label><ToggleSwitch name="is_pinned" label="Pinned" /><ToggleSwitch name="acknowledgement_required" label="Require acknowledgement" /><button className="ceter-admin-primary-button">Save notice</button></Form>;
}

function BusinessProfileForm() {
  return <Form action={saveBusinessProfileAction}><label>Legal company name<input name="legal_name" /></label><label>Trading name<input name="trading_name" /></label><label>Registration number<input name="registration_number" /></label><label>KRA PIN<input name="kra_pin" /></label><label>Telephone<input name="telephone" /></label><label>General email<input name="general_email" type="email" /></label><label>Website<input name="website" /></label><label className="wide">Address<textarea name="address" /></label><button className="ceter-admin-primary-button">Save draft version</button></Form>;
}

function BrandingForm() {
  return <Form action={saveBrandingAction}><label>Primary colour<input name="primary_color" defaultValue="#0f3b57" /></label><label>Secondary colour<input name="secondary_color" defaultValue="#1f7a8c" /></label><label>Accent colour<input name="accent_color" defaultValue="#f5a524" /></label><button className="ceter-admin-primary-button">Save branding version</button></Form>;
}

function PaymentMethodForm() {
  return <Form action={savePaymentMethodAction}><label>Code *<input name="code" required /></label><label>Name *<input name="name" required /></label><label>Type<select name="method_type"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mpesa">M-Pesa</option><option value="card_external">External card processor</option></select></label><ToggleSwitch name="reference_required" label="Reference required" /><ToggleSwitch name="customer_visible" label="Customer visible" /><label className="wide">Instructions<textarea name="instructions" /></label><button className="ceter-admin-primary-button">Save method</button></Form>;
}

function TaxTypeForm() {
  return <Form action={saveTaxTypeAction}><label>Name *<input name="name" required /></label><label>Internal code *<input name="internal_code" required /></label><label>Official code<input name="official_code" placeholder="Verified only" /></label><label>Rate *<input name="rate" type="number" min="0" step="0.0001" required /></label><label>Effective from *<input name="effective_from" type="date" required /></label><label>Effective to<input name="effective_to" type="date" /></label><button className="ceter-admin-primary-button">Save tax type</button></Form>;
}

function IntegrationForm({ type }: { type: string }) {
  return <Form action={saveIntegrationAction}><label>Name *<input name="name" defaultValue={label(type)} required /></label><label>Type<input name="integration_type" defaultValue={type} required /></label><label>Environment<select name="environment"><option value="sandbox">Sandbox</option><option value="production">Production</option></select></label><label>Secret reference<input name="secret_reference" placeholder="Environment or vault reference only" /></label><button className="ceter-admin-primary-button">Save disabled integration state</button></Form>;
}

function NotificationPreferences() {
  return <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Preferences</span><h2>Notification Rules</h2></div></div><p>In-app alerts remain enabled for mandatory operational and security events. Email and SMS delivery stay disabled until providers are configured.</p></article>;
}

function TemplateForm() {
  return <Form action={saveTemplateAction}><label>Template key *<input name="template_key" required /></label><label>Type<input name="template_type" defaultValue="document" /></label><label>Allowed variables<input name="allowed_variables" placeholder="document.number customer.name verification.url" /></label><label className="wide">Body *<textarea name="body" required /></label><button className="ceter-admin-primary-button">Save template draft</button></Form>;
}

function LegalForm() {
  return <Form action={saveLegalAction}><label>Content key *<input name="content_key" required /></label><label>Title *<input name="title" required /></label><label className="wide">Body *<textarea name="body" required /></label><button className="ceter-admin-primary-button">Save legal draft</button></Form>;
}

function FeatureFlagForm() {
  return <Form action={setFeatureFlagAction}><label>Flag key *<input name="flag_key" required /></label><label>Name *<input name="name" required /></label><ToggleSwitch name="enabled" label="Enabled" /><label>Configuration state<select name="required_configured"><option value="false">Required configuration missing</option><option value="true">Required configuration complete</option></select></label><label className="wide">Reason *<textarea name="reason" required /></label><button className="ceter-admin-primary-button">Update feature flag</button></Form>;
}

function Form({ action, children }: { action: (formData: FormData) => void | Promise<void>; children: React.ReactNode }) {
  return <article className="ceter-admin-panel ceter-admin-form-panel"><form action={action} className="ceter-admin-form">{children}</form></article>;
}

function Shell({ eyebrow, title, action, children }: { eyebrow: string; title: string; subtitle: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <div className="ceter-admin-page"><div className="ceter-admin-greeting"><div><p>{eyebrow}</p><h1>{title}</h1></div>{action}</div>{children}</div>;
}

function Kpis({ items }: { items: Array<[string, React.ReactNode]> }) {
  return <section className="ceter-admin-kpis">{items.map(([labelText, value]) => <article key={labelText} className="ceter-admin-kpi"><span>{labelText}</span><strong>{value}</strong></article>)}</section>;
}

function FilterBar({ placeholder }: { placeholder: string }) {
  return <form className="ceter-admin-filter-bar"><input name="q" placeholder={placeholder} /><select name="status"><option value="">All statuses</option><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select><input type="date" name="from" /><input type="date" name="to" /><button className="ceter-admin-secondary-button">Search</button></form>;
}

function Table({ title = "Records", columns, rows, empty }: { title?: string; columns: string[]; rows: React.ReactNode[][]; empty: string }) {
  return <article className="ceter-admin-panel"><div className="ceter-admin-panel-header"><div><span>Records</span><h2>{title}</h2></div><a className="ceter-admin-secondary-button" href={`/api/admin/exports?kind=${exportKind(title)}`}>Export CSV</a></div><div className="ceter-admin-table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}><div className="ceter-admin-empty">{empty}<br /><button className="ceter-admin-secondary-button">Retry</button></div></td></tr>}</tbody></table></div><div className="ceter-admin-pagination"><span>Showing latest {rows.length}</span><button className="ceter-admin-secondary-button">Next</button></div></article>;
}

function exportKind(title: string) {
  if (/activity|audit/i.test(title)) return "audit";
  if (/user|invitation/i.test(title)) return "users";
  if (/compliance/i.test(title)) return "compliance";
  if (/business profile/i.test(title)) return "settings-business";
  if (/sales orders?|orders?/i.test(title)) return "orders";
  if (/quotations?|quotes?/i.test(title)) return "quotes";
  if (/invoices?/i.test(title)) return "invoices";
  if (/receipts?/i.test(title)) return "receipts";
  if (/payments?/i.test(title)) return "payments";
  if (/delivery|deliveries/i.test(title)) return "deliveries";
  if (/documents?/i.test(title)) return "documents";
  if (/customers?/i.test(title)) return "customers";
  if (/product|inventory/i.test(title)) return "products";
  return "reports";
}

function Badge({ value }: { value: string }) {
  const tone = /active|enabled|success|system|valid|published/.test(value) ? "green" : /blocked|missing|cancel|expired|revoked|disabled|inactive/.test(value) ? "red" : "amber";
  return <span className={`ceter-admin-status ${tone}`}>{label(value)}</span>;
}

function Swatch({ color }: { color: string }) {
  return <span className="ceter-admin-swatch"><span style={{ background: color }} />{color}</span>;
}

function settingPermission(view: string) {
  const map: Record<string, Parameters<typeof requirePermission>[0]> = {
    business: "settings.business.manage",
    branding: "settings.branding.manage",
    "payment-methods": "settings.payments.manage",
    tax: "settings.tax.manage",
    sms: "settings.sms.manage",
    integrations: "settings.integrations.manage",
    mpesa: "settings.mpesa.manage",
    etims: "settings.etims.manage",
    signing: "settings.signing.manage",
    security: "settings.security.manage",
    notifications: "settings.notifications.manage",
    templates: "settings.templates.manage",
    legal: "settings.legal.manage"
  };
  return map[view] ?? "settings.view";
}

function roleLabelForLegacy(role: string) {
  const mapped = role in legacyRoleMap ? legacyRoleMap[role] : null;
  return mapped ? roleLabels[mapped] : "No admin access";
}

const legacyRoleMap: Record<string, BusinessRole | null> = {
  admin: "super_administrator",
  owner: "super_administrator",
  manager: "administrator_operations",
  sales: "sales",
  store: "inventory_stores",
  customer: null
};

function userCount(role: BusinessRole, rows: Array<{ role: string; _count: number }>) {
  return Object.entries(legacyRoleMap).filter(([, mapped]) => mapped === role).reduce((sum, [legacy]) => sum + (rows.find((row) => row.role === legacy)?._count ?? 0), 0);
}

function isNoticeActive(notice: { status: string; starts_at: Date; ends_at: Date | null }) {
  const now = new Date();
  return notice.status === "active" && notice.starts_at <= now && (!notice.ends_at || notice.ends_at > now);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function date(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric" }).format(new Date(value));
}

function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat("en-KE", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
