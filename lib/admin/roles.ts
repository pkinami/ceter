import type { ProfileRole } from "@prisma/client";

export type BusinessRole =
  | "super_administrator"
  | "administrator_operations"
  | "inventory_stores"
  | "sales"
  | "procurement"
  | "finance"
  | "service_manager"
  | "technician"
  | "branch_manager"
  | "auditor_read_only";

export type PermissionKey =
  | "dashboard.view"
  | "products.view" | "products.create" | "products.update" | "products.archive" | "products.publish" | "products.feature" | "products.import" | "products.cost_price.view"
  | "categories.view" | "categories.manage" | "brands.view" | "brands.manage"
  | "storefront.view" | "storefront.banners.manage" | "storefront.homepage.manage" | "storefront.featured.manage" | "storefront.visibility.manage"
  | "inventory.view" | "inventory.adjust" | "inventory.transfer" | "inventory.stock_take" | "inventory.reconcile" | "inventory.serials.manage" | "inventory.locations.manage"
  | "customers.view" | "customers.manage" | "customers.create" | "customers.update" | "customers.archive" | "customers.tax.view" | "customers.categories.manage" | "customers.statements.view"
  | "quote_requests.view" | "quote_requests.manage" | "quotations.view" | "quotations.create" | "quotations.update" | "quotations.approve" | "quotations.issue" | "quotations.convert" | "quotations.manage"
  | "sales.view" | "sales.create" | "sales.update" | "sales.confirm" | "sales.cancel" | "sales.reserve" | "sales.fulfil" | "sales.returns" | "sales.backorders.manage"
  | "payments.view" | "payments.receive" | "payments.record" | "payments.allocate" | "payments.reverse" | "payments.mpesa.reconcile" | "receipts.issue" | "receipts.void"
  | "deliveries.view" | "deliveries.create" | "deliveries.dispatch" | "deliveries.complete" | "deliveries.return" | "delivery_notes.issue" | "deliveries.manage"
  | "billing.view" | "invoices.create" | "invoices.update" | "invoices.approve" | "invoices.issue" | "credit_debit_notes.create" | "credit_debit_notes.approve"
  | "fiscalization.view" | "fiscalization.prepare" | "fiscalization.approve" | "fiscalization.submit" | "fiscalization.retry" | "fiscalization.reconcile" | "fiscalization.configure" | "fiscalization.payloads.view"
  | "documents.view" | "documents.generate" | "documents.sign" | "documents.issue" | "documents.supersede" | "documents.revoke" | "documents.signing.configure"
  | "purchases.view" | "purchases.manage" | "suppliers.view" | "suppliers.manage" | "supplier_payments.manage"
  | "service.view"
  | "service.equipment.view" | "service.equipment.create" | "service.equipment.update" | "service.equipment.archive" | "service.equipment.transfer" | "service.equipment.protected.view"
  | "service.tickets.view_all" | "service.tickets.view_assigned" | "service.tickets.create" | "service.tickets.triage" | "service.tickets.assign" | "service.tickets.update" | "service.tickets.work" | "service.tickets.resolve" | "service.tickets.close" | "service.tickets.reopen" | "service.tickets.cancel" | "service.tickets.private_notes"
  | "service.sla.view" | "service.sla.manage" | "service.sla.override" | "service.sla.pause_resume" | "service.sla.resolve_breach"
  | "service.stock.request" | "service.stock.approve" | "service.stock.reserve" | "service.stock.issue" | "service.stock.return" | "service.stock.cost.view"
  | "service.installations.view" | "service.installations.create" | "service.installations.assign" | "service.installations.complete" | "service.installations.certificate.approve"
  | "service.maintenance.view" | "service.maintenance.plans.create" | "service.maintenance.schedule" | "service.maintenance.complete" | "service.maintenance.defer" | "service.maintenance.report.approve"
  | "service.warranties.view" | "service.warranties.manage" | "service.warranties.claims.create" | "service.warranties.eligibility.assess" | "service.warranties.approve_reject" | "service.warranties.override" | "service.warranties.replacement.complete"
  | "service.contracts.view" | "service.contracts.create" | "service.contracts.update" | "service.contracts.approve" | "service.contracts.activate" | "service.contracts.suspend" | "service.contracts.terminate" | "service.contracts.renew" | "service.contracts.pricing.view" | "service.contracts.entitlements.manage"
  | "service.mps.view" | "service.mps.manage" | "service.meter_readings.record" | "service.meter_readings.validate" | "service.meter_readings.correct" | "service.mps.billing.generate" | "service.mps.consumables.issue"
  | "service.loan_units.view" | "service.loan_units.reserve" | "service.loan_units.issue" | "service.loan_units.receive" | "service.loan_units.inspect" | "service.loan_units.damage" | "service.loan_units.retire"
  | "service.documents.view" | "service.documents.generate" | "service.documents.approve" | "service.documents.issue" | "service.documents.supersede" | "service.documents.revoke"
  | "service.tickets.manage" | "service.assign" | "service.resolve" | "service.contracts.manage" | "service.mps.manage"
  | "expenses.view" | "expenses.create" | "expenses.update" | "expenses.submit" | "expenses.approve" | "expenses.reject" | "expenses.post" | "expenses.pay" | "expenses.reverse" | "expenses.categories.manage" | "expenses.recurring.manage" | "expenses.attachments.view"
  | "accounting.view" | "accounting.post" | "accounting.reconcile" | "accounting.reports.view"
  | "accounting.transactions.view" | "accounting.accounts.view" | "accounting.accounts.manage" | "accounting.periods.view" | "accounting.periods.close" | "accounting.periods.reopen" | "accounting.periods.manage" | "accounting.posting_rules.manage" | "accounting.source_events.manage"
  | "accounting.journals.view" | "accounting.journals.create" | "accounting.journals.submit" | "accounting.journals.approve" | "accounting.journals.post" | "accounting.journals.reverse" | "accounting.journals.self_approve" | "accounting.journals.attachments.view"
  | "accounting.debtors.view" | "accounting.creditors.view" | "accounting.collections.manage" | "accounting.adjustments.approve" | "accounting.protected_party.view"
  | "reports.operational.view" | "reports.financial.view" | "reports.costs.view" | "reports.profit.view" | "reports.tax.view" | "reports.audit.view" | "reports.export" | "reports.issue_signed"
  | "fixed_assets.view" | "fixed_assets.create" | "fixed_assets.update" | "fixed_assets.approve" | "fixed_assets.depreciation.post" | "fixed_assets.dispose" | "fixed_assets.archive"
  | "users.view" | "users.manage" | "users.invite" | "users.suspend" | "users.sessions.revoke"
  | "roles.view" | "roles.manage" | "roles.privileged.assign"
  | "branches.view" | "branches.manage" | "branches.cross_scope"
  | "sales_team.view" | "sales_team.manage"
  | "compliance.view" | "compliance.manage" | "compliance.sensitive.view" | "compliance.share"
  | "audit.view" | "audit.export"
  | "notices.view" | "notices.manage" | "notices.acknowledge"
  | "settings.view" | "settings.manage" | "settings.business.manage" | "settings.branding.manage"
  | "settings.payments.manage" | "settings.tax.manage" | "settings.sms.manage" | "settings.integrations.manage"
  | "settings.mpesa.manage" | "settings.etims.manage" | "settings.signing.manage" | "settings.security.manage"
  | "settings.notifications.manage" | "settings.templates.manage" | "settings.legal.manage" | "settings.feature_flags.manage"
  | "help.view" | "help.diagnostics.view" | "signing.configure";

