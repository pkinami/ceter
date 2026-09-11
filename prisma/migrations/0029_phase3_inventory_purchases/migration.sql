DO $$ BEGIN
  CREATE TYPE "public"."inventory_location_type" AS ENUM ('main_warehouse','branch_store','showroom','service_workshop','returns_quarantine','goods_in_transit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."inventory_movement_type" AS ENUM ('opening_balance','purchase_receipt','sale_issue','customer_return','supplier_return','positive_adjustment','negative_adjustment','transfer_out','transfer_in','stock_take_variance','reservation','reservation_release','backorder_allocation','cancellation_reversal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."inventory_movement_status" AS ENUM ('posted','reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."stock_adjustment_reason" AS ENUM ('opening_balance_correction','damage','loss','data_correction','found_stock','warranty_replacement','demonstration_stock','quarantine','other_approved_reason');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."stock_adjustment_status" AS ENUM ('posted','reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."stock_take_scope" AS ENUM ('all_products','category','selected_products');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."serial_number_status" AS ENUM ('available','reserved','sold','in_transit','returned','under_service','quarantined','damaged','written_off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."goods_receipt_status" AS ENUM ('draft','inspected','posted','partially_accepted','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."supplier_payment_status" AS ENUM ('recorded','approved','reversed','pending_accounting');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."purchase_return_status" AS ENUM ('draft','approved','posted','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TYPE "public"."purchase_order_status" ADD VALUE IF NOT EXISTS 'submitted';
ALTER TYPE "public"."purchase_order_status" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "public"."purchase_order_status" ADD VALUE IF NOT EXISTS 'fully_received';
ALTER TYPE "public"."purchase_order_status" ADD VALUE IF NOT EXISTS 'partially_paid';
ALTER TYPE "public"."purchase_order_status" ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE "public"."purchase_order_status" ADD VALUE IF NOT EXISTS 'closed';

CREATE TABLE IF NOT EXISTS "public"."inventory_locations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "code" text NOT NULL UNIQUE,
  "branch" text,
  "location_type" "public"."inventory_location_type" NOT NULL DEFAULT 'main_warehouse',
  "description" text,
  "address" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "is_default_receiving" boolean NOT NULL DEFAULT false,
  "is_default_dispatch" boolean NOT NULL DEFAULT false,
  "archived_at" timestamptz(6),
  "created_by_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."inventory_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "location_id" uuid NOT NULL REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "on_hand_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "reserved_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "available_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "incoming_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE ("product_id", "location_id")
);

CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "location_id" uuid NOT NULL REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "quantity" decimal(18,3) NOT NULL,
  "unit_of_measure" text NOT NULL DEFAULT 'unit',
  "movement_type" "public"."inventory_movement_type" NOT NULL,
  "source_document_type" text NOT NULL,
  "source_document_id" text NOT NULL,
  "source_line_id" text,
  "reference" text NOT NULL,
  "reason" text NOT NULL,
  "user_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "branch" text,
  "correlation_id" text NOT NULL,
  "unit_cost_kes" integer,
  "running_balance" decimal(18,3),
  "status" "public"."inventory_movement_status" NOT NULL DEFAULT 'posted',
  "reversed_movement_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "inventory_movements_source_unique" UNIQUE ("source_document_type", "source_document_id", "source_line_id", "movement_type", "location_id", "product_id")
);

CREATE TABLE IF NOT EXISTS "public"."stock_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "adjustment_number" text NOT NULL UNIQUE,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "location_id" uuid NOT NULL REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "quantity" decimal(18,3) NOT NULL,
  "reason" "public"."stock_adjustment_reason" NOT NULL,
  "notes" text,
  "status" "public"."stock_adjustment_status" NOT NULL DEFAULT 'posted',
  "correlation_id" text NOT NULL UNIQUE,
  "posted_by_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "posted_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);

ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "source_location_id" uuid REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "destination_location_id" uuid REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "approved_by_id" uuid;
ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "dispatched_by_id" uuid;
ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "received_by_id" uuid;
ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "dispatched_at" timestamptz(6);
ALTER TABLE "public"."stock_transfers" ADD COLUMN IF NOT EXISTS "correlation_id" text UNIQUE;

CREATE TABLE IF NOT EXISTS "public"."stock_transfer_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_transfer_id" uuid NOT NULL REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "quantity" decimal(18,3) NOT NULL,
  "dispatched_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "received_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "rejected_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "serial_numbers" jsonb NOT NULL DEFAULT '[]',
  "available_at_submit" decimal(18,3),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE ("stock_transfer_id", "product_id")
);

CREATE TABLE IF NOT EXISTS "public"."stock_transfer_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_transfer_id" uuid NOT NULL REFERENCES "public"."stock_transfers"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "user_id" uuid,
  "correlation_id" text NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);

