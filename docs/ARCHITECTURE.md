# Architecture

## Application Shape

Ceter Technologies is a Next.js application with Prisma, PostgreSQL, Supabase Storage and admin/server-action workflows. Public storefront routes and authenticated admin routes share product, customer, order, payment, document and inventory data through the Prisma schema.

## Data Ownership

Authoritative shared tables include products, categories, brands, banners, homepage sections, customers, orders, quote requests, quotes, invoices, payments, receipts, stock movements, stock transfers, stock takes, serial numbers, suppliers, purchase orders, goods received notes, supplier invoices, supplier payments, expenses, accounts, journals, tax records, eTIMS records, M-Pesa transactions, documents, tenders, company documents, notifications and audit logs.

Migrations are additive and must not delete or truncate authoritative records. Applied Prisma migrations must be preserved.

## Inventory

Authoritative stock is the sum of posted immutable `InventoryMovement` rows per product and location, materialized transactionally into `InventoryBalance`. `Product.stock_quantity` remains a storefront/backward-compatibility mirror of audited on-hand balance and must be updated only in the same transaction that posts an inventory movement.

Posted movements are never edited or deleted. Corrections use explicit reversing or variance movements. Duplicate source posting is prevented by source document/type/line/product/location uniqueness. Negative stock is rejected unless a posting service explicitly opts into a controlled exception.

Movement types include opening balance, purchase receipt, sale issue, customer return, supplier return, adjustment, transfer, stock-take variance, reservation, reservation release, backorder allocation, cancellation reversal, loan-unit issue and loan-unit return.

## Sales, Billing And Documents

Orders keep storefront compatibility while tracking independent payment, fulfilment, delivery, fiscalization and reservation state. Deliveries preserve delivery lifecycle and serial-number payloads without rewriting customer address history. Invoices, payments, allocations, reversals, receipts and documents retain lifecycle metadata and immutable issued-document references.

## Service

Customer equipment, service tickets, assignments, SLA policies, work logs, parts, contracts, warranties, installations, maintenance, MPS agreements, meter readings, billing cycles, loan units and customer acknowledgements are represented as explicit operational records. Customer acknowledgement is not a cryptographic signature.

## Accounting And Reporting

Accounting uses a double-entry ledger built around `Account`, `JournalEntry` and `JournalLine`. Existing invoices, payments, supplier invoices, supplier payments, expenses, inventory movements, service/MPS records and fiscalization records remain operational sources. Accounting entries link back to those sources and do not rewrite their legal or operational state.

Reports use authoritative operational and accounting data:

- Inventory reports use `InventoryMovement` and `InventoryBalance`.
- Sales reports use issued or eligible invoices and related invoice lines.
- Customer balances use invoices, credits and real payment allocations.
- Creditor reports use supplier invoices, purchase returns/credits and supplier payments.
- Service and MPS reports use service and meter snapshots.
- eTIMS and tax reports count only official accepted provider responses as accepted.
- Audit reports use immutable audit-log records with secret redaction.

## Legacy Names
