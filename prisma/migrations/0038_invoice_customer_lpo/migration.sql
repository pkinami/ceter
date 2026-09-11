-- Customer Local Purchase Order reference for sales invoices.  This is not a
-- relation to Ceter's supplier purchase_orders table.
ALTER TABLE "public"."invoices"
  ADD COLUMN IF NOT EXISTS "customer_lpo_number" TEXT;

ALTER TABLE "public"."quotes"
  ADD COLUMN IF NOT EXISTS "customer_lpo_number" TEXT;

ALTER TABLE "public"."proforma_invoices"
  ADD COLUMN IF NOT EXISTS "customer_lpo_number" TEXT;

COMMENT ON COLUMN "public"."invoices"."customer_lpo_number" IS
  'Customer Local Purchase Order reference (LPO No.), not Ceter supplier PO number.';