export type AdminRole = BusinessRole;

export const roleLabels: Record<BusinessRole, string> = {
  super_administrator: "Super Administrator",
  administrator_operations: "Administrator / Operations",
  inventory_stores: "Inventory / Stores",
  sales: "Sales",
  procurement: "Procurement",
  finance: "Finance",
  service_manager: "Service Manager",
  technician: "Technician",
  branch_manager: "Branch Manager",
  auditor_read_only: "Auditor / Read-only"
};

const allPermissions: PermissionKey[] = [
  "dashboard.view",
  "products.view", "products.create", "products.update", "products.archive", "products.publish", "products.feature", "products.import", "products.cost_price.view",
  "categories.view", "categories.manage", "brands.view", "brands.manage",
  "storefront.view", "storefront.banners.manage", "storefront.homepage.manage", "storefront.featured.manage", "storefront.visibility.manage",
  "inventory.view", "inventory.adjust", "inventory.transfer", "inventory.stock_take", "inventory.reconcile", "inventory.serials.manage", "inventory.locations.manage",
  "customers.view", "customers.manage", "customers.create", "customers.update", "customers.archive", "customers.tax.view", "customers.categories.manage", "customers.statements.view",
  "quote_requests.view", "quote_requests.manage", "quotations.view", "quotations.create", "quotations.update", "quotations.approve", "quotations.issue", "quotations.convert", "quotations.manage",
  "sales.view", "sales.create", "sales.update", "sales.confirm", "sales.cancel", "sales.reserve", "sales.fulfil", "sales.returns", "sales.backorders.manage",
  "payments.view", "payments.receive", "payments.record", "payments.allocate", "payments.reverse", "payments.mpesa.reconcile", "receipts.issue", "receipts.void",
  "deliveries.view", "deliveries.create", "deliveries.dispatch", "deliveries.complete", "deliveries.return", "delivery_notes.issue", "deliveries.manage",
  "billing.view", "invoices.create", "invoices.update", "invoices.approve", "invoices.issue", "credit_debit_notes.create", "credit_debit_notes.approve",
  "fiscalization.view", "fiscalization.prepare", "fiscalization.approve", "fiscalization.submit", "fiscalization.retry", "fiscalization.reconcile", "fiscalization.configure", "fiscalization.payloads.view",
  "documents.view", "documents.generate", "documents.sign", "documents.issue", "documents.supersede", "documents.revoke", "documents.signing.configure",
  "purchases.view", "purchases.manage", "suppliers.view", "suppliers.manage", "supplier_payments.manage",
  "service.view",
  "service.equipment.view", "service.equipment.create", "service.equipment.update", "service.equipment.archive", "service.equipment.transfer", "service.equipment.protected.view",
  "service.tickets.view_all", "service.tickets.view_assigned", "service.tickets.create", "service.tickets.triage", "service.tickets.assign", "service.tickets.update", "service.tickets.work", "service.tickets.resolve", "service.tickets.close", "service.tickets.reopen", "service.tickets.cancel", "service.tickets.private_notes",
  "service.sla.view", "service.sla.manage", "service.sla.override", "service.sla.pause_resume", "service.sla.resolve_breach",
  "service.stock.request", "service.stock.approve", "service.stock.reserve", "service.stock.issue", "service.stock.return", "service.stock.cost.view",
  "service.installations.view", "service.installations.create", "service.installations.assign", "service.installations.complete", "service.installations.certificate.approve",
  "service.maintenance.view", "service.maintenance.plans.create", "service.maintenance.schedule", "service.maintenance.complete", "service.maintenance.defer", "service.maintenance.report.approve",
  "service.warranties.view", "service.warranties.manage", "service.warranties.claims.create", "service.warranties.eligibility.assess", "service.warranties.approve_reject", "service.warranties.override", "service.warranties.replacement.complete",
  "service.contracts.view", "service.contracts.create", "service.contracts.update", "service.contracts.approve", "service.contracts.activate", "service.contracts.suspend", "service.contracts.terminate", "service.contracts.renew", "service.contracts.pricing.view", "service.contracts.entitlements.manage",
  "service.mps.view", "service.mps.manage", "service.meter_readings.record", "service.meter_readings.validate", "service.meter_readings.correct", "service.mps.billing.generate", "service.mps.consumables.issue",
  "service.loan_units.view", "service.loan_units.reserve", "service.loan_units.issue", "service.loan_units.receive", "service.loan_units.inspect", "service.loan_units.damage", "service.loan_units.retire",
  "service.documents.view", "service.documents.generate", "service.documents.approve", "service.documents.issue", "service.documents.supersede", "service.documents.revoke",
  "service.tickets.manage", "service.assign", "service.resolve", "service.contracts.manage",
  "expenses.view", "expenses.create", "expenses.update", "expenses.submit", "expenses.approve", "expenses.reject", "expenses.post", "expenses.pay", "expenses.reverse", "expenses.categories.manage", "expenses.recurring.manage", "expenses.attachments.view",
  "accounting.view", "accounting.post", "accounting.reconcile", "accounting.reports.view",
  "accounting.transactions.view", "accounting.accounts.view", "accounting.accounts.manage", "accounting.periods.view", "accounting.periods.close", "accounting.periods.reopen", "accounting.periods.manage", "accounting.posting_rules.manage", "accounting.source_events.manage",
  "accounting.journals.view", "accounting.journals.create", "accounting.journals.submit", "accounting.journals.approve", "accounting.journals.post", "accounting.journals.reverse", "accounting.journals.self_approve", "accounting.journals.attachments.view",
  "accounting.debtors.view", "accounting.creditors.view", "accounting.collections.manage", "accounting.adjustments.approve", "accounting.protected_party.view",
  "reports.operational.view", "reports.financial.view", "reports.costs.view", "reports.profit.view", "reports.tax.view", "reports.audit.view", "reports.export", "reports.issue_signed",
  "fixed_assets.view", "fixed_assets.create", "fixed_assets.update", "fixed_assets.approve", "fixed_assets.depreciation.post", "fixed_assets.dispose", "fixed_assets.archive",
  "users.view", "users.manage", "users.invite", "users.suspend", "users.sessions.revoke",
  "roles.view", "roles.manage", "roles.privileged.assign",
  "branches.view", "branches.manage", "branches.cross_scope",
  "sales_team.view", "sales_team.manage",
  "compliance.view", "compliance.manage", "compliance.sensitive.view", "compliance.share",
  "audit.view", "audit.export",
  "notices.view", "notices.manage", "notices.acknowledge",
  "settings.view", "settings.manage", "settings.business.manage", "settings.branding.manage",
  "settings.payments.manage", "settings.tax.manage", "settings.sms.manage", "settings.integrations.manage",
  "settings.mpesa.manage", "settings.etims.manage", "settings.signing.manage", "settings.security.manage",
  "settings.notifications.manage", "settings.templates.manage", "settings.legal.manage", "settings.feature_flags.manage",
  "help.view", "help.diagnostics.view", "signing.configure"
];

