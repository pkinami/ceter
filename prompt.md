codex exec "Continue building Ceter Business Suite from the already completed Phase 1 foundation.

IMPORTANT:
Phase 1 already exists and is working:
- /admin/business exists
- Customers
- Quotations
- Pro-forma invoices
- Sales invoices
- Payments
- Receipts
- Expenses
- Documents
- Basic accounting transactions
- Dashboard

DO NOT rebuild Phase 1.
DO NOT duplicate existing tables.
First inspect the existing Prisma schema, migrations, business actions, and UI structure.

Your task is to implement the remaining Business Suite phases together as one complete ERP system so integration issues are discovered early.

Before coding:
1. Study the current application architecture.
2. Review existing Prisma models.
3. Review existing ecommerce relationships:
   - products
   - categories
   - orders
   - customers
   - profiles
   - inventory
4. Research Kenyan business workflows:
   - KRA eTIMS requirements
   - VAT workflow
   - PAYE preparation
   - NSSF
   - SHA/SHIF
   - Affordable Housing Levy
   - NITA
   - Kenyan procurement/tender workflow
   - supplier purchasing workflows
5. Design the database expansion before implementation.

Do not create unnecessary complexity.
The business is currently small:
- keep one admin owner model
- no multi-user roles yet
- design tables so roles can be added later.

==================================================

PHASE 2 — PROCUREMENT, SUPPLIERS AND INVENTORY ACCOUNTING
==================================================

Build supplier and purchasing management.

Create:

Suppliers:
- company name
- contact person
- phone
- email
- address
- KRA PIN
- notes
- documents

Supplier workflow:

Purchase Request
↓
Purchase Order
↓
Goods Received Note
↓
Supplier Invoice
↓
Supplier Payment


Implement:

Purchase Orders:
- supplier
- products
- quantities
- prices
- expected delivery date
- status

Statuses:

Draft
Sent
Confirmed
Partially Received
Completed
Cancelled


Goods Received Notes:

When goods arrive:

- increase stock
- create stock movement
- link supplier
- record delivery date


Supplier invoices:

Track:

- amount
- due date
- payment status
- supplier balance


Inventory accounting:

Connect purchases with existing products.

Track:

- stock received
- stock sold
- stock adjustments
- stock value
- low stock alerts
- reorder levels


Do not create a second inventory system.
Extend the existing catalogue/inventory system.

==================================================

PHASE 3 — ADVANCED ACCOUNTING FOUNDATION
==================================================

Expand the accounting engine.

Create:

Chart of Accounts:

Examples:

Assets:
- Cash
- Bank
- Inventory
- Customer Receivables

Liabilities:
- Supplier Payables
- Taxes Payable

Income:
- Product Sales
- Service Income

Expenses:
- Transport
- Salaries
- Rent
- Marketing


Implement:

General Ledger

Every transaction should create accounting entries:

Sales invoice:

Debit:
Customer Receivable

Credit:
Sales


Payment:

Debit:
Bank/Cash

Credit:
Customer Receivable


Expense:

Debit:
Expense Account

Credit:
Cash/Bank


Create reports:

- Trial Balance
- General Ledger
- Profit and Loss
- Balance Sheet
- Cash Flow


Keep accounting automatic.
Users should not manually create journal entries unless necessary.

==================================================

PHASE 4 — KENYAN TAX AND COMPLIANCE PREPARATION
==================================================

Create a Compliance module.

Purpose:
Prepare Ceter for Kenyan tax automation.

Create:

Tax dashboard:

Track:

VAT

- Output VAT
- Input VAT
- VAT payable estimate
- VAT periods


PAYE preparation:

Employee payroll structure only.

Prepare:

- employee records
- salaries
- PAYE calculations
- deductions


Statutory tracking:

Create configurable records for:

- KRA
- VAT
- PAYE
- NSSF
- SHA/SHIF
- Affordable Housing Levy
- NITA


Do NOT hard-code changing government rates.

Store rates in configurable settings.

Create:

Compliance Calendar:

Examples:

VAT deadline
PAYE deadline
Licence expiry
Tax compliance certificate expiry


==================================================

PHASE 5 — eTIMS PREPARATION
==================================================

Prepare architecture for KRA eTIMS integration.

Do not fake integration.

Create:

ETIMS module:

- invoice submission status
- control number field
- QR/reference field
- submission logs
- errors
- retry status


Every invoice should have future eTIMS fields:

- submission status
- external invoice ID
- verification information


Create integration layer so official KRA API can be connected later.

Do not claim certification.
Do not bypass KRA systems.

==================================================

PHASE 6 — TENDER MANAGEMENT SYSTEM
==================================================

Build Ceter Tender Assistant.

Purpose:

Help Ceter prepare government and corporate tenders.

Create:

Tender database:

Fields:

- tender title
- organization
- tender number
- closing date
- tender value
- status