ALTER TABLE "public"."stock_takes" ADD COLUMN IF NOT EXISTS "location_id" uuid REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."stock_takes" ADD COLUMN IF NOT EXISTS "scope_type" "public"."stock_take_scope" NOT NULL DEFAULT 'all_products';
ALTER TABLE "public"."stock_takes" ADD COLUMN IF NOT EXISTS "blind_count" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."stock_takes" ADD COLUMN IF NOT EXISTS "posted_at" timestamptz(6);
ALTER TABLE "public"."stock_takes" ADD COLUMN IF NOT EXISTS "correlation_id" text UNIQUE;

CREATE TABLE IF NOT EXISTS "public"."stock_take_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_take_id" uuid NOT NULL REFERENCES "public"."stock_takes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "snapshot_quantity" decimal(18,3) NOT NULL,
  "counted_quantity" decimal(18,3),
  "variance_quantity" decimal(18,3),
  "variance_value_kes" integer,
  "reason" text,
  "notes" text,
  "counted_by_id" uuid,
  "reviewed_by_id" uuid,
  "counted_at" timestamptz(6),
  "posted_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE ("stock_take_id", "product_id")
);

CREATE TABLE IF NOT EXISTS "public"."stock_take_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_take_id" uuid NOT NULL REFERENCES "public"."stock_takes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "user_id" uuid,
  "correlation_id" text NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."serial_numbers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "serial_number" text NOT NULL,
  "current_location_id" uuid REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "status" "public"."serial_number_status" NOT NULL DEFAULT 'available',
  "supplier_id" uuid REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "goods_receipt_id" uuid,
  "customer_reference" text,
  "warranty_starts_at" date,
  "warranty_ends_at" date,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  UNIQUE ("product_id", "serial_number")
);

ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "supplier_code" text UNIQUE;
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "trading_name" text;
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "tax_status" text;
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "payment_terms" text;
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "is_preferred" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT true;
ALTER TABLE "public"."suppliers" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz(6);

ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "branch" text;
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "delivery_location_id" uuid;
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "discount_kes" integer NOT NULL DEFAULT 0;
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "payment_terms" text;
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "supplier_notes" text;
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "approved_by_id" uuid;
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "approved_at" timestamptz(6);
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "sent_at" timestamptz(6);
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "closed_at" timestamptz(6);
ALTER TABLE "public"."purchase_orders" ADD COLUMN IF NOT EXISTS "correlation_id" text UNIQUE;

CREATE TABLE IF NOT EXISTS "public"."purchase_order_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchase_order_id" uuid NOT NULL REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "supplier_id" uuid REFERENCES "public"."suppliers"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "description" text NOT NULL,
  "quantity" decimal(18,3) NOT NULL,
  "unit_cost_kes" integer NOT NULL,
  "discount_kes" integer NOT NULL DEFAULT 0,
  "tax_kes" integer NOT NULL DEFAULT 0,
  "net_kes" integer NOT NULL DEFAULT 0,
  "gross_kes" integer NOT NULL DEFAULT 0,
  "received_quantity" decimal(18,3) NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."purchase_order_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchase_order_id" uuid NOT NULL REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "from_status" text,
  "to_status" text NOT NULL,
  "reason" text,
  "user_id" uuid,
  "correlation_id" text NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."goods_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "grn_number" text NOT NULL UNIQUE,
  "supplier_id" uuid NOT NULL REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "purchase_order_id" uuid NOT NULL REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "receiving_location_id" uuid NOT NULL REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "supplier_delivery_reference" text,
  "receipt_date" timestamptz(6) NOT NULL DEFAULT now(),
  "status" "public"."goods_receipt_status" NOT NULL DEFAULT 'draft',
  "inspection_notes" text,
  "notes" text,
  "received_by_id" uuid,
  "posted_by_id" uuid,
  "posted_at" timestamptz(6),
  "correlation_id" text UNIQUE,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."goods_receipt_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "goods_receipt_id" uuid NOT NULL REFERENCES "public"."goods_receipts"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "purchase_order_line_id" uuid NOT NULL REFERENCES "public"."purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "quantity_received" decimal(18,3) NOT NULL,
  "quantity_rejected" decimal(18,3) NOT NULL DEFAULT 0,
  "unit_cost_kes" integer NOT NULL,
  "condition" text,
  "serial_numbers" jsonb NOT NULL DEFAULT '[]',
  "batch_reference" text,
  "inspection_notes" text
);

ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "payment_number" text;
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "payment_date" timestamptz(6);
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "transaction_reference" text;
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "status" "public"."supplier_payment_status" NOT NULL DEFAULT 'recorded';
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "approved_by_id" uuid;
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "reversed_at" timestamptz(6);
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "reversal_reason" text;
ALTER TABLE "public"."supplier_payments" ADD COLUMN IF NOT EXISTS "correlation_id" text UNIQUE;