const readOnlyPermissions: PermissionKey[] = allPermissions.filter((permission) => permission.endsWith(".view") || permission === "audit.view" || permission === "products.cost_price.view");

export const rolePermissions: Record<BusinessRole, PermissionKey[]> = {
  super_administrator: allPermissions,
  administrator_operations: allPermissions.filter((permission) => !["fiscalization.configure", "settings.etims.manage", "signing.configure", "settings.signing.manage", "users.sessions.revoke", "roles.privileged.assign"].includes(permission)),
  inventory_stores: [
    "dashboard.view", "products.view", "products.create", "products.update", "products.archive", "products.import", "categories.view", "categories.manage", "brands.view",
    "inventory.view", "inventory.adjust", "inventory.transfer", "inventory.stock_take", "inventory.reconcile", "inventory.serials.manage", "inventory.locations.manage",
    "purchases.view", "suppliers.view", "audit.view"
  ],
  sales: [
    "dashboard.view", "products.view", "categories.view", "brands.view", "storefront.view",
    "sales.view", "sales.create", "sales.update", "sales.confirm", "sales.reserve", "sales.fulfil", "sales.backorders.manage",
    "quote_requests.view", "quote_requests.manage", "quotations.view", "quotations.create", "quotations.update", "quotations.issue", "quotations.convert", "quotations.manage",
    "customers.view", "customers.manage", "customers.create", "customers.update", "customers.archive", "customers.categories.manage", "customers.statements.view",
    "payments.view", "payments.receive", "payments.record", "payments.allocate",
    "deliveries.view", "deliveries.create", "deliveries.dispatch", "deliveries.complete", "delivery_notes.issue", "deliveries.manage",
    "fiscalization.view", "documents.view", "documents.generate", "documents.issue"
  ],
  procurement: [
    "dashboard.view", "products.view", "products.cost_price.view", "categories.view", "brands.view", "inventory.view", "purchases.view", "purchases.manage",
    "suppliers.view", "suppliers.manage", "supplier_payments.manage", "audit.view"
  ],
  finance: [
    "dashboard.view", "products.view", "products.cost_price.view", "sales.view", "customers.view", "customers.tax.view",
    "payments.view", "payments.receive", "payments.record", "payments.allocate", "payments.reverse", "payments.mpesa.reconcile", "receipts.issue", "receipts.void",
    "billing.view", "invoices.create", "invoices.update", "invoices.approve", "invoices.issue", "credit_debit_notes.create", "credit_debit_notes.approve",
    "fiscalization.view", "fiscalization.prepare", "fiscalization.approve", "fiscalization.submit", "fiscalization.retry", "fiscalization.reconcile", "fiscalization.payloads.view", "purchases.view", "supplier_payments.manage",
    "expenses.view", "expenses.create", "expenses.update", "expenses.submit", "expenses.approve", "expenses.reject", "expenses.post", "expenses.pay", "expenses.reverse", "expenses.categories.manage", "expenses.recurring.manage", "expenses.attachments.view",
    "accounting.view", "accounting.post", "accounting.reconcile", "accounting.reports.view", "accounting.transactions.view", "accounting.accounts.view", "accounting.accounts.manage", "accounting.periods.view", "accounting.periods.close", "accounting.periods.reopen", "accounting.periods.manage", "accounting.posting_rules.manage", "accounting.source_events.manage", "accounting.journals.view", "accounting.journals.create", "accounting.journals.submit", "accounting.journals.approve", "accounting.journals.post", "accounting.journals.reverse", "accounting.journals.self_approve", "accounting.journals.attachments.view", "accounting.debtors.view", "accounting.creditors.view", "accounting.collections.manage", "accounting.adjustments.approve", "accounting.protected_party.view",
    "reports.operational.view", "reports.financial.view", "reports.costs.view", "reports.profit.view", "reports.tax.view", "reports.audit.view", "reports.export", "reports.issue_signed",
    "fixed_assets.view", "fixed_assets.create", "fixed_assets.update", "fixed_assets.approve", "fixed_assets.depreciation.post", "fixed_assets.dispose", "fixed_assets.archive",
    "settings.payments.manage", "settings.tax.manage", "audit.view"
  ],
  service_manager: allPermissions.filter((permission) => permission.startsWith("service.") || [
    "dashboard.view", "products.view", "inventory.view", "customers.view", "customers.manage", "documents.view", "documents.generate", "documents.issue", "notices.view", "audit.view"
  ].includes(permission)),
  technician: [
    "dashboard.view", "products.view", "inventory.view", "customers.view", "service.view",
    "service.equipment.view", "service.tickets.view_assigned", "service.tickets.work", "service.tickets.resolve",
    "service.sla.view", "service.stock.request", "service.installations.view", "service.maintenance.view",
    "service.meter_readings.record", "service.loan_units.view", "service.documents.view", "service.documents.generate",
    "service.tickets.manage", "service.resolve"
  ],
  branch_manager: [
    "dashboard.view", "products.view", "categories.view", "brands.view", "inventory.view", "inventory.adjust",
    "sales.view", "sales.create", "sales.update", "sales.confirm", "sales.reserve", "sales.fulfil", "quotations.manage",
    "quote_requests.view", "quotations.view", "quotations.create", "quotations.update", "quotations.issue", "quotations.convert",
    "customers.view", "customers.manage", "customers.create", "customers.update", "customers.archive", "payments.receive", "payments.view", "payments.record", "payments.allocate",
    "deliveries.view", "deliveries.create", "deliveries.dispatch", "deliveries.complete", "deliveries.manage", "service.view", "service.equipment.view", "service.tickets.view_all", "service.installations.view", "service.maintenance.view",
    "branches.view", "sales_team.view", "notices.view", "audit.view"
  ],
  auditor_read_only: readOnlyPermissions
};

