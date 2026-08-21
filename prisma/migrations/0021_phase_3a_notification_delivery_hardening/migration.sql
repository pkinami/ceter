DO $$ BEGIN
  ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'receipt_generated';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "public"."notification_history"
  ADD COLUMN IF NOT EXISTS "recipient_email" TEXT,
  ADD COLUMN IF NOT EXISTS "subject" TEXT,
  ADD COLUMN IF NOT EXISTS "error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "retry_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "provider_response" JSONB;
