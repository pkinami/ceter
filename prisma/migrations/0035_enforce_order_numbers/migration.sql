UPDATE "public"."orders"
SET "order_number" = 'CT-' || to_char("created_at", 'YYYYMMDD') || '-' || upper(substr(replace("id"::text, '-', ''), 1, 8))
WHERE "order_number" IS NULL OR btrim("order_number") = '';

DROP INDEX IF EXISTS "public"."orders_order_number_key";

CREATE UNIQUE INDEX IF NOT EXISTS "orders_order_number_key" ON "public"."orders"("order_number");

ALTER TABLE "public"."orders"
  ALTER COLUMN "order_number" SET NOT NULL;

ALTER TABLE "public"."orders"
  ADD CONSTRAINT "orders_order_number_not_blank"
  CHECK (btrim("order_number") <> '');