export const legacyRoleMapping: Record<ProfileRole, BusinessRole | null> = {
  customer: null,
  admin: "super_administrator",
  owner: "super_administrator",
  manager: "administrator_operations",
  sales: "sales",
  store: "inventory_stores"
};

export const permissionGroups = [
  ["Dashboard", ["dashboard.view"]],
  ["Catalogue", ["products.view", "products.create", "products.update", "products.archive", "products.publish", "products.feature", "products.import", "products.cost_price.view", "categories.view", "categories.manage", "brands.view", "brands.manage"]],
  ["Storefront", ["storefront.view", "storefront.banners.manage", "storefront.homepage.manage", "storefront.featured.manage", "storefront.visibility.manage"]],
  ["Inventory", ["inventory.view", "inventory.adjust", "inventory.transfer", "inventory.stock_take", "inventory.reconcile", "inventory.serials.manage", "inventory.locations.manage"]],
  ["Sales and Customers", ["sales.view", "sales.create", "sales.update", "sales.confirm", "sales.cancel", "sales.reserve", "sales.fulfil", "sales.returns", "sales.backorders.manage", "quote_requests.view", "quote_requests.manage", "quotations.view", "quotations.create", "quotations.update", "quotations.approve", "quotations.issue", "quotations.convert", "quotations.manage", "customers.view", "customers.manage", "customers.create", "customers.update", "customers.archive", "customers.tax.view", "customers.categories.manage", "customers.statements.view", "payments.view", "payments.receive", "payments.record", "payments.allocate", "payments.reverse", "payments.mpesa.reconcile", "receipts.issue", "receipts.void", "deliveries.view", "deliveries.create", "deliveries.dispatch", "deliveries.complete", "deliveries.return", "delivery_notes.issue", "deliveries.manage"]],
  ["Fiscalization", ["fiscalization.view", "fiscalization.prepare", "fiscalization.approve", "fiscalization.submit", "fiscalization.retry", "fiscalization.reconcile", "fiscalization.configure"]],
  ["Purchasing", ["purchases.view", "purchases.manage", "suppliers.view", "suppliers.manage", "supplier_payments.manage"]],
  ["Service", allPermissions.filter((permission) => permission.startsWith("service."))],
  ["Expenses", ["expenses.view", "expenses.create", "expenses.update", "expenses.submit", "expenses.approve", "expenses.reject", "expenses.post", "expenses.pay", "expenses.reverse", "expenses.categories.manage", "expenses.recurring.manage", "expenses.attachments.view"]],
  ["Accounting", ["accounting.view", "accounting.post", "accounting.reconcile", "accounting.reports.view", "accounting.transactions.view", "accounting.accounts.view", "accounting.accounts.manage", "accounting.periods.view", "accounting.periods.close", "accounting.periods.reopen", "accounting.periods.manage", "accounting.posting_rules.manage", "accounting.source_events.manage", "accounting.journals.view", "accounting.journals.create", "accounting.journals.submit", "accounting.journals.approve", "accounting.journals.post", "accounting.journals.reverse", "accounting.journals.self_approve", "accounting.journals.attachments.view", "accounting.debtors.view", "accounting.creditors.view", "accounting.collections.manage", "accounting.adjustments.approve", "accounting.protected_party.view"]],
  ["Reports", ["reports.operational.view", "reports.financial.view", "reports.costs.view", "reports.profit.view", "reports.tax.view", "reports.audit.view", "reports.export", "reports.issue_signed"]],
  ["Fixed Assets", ["fixed_assets.view", "fixed_assets.create", "fixed_assets.update", "fixed_assets.approve", "fixed_assets.depreciation.post", "fixed_assets.dispose", "fixed_assets.archive"]],
  ["Administration", ["users.view", "users.manage", "users.invite", "users.suspend", "users.sessions.revoke", "roles.view", "roles.manage", "roles.privileged.assign", "branches.view", "branches.manage", "branches.cross_scope", "sales_team.view", "sales_team.manage", "compliance.view", "compliance.manage", "compliance.sensitive.view", "compliance.share", "audit.view", "audit.export", "notices.view", "notices.manage", "notices.acknowledge"]],
  ["Settings", ["settings.view", "settings.manage", "settings.business.manage", "settings.branding.manage", "settings.payments.manage", "settings.tax.manage", "settings.sms.manage", "settings.integrations.manage", "settings.mpesa.manage", "settings.etims.manage", "settings.signing.manage", "settings.security.manage", "settings.notifications.manage", "settings.templates.manage", "settings.legal.manage", "settings.feature_flags.manage", "help.view", "help.diagnostics.view", "signing.configure"]]
] satisfies Array<[string, PermissionKey[]]>;

export function canSeeCost(permissions: PermissionKey[] = allPermissions) {
  return permissions.includes("products.cost_price.view");
}

export function canEditCost(permissions: PermissionKey[] = allPermissions) {
  return permissions.includes("products.update") && permissions.includes("products.cost_price.view");
}

export function canEditPrice(permissions: PermissionKey[] = allPermissions) {
  return permissions.includes("products.update");
}

export function canEditStock(permissions: PermissionKey[] = allPermissions) {
  return permissions.includes("inventory.adjust");
}
