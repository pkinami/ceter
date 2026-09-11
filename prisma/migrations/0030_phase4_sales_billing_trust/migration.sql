-- Phase 4 additive sales, billing, delivery, payment-allocation and document-trust fields.

ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "order_number" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'storefront',
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "fulfilment_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "delivery_status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS "fiscalization_status" TEXT NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS "salesperson_id" UUID,
  ADD COLUMN IF NOT EXISTS "inventory_location_id" UUID,
  ADD COLUMN IF NOT EXISTS "confirmed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "reservation_key" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "orders"("order_number") WHERE "order_number" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "orders_source_idx" ON "orders"("source");
CREATE INDEX IF NOT EXISTS "orders_payment_status_idx" ON "orders"("payment_status");
CREATE INDEX IF NOT EXISTS "orders_fulfilment_status_idx" ON "orders"("fulfilment_status");
CREATE INDEX IF NOT EXISTS "orders_delivery_status_idx" ON "orders"("delivery_status");
CREATE INDEX IF NOT EXISTS "orders_fiscalization_status_idx" ON "orders"("fiscalization_status");

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "reserved_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fulfilled_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "backordered_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "reservation_key" TEXT;

ALTER TABLE "quote_requests"
  ADD COLUMN IF NOT EXISTS "assigned_to_id" UUID,
  ADD COLUMN IF NOT EXISTS "related_quote_id" UUID,
  ADD COLUMN IF NOT EXISTS "internal_status" TEXT NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'storefront',
  ADD COLUMN IF NOT EXISTS "internal_notes" TEXT,
  ADD COLUMN IF NOT EXISTS "status_history" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "converted_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "converted_by_id" UUID;

CREATE INDEX IF NOT EXISTS "quote_requests_internal_status_idx" ON "quote_requests"("internal_status");
CREATE INDEX IF NOT EXISTS "quote_requests_related_quote_id_idx" ON "quote_requests"("related_quote_id");

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "customer_number" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_exemption_number" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_information_status" TEXT NOT NULL DEFAULT 'not_verified',
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX IF NOT EXISTS "customers_customer_number_key" ON "customers"("customer_number") WHERE "customer_number" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "customers_customer_number_idx" ON "customers"("customer_number");
CREATE INDEX IF NOT EXISTS "customers_archived_at_idx" ON "customers"("archived_at");

ALTER TABLE "customer_categories"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_categories_code_key" ON "customer_categories"("code") WHERE "code" IS NOT NULL;

ALTER TABLE "quotes"
  ADD COLUMN IF NOT EXISTS "related_quote_request_id" UUID,
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "issue_date" DATE,
  ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "approved_by_id" UUID,
  ADD COLUMN IF NOT EXISTS "converted_order_id" UUID;

CREATE INDEX IF NOT EXISTS "quotes_related_quote_request_id_idx" ON "quotes"("related_quote_request_id");
CREATE INDEX IF NOT EXISTS "quotes_converted_order_id_idx" ON "quotes"("converted_order_id");

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "invoice_type" TEXT NOT NULL DEFAULT 'tax_invoice',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS "fiscalization_status" TEXT NOT NULL DEFAULT 'not_ready',
  ADD COLUMN IF NOT EXISTS "document_status" TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "frozen_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "issued_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "issue_idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "source_order_id" UUID;

CREATE UNIQUE INDEX IF NOT EXISTS "invoices_issue_idempotency_key_key" ON "invoices"("issue_idempotency_key") WHERE "issue_idempotency_key" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "invoices_invoice_type_idx" ON "invoices"("invoice_type");
CREATE INDEX IF NOT EXISTS "invoices_payment_status_idx" ON "invoices"("payment_status");
CREATE INDEX IF NOT EXISTS "invoices_fiscalization_status_idx" ON "invoices"("fiscalization_status");
CREATE INDEX IF NOT EXISTS "invoices_document_status_idx" ON "invoices"("document_status");
CREATE INDEX IF NOT EXISTS "invoices_source_order_id_idx" ON "invoices"("source_order_id");

ALTER TABLE "payments"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'KES',
  ADD COLUMN IF NOT EXISTS "unallocated_kes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "external_reference_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "reversed_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "reversal_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "reversed_by_id" UUID;

CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_external_reference_hash_idx" ON "payments"("external_reference_hash");

