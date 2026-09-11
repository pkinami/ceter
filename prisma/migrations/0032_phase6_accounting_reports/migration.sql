-- Phase 6 expenses, accounting and reports foundation. Additive only.

ALTER TABLE "public"."expense_categories" ADD COLUMN IF NOT EXISTS "code" text UNIQUE;
ALTER TABLE "public"."expense_categories" ADD COLUMN IF NOT EXISTS "default_account_id" uuid;
ALTER TABLE "public"."expense_categories" ADD COLUMN IF NOT EXISTS "default_tax_treatment" text;
ALTER TABLE "public"."expense_categories" ADD COLUMN IF NOT EXISTS "approval_required" boolean NOT NULL DEFAULT false;
ALTER TABLE "public"."expense_categories" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;

ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "payee" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "net_amount" decimal(18,2);
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "tax_amount" decimal(18,2);
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "gross_amount" decimal(18,2);
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'draft';
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "payment_status" text NOT NULL DEFAULT 'unpaid';
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "accounting_status" text NOT NULL DEFAULT 'not_posted';
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "approval_status" text NOT NULL DEFAULT 'not_submitted';
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "approved_by_id" uuid;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "posted_at" timestamptz;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "reversed_at" timestamptz;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "reversal_reason" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "transaction_reference" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "duplicate_review_key" text;
ALTER TABLE "public"."expenses" ADD COLUMN IF NOT EXISTS "accounting_event_id" uuid;
CREATE INDEX IF NOT EXISTS "expenses_status_accounting_status_idx" ON "public"."expenses"("status","accounting_status");
CREATE INDEX IF NOT EXISTS "expenses_duplicate_review_key_idx" ON "public"."expenses"("duplicate_review_key");

ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "schedule_number" text UNIQUE;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "payee" text;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "start_date" date;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "end_date" date;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "last_generated_at" timestamptz;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "last_generated_expense_id" uuid;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "tax_treatment" text;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "branch" text;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "payment_terms" text;
ALTER TABLE "public"."recurring_expense_schedules" ADD COLUMN IF NOT EXISTS "generation_key" text UNIQUE;

ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "subtype" text;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "parent_account_id" uuid;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "normal_balance" "public"."transaction_direction" NOT NULL DEFAULT 'debit';
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "is_posting_account" boolean NOT NULL DEFAULT true;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "effective_from" date;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "effective_to" date;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "finance_review_status" text NOT NULL DEFAULT 'draft_requires_review';
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "archived_at" timestamptz;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "public"."accounts" ADD COLUMN IF NOT EXISTS "updated_at" timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS "accounts_parent_account_id_idx" ON "public"."accounts"("parent_account_id");
CREATE INDEX IF NOT EXISTS "accounts_active_posting_idx" ON "public"."accounts"("is_active","is_posting_account");

ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'draft';
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "reference" text;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "accounting_period_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "source_event_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "idempotency_key" text UNIQUE;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "total_debit" decimal(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "total_credit" decimal(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "submitted_by_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "submitted_at" timestamptz;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "approved_by_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "posted_by_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "posted_at" timestamptz;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "reversed_by_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "reversed_at" timestamptz;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "reversal_of_journal_id" uuid;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "reversal_reason" text;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "posting_rule_version" integer;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "branch" text;
ALTER TABLE "public"."journal_entries" ADD COLUMN IF NOT EXISTS "correlation_id" text;
CREATE INDEX IF NOT EXISTS "journal_entries_status_entry_date_idx" ON "public"."journal_entries"("status","entry_date");
CREATE INDEX IF NOT EXISTS "journal_entries_accounting_period_id_idx" ON "public"."journal_entries"("accounting_period_id");
CREATE INDEX IF NOT EXISTS "journal_entries_source_event_id_idx" ON "public"."journal_entries"("source_event_id");
CREATE INDEX IF NOT EXISTS "journal_entries_reversal_of_journal_id_idx" ON "public"."journal_entries"("reversal_of_journal_id");

ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "line_number" integer NOT NULL DEFAULT 1;
ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "debit_amount" decimal(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "credit_amount" decimal(18,2) NOT NULL DEFAULT 0;
ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'KES';
ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "exchange_rate" decimal(18,8);
ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "source_line_id" text;
ALTER TABLE "public"."journal_lines" ADD COLUMN IF NOT EXISTS "branch" text;
CREATE INDEX IF NOT EXISTS "journal_lines_source_line_id_idx" ON "public"."journal_lines"("source_line_id");

CREATE TABLE IF NOT EXISTS "public"."accounting_periods" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "fiscal_year" text NOT NULL,
  "period_name" text NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "status" text NOT NULL DEFAULT 'open',
  "soft_closed_at" timestamptz,
  "locked_at" timestamptz,
  "closed_by_id" uuid,
  "reopened_by_id" uuid,
  "reopened_at" timestamptz,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("fiscal_year", "period_name"),
  CONSTRAINT "accounting_periods_date_order_chk" CHECK ("end_date" >= "start_date")
);
CREATE INDEX IF NOT EXISTS "accounting_periods_start_end_idx" ON "public"."accounting_periods"("start_date","end_date");
CREATE INDEX IF NOT EXISTS "accounting_periods_status_idx" ON "public"."accounting_periods"("status");

CREATE TABLE IF NOT EXISTS "public"."accounting_posting_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "rule_key" text NOT NULL,
  "source_event_type" text NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "status" text NOT NULL DEFAULT 'draft',
  "debit_logic" jsonb NOT NULL,
  "credit_logic" jsonb NOT NULL,
  "branch_scope" text,
  "preview_snapshot" jsonb,
  "activated_by_id" uuid,
  "activated_at" timestamptz,
  "archived_at" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("rule_key", "version")
);
CREATE INDEX IF NOT EXISTS "accounting_posting_rules_event_status_idx" ON "public"."accounting_posting_rules"("source_event_type","status");

CREATE TABLE IF NOT EXISTS "public"."accounting_source_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "source_type" text NOT NULL,
  "source_id" text NOT NULL,
  "source_version" integer NOT NULL DEFAULT 1,
  "event_type" text NOT NULL,
  "event_date" date NOT NULL,
  "accounting_date" date NOT NULL,
  "currency" text NOT NULL DEFAULT 'KES',
  "amount" decimal(18,2) NOT NULL DEFAULT 0,
  "tax_amount" decimal(18,2) NOT NULL DEFAULT 0,
  "cost_amount" decimal(18,2),
  "branch" text,
  "idempotency_key" text NOT NULL UNIQUE,
  "posting_rule_key" text,
  "posting_rule_version" integer,
  "journal_entry_id" uuid,
  "status" text NOT NULL DEFAULT 'pending',
  "error_message" text,
  "retry_count" integer NOT NULL DEFAULT 0,
  "retry_after" timestamptz,
  "correlation_id" text,
  "ignored_reason" text,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("source_type", "source_id", "source_version", "event_type")
);
CREATE INDEX IF NOT EXISTS "accounting_source_events_status_date_idx" ON "public"."accounting_source_events"("status","accounting_date");
CREATE INDEX IF NOT EXISTS "accounting_source_events_source_idx" ON "public"."accounting_source_events"("source_type","source_id");