Statuses:

New
Reviewing
Preparing
Submitted
Won
Lost
Cancelled


Tender workspace:

Allow uploading:

- tender documents
- requirements
- compliance documents
- technical documents
- pricing schedules


Create compliance checklist:

Examples:

Company documents:

- Certificate of Incorporation
- KRA PIN
- Tax Compliance Certificate
- CR12
- Company Profile
- Manufacturer Authorization
- Previous contracts


Create document expiry alerts.


Tender preparation:

Allow:

- product matching
- pricing preparation
- technical response notes
- submission checklist


Do NOT automate final government submission.
Keep human approval before submission.

==================================================

PHASE 7 — BUSINESS DASHBOARD
==================================================

Upgrade the business dashboard.

Include:

Sales:
- revenue
- invoices
- unpaid balances

Inventory:
- stock value
- low stock

Finance:
- profit
- expenses
- cash position

Compliance:
- upcoming deadlines

Tender:
- active tenders
- closing soon


==================================================

PHASE 8 — DOCUMENT MANAGEMENT
==================================================

Create a proper company document vault.

Categories:

Company documents

Tax documents

Tender documents

Supplier documents

Customer documents

Contracts


Features:

- upload
- preview
- expiry date
- reminders
- search


Use Supabase Storage.

==================================================

PHASE 9 — PROFESSIONAL DOCUMENT DESIGN SYSTEM
==================================================

Create a reusable Ceter branded document generation system.

All business documents must use a consistent professional template.

Documents include:

- Quotations
- Pro-forma invoices
- Sales invoices
- Receipts
- Delivery notes
- Purchase orders
- Supplier invoices
- Customer statements
- Expense reports
- Financial reports
- Tax reports
- Tender documents


Create a centralized document template engine.

Do not create separate random PDF designs for each document type.

All documents must follow the Ceter Technologies Limited corporate identity.

HEADER:

Include:

- Ceter Technologies Limited logo
- Company name
- Physical/contact details when available
- Email
- Phone
- Website
- Tax PIN field
- Document title
- Document number
- Issue date
- Due date where applicable


BODY DESIGN:

Professional tables:

- Item number
- Product/service description
- SKU where available
- Quantity
- Unit price
- Discount
- VAT
- Line total


SUMMARY SECTION:

Show clearly:

Subtotal

VAT

Discount

Delivery fee

Grand total


PAYMENT SECTION:

Include:

- Payment methods
- Bank details
- M-Pesa payment instructions
- Payment terms


CUSTOMER SECTION:

Display:

Customer name

Company name

Contact information

Delivery information


FOOTER:

Include:

- Ceter Technologies Limited branding
- Terms and conditions
- Warranty information where applicable
- Thank you message
- Page numbers


VISUAL QUALITY:

Documents must look like professional commercial documents:

- Clean spacing
- Proper typography
- Consistent colors matching Ceter website
- Professional tables
- Good alignment
- Print friendly
- A4 optimized
- Mobile PDF viewing friendly


REPORT DESIGN:

Financial reports must include:

- Company header
- Reporting period
- Generated date
- Summary cards
- Tables
- Totals
- Page numbers


CUSTOMER EXPERIENCE:

Customers receiving quotations, invoices, and receipts should immediately recognize them as official Ceter Technologies Limited documents.

Documents should not look like developer-generated PDFs.

==================================================

==================================================

DATABASE REQUIREMENTS
==================================================

Use Prisma migrations only.

Before creating tables:
inspect existing Phase 1 models.

Create only missing models.

Possible new tables:

suppliers

purchase_orders

purchase_order_items

goods_received_notes

supplier_invoices

supplier_payments

stock_movements_extension

accounts

journal_entries

journal_lines

tax_records

compliance_items

etims_records

tenders

tender_documents

tender_requirements

company_documents


Maintain relationships correctly.

==================================================

UI REQUIREMENTS
==================================================

All admin pages must:

- match Ceter design system
- no browser default styling
- have loading states
- have success/error messages
- have empty states
- have edit/delete actions
- avoid dead ends


==================================================

TESTING
==================================================

After implementation:

Perform internal workflow tests using temporary TEST-CODEX data only.

Test:

Supplier
→ Purchase Order
→ Goods Received
→ Stock Update


Customer
→ Quote
→ Invoice
→ Payment
→ Receipt


Expense
→ Accounting Entry


Tender
→ Upload documents
→ Compliance checklist


Verify database relationships.

Clean all TEST-CODEX data after testing.


Run:

npm run lint

npx tsc --noEmit

npx prisma validate

npx prisma generate

npm run build

npx prisma migrate status


Final report must include:

1. Files changed
2. Database migrations created
3. New features implemented
4. Tests performed
5. Remaining limitations
6. Any manual setup required

Do not modify existing real customers, products, orders, invoices or catalogue data."