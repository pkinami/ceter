CREATE TABLE IF NOT EXISTS "public"."customer_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "description" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now()
);

ALTER TABLE "public"."customers"
  ADD COLUMN IF NOT EXISTS "category_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_category_id_fkey'
  ) THEN
    ALTER TABLE "public"."customers"
      ADD CONSTRAINT "customers_category_id_fkey"
      FOREIGN KEY ("category_id") REFERENCES "public"."customer_categories"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "customers_category_id_idx" ON "public"."customers"("category_id");

CREATE TABLE IF NOT EXISTS "public"."stock_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "transfer_number" text NOT NULL UNIQUE,
  "source_location" text NOT NULL,
  "destination_location" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "transfer_date" date NOT NULL,
  "notes" text,
  "responsible_user_id" uuid,
  "created_by_id" uuid,
  "submitted_at" timestamptz(6),
  "received_at" timestamptz(6),
  "cancelled_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_transfers_responsible_user_id_fkey"
    FOREIGN KEY ("responsible_user_id") REFERENCES "public"."profiles"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "stock_transfers_status_transfer_date_idx" ON "public"."stock_transfers"("status", "transfer_date");
CREATE INDEX IF NOT EXISTS "stock_transfers_responsible_user_id_idx" ON "public"."stock_transfers"("responsible_user_id");

CREATE TABLE IF NOT EXISTS "public"."stock_transfer_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_transfer_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "quantity" integer NOT NULL,
  "available_at_submit" integer,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_transfer_items_stock_transfer_id_fkey"
    FOREIGN KEY ("stock_transfer_id") REFERENCES "public"."stock_transfers"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_transfer_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "stock_transfer_items_stock_transfer_id_idx" ON "public"."stock_transfer_items"("stock_transfer_id");
CREATE INDEX IF NOT EXISTS "stock_transfer_items_product_id_idx" ON "public"."stock_transfer_items"("product_id");

CREATE TABLE IF NOT EXISTS "public"."stock_takes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_take_number" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "location" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "stock_take_date" date NOT NULL,
  "assigned_user_id" uuid,
  "approved_by_id" uuid,
  "notes" text,
  "started_at" timestamptz(6),
  "submitted_at" timestamptz(6),
  "completed_at" timestamptz(6),
  "cancelled_at" timestamptz(6),
  "created_by_id" uuid,
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_takes_assigned_user_id_fkey"
    FOREIGN KEY ("assigned_user_id") REFERENCES "public"."profiles"("id")
    ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "stock_takes_status_stock_take_date_idx" ON "public"."stock_takes"("status", "stock_take_date");
CREATE INDEX IF NOT EXISTS "stock_takes_assigned_user_id_idx" ON "public"."stock_takes"("assigned_user_id");

CREATE TABLE IF NOT EXISTS "public"."stock_take_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "stock_take_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "expected_quantity" integer NOT NULL,
  "counted_quantity" integer,
  "variance_quantity" integer,
  "approved_quantity" integer,
  "notes" text,
  "counted_at" timestamptz(6),
  "reconciled_at" timestamptz(6),
  "created_at" timestamptz(6) NOT NULL DEFAULT now(),
  "updated_at" timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT "stock_take_items_stock_take_id_fkey"
    FOREIGN KEY ("stock_take_id") REFERENCES "public"."stock_takes"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "stock_take_items_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "public"."products"("id")
    ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "stock_take_items_stock_take_id_product_id_key"
    UNIQUE ("stock_take_id", "product_id")
);

CREATE INDEX IF NOT EXISTS "stock_take_items_stock_take_id_idx" ON "public"."stock_take_items"("stock_take_id");
CREATE INDEX IF NOT EXISTS "stock_take_items_product_id_idx" ON "public"."stock_take_items"("product_id");