CREATE TABLE IF NOT EXISTS "public"."supplier_payment_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "supplier_payment_id" uuid NOT NULL REFERENCES "public"."supplier_payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "supplier_id" uuid NOT NULL REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "purchase_order_id" uuid,
  "supplier_invoice_id" uuid,
  "amount_kes" integer NOT NULL,
  "created_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."purchase_returns" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "return_number" text NOT NULL UNIQUE,
  "supplier_id" uuid NOT NULL REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "purchase_order_id" uuid REFERENCES "public"."purchase_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "goods_receipt_id" uuid REFERENCES "public"."goods_receipts"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "return_location_id" uuid NOT NULL REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "status" "public"."purchase_return_status" NOT NULL DEFAULT 'draft',
  "reason" text NOT NULL,
  "supplier_reference" text,
  "financial_adjustment_state" text NOT NULL DEFAULT 'pending_phase_6_accounting',
  "approved_by_id" uuid,
  "posted_by_id" uuid,
  "posted_at" timestamptz(6),
  "correlation_id" text UNIQUE,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."purchase_return_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "purchase_return_id" uuid NOT NULL REFERENCES "public"."purchase_returns"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  "purchase_order_line_id" uuid REFERENCES "public"."purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "goods_receipt_line_id" uuid REFERENCES "public"."goods_receipt_lines"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  "quantity" decimal(18,3) NOT NULL,
  "unit_cost_kes" integer,
  "serial_numbers" jsonb NOT NULL DEFAULT '[]',
  "reason" text
);

CREATE INDEX IF NOT EXISTS "inventory_locations_branch_idx" ON "public"."inventory_locations"("branch");
CREATE INDEX IF NOT EXISTS "inventory_locations_is_active_idx" ON "public"."inventory_locations"("is_active");
CREATE INDEX IF NOT EXISTS "inventory_balances_location_id_idx" ON "public"."inventory_balances"("location_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_product_id_created_at_idx" ON "public"."inventory_movements"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "inventory_movements_location_id_created_at_idx" ON "public"."inventory_movements"("location_id", "created_at");
CREATE INDEX IF NOT EXISTS "inventory_movements_movement_type_idx" ON "public"."inventory_movements"("movement_type");
CREATE INDEX IF NOT EXISTS "inventory_movements_correlation_id_idx" ON "public"."inventory_movements"("correlation_id");
CREATE INDEX IF NOT EXISTS "stock_adjustments_product_id_created_at_idx" ON "public"."stock_adjustments"("product_id", "created_at");
CREATE INDEX IF NOT EXISTS "stock_adjustments_location_id_created_at_idx" ON "public"."stock_adjustments"("location_id", "created_at");
CREATE INDEX IF NOT EXISTS "stock_transfer_lines_product_id_idx" ON "public"."stock_transfer_lines"("product_id");
CREATE INDEX IF NOT EXISTS "stock_take_lines_product_id_idx" ON "public"."stock_take_lines"("product_id");
CREATE INDEX IF NOT EXISTS "serial_numbers_serial_number_idx" ON "public"."serial_numbers"("serial_number");
CREATE INDEX IF NOT EXISTS "serial_numbers_current_location_id_idx" ON "public"."serial_numbers"("current_location_id");
CREATE INDEX IF NOT EXISTS "serial_numbers_status_idx" ON "public"."serial_numbers"("status");
CREATE INDEX IF NOT EXISTS "suppliers_is_active_idx" ON "public"."suppliers"("is_active");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_purchase_order_id_idx" ON "public"."purchase_order_lines"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "purchase_order_lines_product_id_idx" ON "public"."purchase_order_lines"("product_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_purchase_order_id_idx" ON "public"."goods_receipts"("purchase_order_id");
CREATE INDEX IF NOT EXISTS "goods_receipts_status_idx" ON "public"."goods_receipts"("status");
CREATE INDEX IF NOT EXISTS "goods_receipt_lines_goods_receipt_id_idx" ON "public"."goods_receipt_lines"("goods_receipt_id");
CREATE INDEX IF NOT EXISTS "supplier_payment_allocations_supplier_payment_id_idx" ON "public"."supplier_payment_allocations"("supplier_payment_id");
CREATE INDEX IF NOT EXISTS "purchase_returns_supplier_id_idx" ON "public"."purchase_returns"("supplier_id");
CREATE INDEX IF NOT EXISTS "purchase_return_lines_purchase_return_id_idx" ON "public"."purchase_return_lines"("purchase_return_id");