CREATE TABLE IF NOT EXISTS "public"."collection_cases" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "case_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL,
  "invoice_id" uuid,
  "outstanding_amount" decimal(18,2) NOT NULL DEFAULT 0,
  "aging_bucket" text NOT NULL,
  "assigned_to_id" uuid,
  "priority" text NOT NULL DEFAULT 'normal',
  "last_contact_at" timestamptz,
  "next_follow_up_at" timestamptz,
  "promise_to_pay_at" date,
  "promised_amount" decimal(18,2),
  "notes" text,
  "private_notes" text,
  "status" text NOT NULL DEFAULT 'unassigned',
  "related_payment_id" uuid,
  "correlation_id" text UNIQUE,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "collection_cases_customer_id_idx" ON "public"."collection_cases"("customer_id");
CREATE INDEX IF NOT EXISTS "collection_cases_invoice_id_idx" ON "public"."collection_cases"("invoice_id");
CREATE INDEX IF NOT EXISTS "collection_cases_status_follow_up_idx" ON "public"."collection_cases"("status","next_follow_up_at");

CREATE TABLE IF NOT EXISTS "public"."accounting_reconciliation_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reconciliation_type" text NOT NULL,
  "source_total" decimal(18,2) NOT NULL DEFAULT 0,
  "ledger_total" decimal(18,2) NOT NULL DEFAULT 0,
  "difference" decimal(18,2) NOT NULL DEFAULT 0,
  "unposted_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "mapping_exception_count" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'open',
  "resolution_reason" text,
  "resolved_by_id" uuid,
  "resolved_at" timestamptz,
  "snapshot" jsonb NOT NULL,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "accounting_reconciliation_runs_type_created_idx" ON "public"."accounting_reconciliation_runs"("reconciliation_type","created_at");
CREATE INDEX IF NOT EXISTS "accounting_reconciliation_runs_status_idx" ON "public"."accounting_reconciliation_runs"("status");

CREATE TABLE IF NOT EXISTS "public"."fixed_assets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "asset_number" text NOT NULL UNIQUE,
  "category" text,
  "description" text NOT NULL,
  "acquisition_date" date,
  "acquisition_cost" decimal(18,2),
  "supplier_id" uuid,
  "location" text,
  "custodian" text,
  "useful_life_months" integer,
  "depreciation_method" text,
  "residual_value" decimal(18,2),
  "accumulated_depreciation" decimal(18,2) NOT NULL DEFAULT 0,
  "net_book_value" decimal(18,2),
  "status" text NOT NULL DEFAULT 'draft',
  "disposal_information" jsonb,
  "journal_entry_id" uuid,
  "feature_flag_status" text NOT NULL DEFAULT 'requires_finance_policy',
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "fixed_assets_status_idx" ON "public"."fixed_assets"("status");
