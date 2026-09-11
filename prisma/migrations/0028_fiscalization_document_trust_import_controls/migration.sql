DO $$ BEGIN
  CREATE TYPE public.tax_mapping_status AS ENUM ('missing', 'partial', 'complete', 'invalid', 'review_required');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.import_kind AS ENUM ('products', 'categories');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.import_status AS ENUM ('started', 'completed', 'completed_with_warnings', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.import_severity AS ENUM ('warning', 'conflict', 'invalid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_lifecycle_status AS ENUM ('draft', 'under_review', 'approved', 'fiscalization_required', 'fiscalized', 'finalized', 'digitally_signed', 'issued', 'superseded', 'cancelled', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_signature_status AS ENUM ('not_configured', 'unsigned', 'test_signed', 'signed', 'invalid', 'expired_certificate', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_verification_status AS ENUM ('not_issued', 'valid', 'superseded', 'cancelled', 'revoked', 'altered', 'signature_invalid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.document_verification_result AS ENUM ('valid', 'valid_superseded', 'cancelled', 'revoked', 'invalid_token', 'signature_invalid', 'document_altered', 'not_issued');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscalization_state AS ENUM ('draft', 'ready_for_validation', 'queued', 'submitting', 'accepted', 'rejected', 'retryable_error', 'reconciliation_required', 'cancellation_pending', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscalization_provider_mode AS ENUM ('oscu', 'vscu', 'legacy_tims_etr', 'sandbox', 'disabled', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.fiscalization_environment AS ENUM ('sandbox', 'production');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.reconciliation_state AS ENUM ('not_checked', 'matched', 'difference', 'missing_at_kra', 'manual_review');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS etims_item_code text,
  ADD COLUMN IF NOT EXISTS etims_classification_code text,
  ADD COLUMN IF NOT EXISTS etims_unit_code text,
  ADD COLUMN IF NOT EXISTS etims_packaging_unit_code text,
  ADD COLUMN IF NOT EXISTS tax_type_code text,
  ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS tax_mapping_status public.tax_mapping_status NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS tax_mapping_review_note text;

CREATE INDEX IF NOT EXISTS products_tax_mapping_status_idx ON public.products (tax_mapping_status);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_present_idx ON public.products (lower(sku)) WHERE sku IS NOT NULL AND btrim(sku) <> '';
CREATE UNIQUE INDEX IF NOT EXISTS products_mpn_unique_present_idx ON public.products (lower(mpn)) WHERE mpn IS NOT NULL AND btrim(mpn) <> '';

CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_kind public.import_kind NOT NULL,
  source_filename text,
  source_sha256 text NOT NULL,
  status public.import_status NOT NULL DEFAULT 'started',
  dry_run boolean NOT NULL DEFAULT false,
  total_rows integer NOT NULL DEFAULT 0,
  create_count integer NOT NULL DEFAULT 0,
  update_count integer NOT NULL DEFAULT 0,
  unchanged_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  conflict_count integer NOT NULL DEFAULT 0,
  invalid_count integer NOT NULL DEFAULT 0,
  started_by_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  summary jsonb
);

CREATE INDEX IF NOT EXISTS import_logs_import_kind_started_at_idx ON public.import_logs (import_kind, started_at);
CREATE INDEX IF NOT EXISTS import_logs_status_idx ON public.import_logs (status);
CREATE INDEX IF NOT EXISTS import_logs_started_by_id_idx ON public.import_logs (started_by_id);

CREATE TABLE IF NOT EXISTS public.import_row_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_log_id uuid NOT NULL REFERENCES public.import_logs(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  severity public.import_severity NOT NULL,
  code text NOT NULL,
  message text NOT NULL,
  row_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS import_row_errors_import_log_id_row_number_idx ON public.import_row_errors (import_log_id, row_number);
CREATE INDEX IF NOT EXISTS import_row_errors_severity_idx ON public.import_row_errors (severity);

CREATE TABLE IF NOT EXISTS public.signing_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL,
  provider text NOT NULL,
  subject text NOT NULL,
  issuer text NOT NULL,
  serial_number text NOT NULL,
  valid_from timestamptz NOT NULL,
  valid_to timestamptz NOT NULL,
  fingerprint_sha256 text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_failure text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (environment, fingerprint_sha256)
);

CREATE INDEX IF NOT EXISTS signing_certificates_is_active_valid_to_idx ON public.signing_certificates (is_active, valid_to);

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lifecycle_status public.document_lifecycle_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS signature_status public.document_signature_status NOT NULL DEFAULT 'not_configured',
  ADD COLUMN IF NOT EXISTS verification_status public.document_verification_status NOT NULL DEFAULT 'not_issued',
  ADD COLUMN IF NOT EXISTS verification_token_hash text,
  ADD COLUMN IF NOT EXISTS content_sha256 text,
  ADD COLUMN IF NOT EXISTS signed_content_sha256 text,
  ADD COLUMN IF NOT EXISTS signing_certificate_id uuid REFERENCES public.signing_certificates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS superseded_by_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_reason text;

CREATE INDEX IF NOT EXISTS documents_document_number_idx ON public.documents (document_number);
CREATE INDEX IF NOT EXISTS documents_lifecycle_status_idx ON public.documents (lifecycle_status);
CREATE INDEX IF NOT EXISTS documents_verification_token_hash_idx ON public.documents (verification_token_hash);
CREATE INDEX IF NOT EXISTS documents_signing_certificate_id_idx ON public.documents (signing_certificate_id);
CREATE INDEX IF NOT EXISTS documents_superseded_by_id_idx ON public.documents (superseded_by_id);

CREATE TABLE IF NOT EXISTS public.document_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  token_hash text,
  result public.document_verification_result NOT NULL,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_verification_events_document_id_created_at_idx ON public.document_verification_events (document_id, created_at);
CREATE INDEX IF NOT EXISTS document_verification_events_token_hash_created_at_idx ON public.document_verification_events (token_hash, created_at);

ALTER TABLE public.etims_records
  ADD COLUMN IF NOT EXISTS internal_state public.fiscalization_state NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS provider_mode public.fiscalization_provider_mode NOT NULL DEFAULT 'disabled',
  ADD COLUMN IF NOT EXISTS environment public.fiscalization_environment NOT NULL DEFAULT 'sandbox',
  ADD COLUMN IF NOT EXISTS invoice_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS taxpayer_pin_hash text,
  ADD COLUMN IF NOT EXISTS branch_code text,
  ADD COLUMN IF NOT EXISTS paypoint_code text,
  ADD COLUMN IF NOT EXISTS device_identifier text,
  ADD COLUMN IF NOT EXISTS attempt_number integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS official_qr_payload text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconciliation_state public.reconciliation_state NOT NULL DEFAULT 'not_checked',
  ADD COLUMN IF NOT EXISTS error_classification text,
  ADD COLUMN IF NOT EXISTS sanitized_request jsonb,
  ADD COLUMN IF NOT EXISTS sanitized_response jsonb,
  ADD COLUMN IF NOT EXISTS response_code text,
  ADD COLUMN IF NOT EXISTS response_message text,
  ADD COLUMN IF NOT EXISTS original_invoice_reference text;

CREATE INDEX IF NOT EXISTS etims_records_internal_state_idx ON public.etims_records (internal_state);
CREATE INDEX IF NOT EXISTS etims_records_provider_mode_environment_idx ON public.etims_records (provider_mode, environment);
CREATE UNIQUE INDEX IF NOT EXISTS etims_records_idempotency_key_key ON public.etims_records (idempotency_key) WHERE idempotency_key IS NOT NULL;
