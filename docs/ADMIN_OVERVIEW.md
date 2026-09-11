# Admin Overview

Ceter admin is a production operations workspace for catalogue, storefront, customers, sales, purchasing, inventory, service, finance, reporting, settings, users and compliance work.

## Roles And Permissions

Server-side RBAC is centralized in `lib/admin/roles.ts` and `lib/admin/auth.ts`. Browser-supplied roles or permission values are not trusted for page access, server actions or import APIs.

Business roles:

- Super Administrator
- Administrator / Operations
- Inventory / Stores
- Sales
- Procurement
- Finance
- Service Manager
- Technician
- Branch Manager
- Auditor / Read-only

Legacy `Profile.role` values remain for compatibility:

- `admin` and `owner` map to Super Administrator.
- `manager` maps to Administrator / Operations.
- `sales` maps to Sales.
- `store` maps to Inventory / Stores.
- `customer` has no admin access.

Important enforcement points:

- Admin navigation and quick actions hide inaccessible modules.
- Product list, create, detail and edit pages require catalogue permissions.
- Cost price values are hidden from roles without cost-price permission.
- User, role, activity, import, category, brand, banner, homepage and product mutation actions require dedicated permissions.
- Inventory stock changes must go through audited inventory actions, not product catalogue edits.
- Finance, sales, service and technician roles do not receive security, signing, production eTIMS or payment-reversal configuration privileges by default.

## Admin Areas

Current admin routes cover:

- Dashboard, activity, help and notices
- Products, categories, brands, banners and homepage content
- Customers, customer categories, statements and equipment
- Quote requests, quotations, sales orders, invoices, receipts, payments and deliveries
- Inventory locations, movements, transfers, adjustments, stock takes, serial numbers, low stock and reconciliation
- Suppliers, purchases, goods receipts, returns and supplier payments
- Service tickets, contracts, maintenance, warranties, MPS, loan units and service documents
- Expenses, accounting, journals, periods, reconciliation and reports
- Users, invitations, roles, branches, sales team, compliance and settings

## Administration Safeguards

- Invitation tokens are hashed, expire and are single use.
- The final Super Administrator cannot be removed silently.
- Unknown permission keys are rejected.
- Secrets are redacted before display.
- Webhook URLs are validated to reduce SSRF risk.
- Template variables are allowlisted and sanitized.
- Feature flags and integration settings are controlled by configuration.

Apply production account hygiene changes only with a reviewed operating procedure and an explicit allowlist.
