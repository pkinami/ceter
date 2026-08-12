create type "public"."payment_provider" as enum ('safaricom_daraja', 'pesapal');

create type "public"."payment_status" as enum ('pending', 'initiated', 'processing', 'paid', 'failed', 'cancelled');

create table "public"."payment_transactions" (
  "id" uuid not null default gen_random_uuid(),
  "order_id" uuid not null references "public"."orders"("id") on delete cascade,
  "provider" "public"."payment_provider" not null,
  "method" "public"."payment_method" not null,
  "status" "public"."payment_status" not null default 'pending',
  "amount_kes" integer not null,
  "merchant_reference" text not null unique,
  "provider_reference" text,
  "checkout_request_id" text unique,
  "phone" text,
  "redirect_url" text,
  "failure_reason" text,
  "raw_request" jsonb,
  "raw_response" jsonb,
  "verified_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create index "payment_transactions_order_id_status_idx" on "public"."payment_transactions"("order_id", "status");
create index "payment_transactions_provider_status_idx" on "public"."payment_transactions"("provider", "status");