CREATE TABLE IF NOT EXISTS "payment_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "amount_kes" INTEGER NOT NULL,
  "allocated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "correlation_id" TEXT NOT NULL,
  "reversed_at" TIMESTAMPTZ(6),
  "reversal_reason" TEXT,
  CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "payment_allocations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_allocations_payment_id_invoice_id_correlation_id_key" ON "payment_allocations"("payment_id", "invoice_id", "correlation_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_invoice_id_idx" ON "payment_allocations"("invoice_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_customer_id_idx" ON "payment_allocations"("customer_id");

CREATE TABLE IF NOT EXISTS "payment_reversals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "amount_kes" INTEGER NOT NULL,
  "reversed_by_id" UUID,
  "correlation_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_reversals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_reversals_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_reversals_correlation_id_key" ON "payment_reversals"("correlation_id");
CREATE INDEX IF NOT EXISTS "payment_reversals_payment_id_idx" ON "payment_reversals"("payment_id");

ALTER TABLE "receipts"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'issued',
  ADD COLUMN IF NOT EXISTS "verification_status" TEXT NOT NULL DEFAULT 'not_issued';

CREATE TABLE IF NOT EXISTS "deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "delivery_number" TEXT NOT NULL,
  "order_id" UUID NOT NULL,
  "invoice_id" UUID,
  "customer_id" UUID,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "delivery_method" TEXT NOT NULL DEFAULT 'delivery',
  "scheduled_date" DATE,
  "delivery_address_snapshot" JSONB,
  "contact_snapshot" JSONB,
  "dispatch_time" TIMESTAMPTZ(6),
  "delivered_time" TIMESTAMPTZ(6),
  "delivered_by" TEXT,
  "received_by" TEXT,
  "acknowledgement" TEXT,
  "notes" TEXT,
  "correlation_id" TEXT NOT NULL,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "deliveries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "deliveries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "deliveries_delivery_number_key" ON "deliveries"("delivery_number");
CREATE UNIQUE INDEX IF NOT EXISTS "deliveries_correlation_id_key" ON "deliveries"("correlation_id");
CREATE INDEX IF NOT EXISTS "deliveries_order_id_idx" ON "deliveries"("order_id");
CREATE INDEX IF NOT EXISTS "deliveries_invoice_id_idx" ON "deliveries"("invoice_id");
CREATE INDEX IF NOT EXISTS "deliveries_customer_id_idx" ON "deliveries"("customer_id");
CREATE INDEX IF NOT EXISTS "deliveries_status_idx" ON "deliveries"("status");

CREATE TABLE IF NOT EXISTS "delivery_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "delivery_id" UUID NOT NULL,
  "order_item_id" UUID,
  "product_id" UUID,
  "description" TEXT NOT NULL,
  "ordered_quantity" DECIMAL(18,3) NOT NULL,
  "previous_delivered_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "delivery_quantity" DECIMAL(18,3) NOT NULL,
  "serial_numbers" JSONB NOT NULL DEFAULT '[]',
  CONSTRAINT "delivery_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "delivery_lines_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "delivery_lines_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "delivery_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "delivery_lines_delivery_id_idx" ON "delivery_lines"("delivery_id");
CREATE INDEX IF NOT EXISTS "delivery_lines_order_item_id_idx" ON "delivery_lines"("order_item_id");
CREATE INDEX IF NOT EXISTS "delivery_lines_product_id_idx" ON "delivery_lines"("product_id");

CREATE TABLE IF NOT EXISTS "sales_backorders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "order_id" UUID NOT NULL,
  "order_item_id" UUID NOT NULL,
  "customer_id" UUID,
  "product_id" UUID NOT NULL,
  "location_id" UUID,
  "requested_quantity" DECIMAL(18,3) NOT NULL,
  "allocated_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "cancelled_quantity" DECIMAL(18,3) NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'open',
  "source_receipt_id" UUID,
  "correlation_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sales_backorders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sales_backorders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "sales_backorders_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "sales_backorders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT "sales_backorders_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "sales_backorders_correlation_id_key" ON "sales_backorders"("correlation_id");
CREATE INDEX IF NOT EXISTS "sales_backorders_order_id_idx" ON "sales_backorders"("order_id");
CREATE INDEX IF NOT EXISTS "sales_backorders_order_item_id_idx" ON "sales_backorders"("order_item_id");
CREATE INDEX IF NOT EXISTS "sales_backorders_customer_id_idx" ON "sales_backorders"("customer_id");
CREATE INDEX IF NOT EXISTS "sales_backorders_product_id_idx" ON "sales_backorders"("product_id");
CREATE INDEX IF NOT EXISTS "sales_backorders_status_idx" ON "sales_backorders"("status");

ALTER TABLE "documents"
  ADD COLUMN IF NOT EXISTS "operational_barcode" TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documents_delivery_id_fkey'
  ) THEN
    ALTER TABLE "documents" ADD CONSTRAINT "documents_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "documents_delivery_id_idx" ON "documents"("delivery_id");
