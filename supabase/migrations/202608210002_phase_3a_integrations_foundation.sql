DO $$ BEGIN
  CREATE TYPE "public"."mpesa_payment_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM ('invoice_created', 'payment_received', 'quote_created', 'quote_approved', 'receipt_generated');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'receipt_generated';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_status" AS ENUM ('pending', 'sent', 'failed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."etims_records"
  ADD COLUMN IF NOT EXISTS "reference_information" JSONB;

CREATE TABLE IF NOT EXISTS "public"."mpesa_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "payment_id" UUID,
  "phone_number" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "transaction_reference" TEXT,
  "checkout_request_id" TEXT,
  "callback_payload" JSONB,
  "payment_status" "public"."mpesa_payment_status" NOT NULL DEFAULT 'pending',
  "failure_reason" TEXT,
  "verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mpesa_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_transactions_payment_id_key" ON "public"."mpesa_transactions"("payment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_transactions_transaction_reference_key" ON "public"."mpesa_transactions"("transaction_reference");
CREATE UNIQUE INDEX IF NOT EXISTS "mpesa_transactions_checkout_request_id_key" ON "public"."mpesa_transactions"("checkout_request_id");
CREATE INDEX IF NOT EXISTS "mpesa_transactions_invoice_id_payment_status_idx" ON "public"."mpesa_transactions"("invoice_id", "payment_status");
CREATE INDEX IF NOT EXISTS "mpesa_transactions_customer_id_created_at_idx" ON "public"."mpesa_transactions"("customer_id", "created_at");
CREATE INDEX IF NOT EXISTS "mpesa_transactions_payment_status_idx" ON "public"."mpesa_transactions"("payment_status");

DO $$ BEGIN
  ALTER TABLE "public"."mpesa_transactions"
    ADD CONSTRAINT "mpesa_transactions_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."mpesa_transactions"
    ADD CONSTRAINT "mpesa_transactions_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "public"."mpesa_transactions"
    ADD CONSTRAINT "mpesa_transactions_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "public"."notification_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID,
  "recipient_email" TEXT,
  "notification_type" "public"."notification_type" NOT NULL,
  "status" "public"."notification_status" NOT NULL DEFAULT 'pending',
  "subject" TEXT,
  "error_message" TEXT,
  "retry_count" INTEGER NOT NULL DEFAULT 0,
  "provider_response" JSONB,
  "sent_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "public"."notification_history"
  ADD COLUMN IF NOT EXISTS "recipient_email" TEXT,
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "provider_response" JSONB;

CREATE INDEX IF NOT EXISTS "notification_history_user_id_created_at_idx" ON "public"."notification_history"("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "notification_history_notification_type_status_idx" ON "public"."notification_history"("notification_type", "status");

DO $$ BEGIN
  ALTER TABLE "public"."notification_history"
    ADD CONSTRAINT "notification_history_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "public"."business_settings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT,
  "description" TEXT,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "business_settings_code_key" ON "public"."business_settings"("code");

INSERT INTO "public"."business_settings" ("code", "label", "value", "description")
VALUES
  ('kra_pin', 'KRA PIN', NULL, 'Company KRA taxpayer PIN used for eTIMS payload validation.'),
  ('vat_registration_number', 'VAT registration number', NULL, 'Company VAT registration number for tax documents.'),
  ('branch_details', 'Branch details', NULL, 'Branch name, code and location information for eTIMS readiness.'),
  ('business_legal_information', 'Business legal information', NULL, 'Registered legal name and compliance information.')
ON CONFLICT ("code") DO NOTHING;
