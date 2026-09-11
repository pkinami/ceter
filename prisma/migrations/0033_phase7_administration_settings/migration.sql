-- Phase 7 administration and settings foundation. Additive only.

CREATE TABLE IF NOT EXISTS "public"."admin_invitations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "role" text NOT NULL,
  "branch_ids" text[] NOT NULL DEFAULT '{}',
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamptz NOT NULL,
  "accepted_at" timestamptz,
  "cancelled_at" timestamptz,
  "superseded_by_id" uuid,
  "invited_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_invitations_email_status_idx" ON "public"."admin_invitations"("email","status");
CREATE INDEX IF NOT EXISTS "admin_invitations_expires_at_idx" ON "public"."admin_invitations"("expires_at");

CREATE TABLE IF NOT EXISTS "public"."admin_role_definitions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "role_key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "permissions" text[] NOT NULL DEFAULT '{}',
  "is_system" boolean NOT NULL DEFAULT false,
  "branch_scope" text NOT NULL DEFAULT 'all',
  "archived_at" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_role_definitions_system_archived_idx" ON "public"."admin_role_definitions"("is_system","archived_at");

CREATE TABLE IF NOT EXISTS "public"."branches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "status" text NOT NULL DEFAULT 'active',
  "address" text,
  "telephone" text,
  "email" text,
  "timezone" text NOT NULL DEFAULT 'Africa/Nairobi',
  "default_inventory_location_id" uuid,
  "branch_manager_id" uuid,
  "mpesa_configuration_ref" text,
  "etims_paypoint_metadata" jsonb,
  "numbering_metadata" jsonb,
  "archived_at" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "branches_status_idx" ON "public"."branches"("status");
CREATE INDEX IF NOT EXISTS "branches_default_inventory_location_id_idx" ON "public"."branches"("default_inventory_location_id");

CREATE TABLE IF NOT EXISTS "public"."user_branch_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "role_scope" text NOT NULL DEFAULT 'member',
  "assigned_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "branch_id")
);
CREATE INDEX IF NOT EXISTS "user_branch_assignments_branch_id_idx" ON "public"."user_branch_assignments"("branch_id");

CREATE TABLE IF NOT EXISTS "public"."sales_team_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE,
  "sales_code" text NOT NULL UNIQUE,
  "branch_id" uuid,
  "manager_id" uuid,
  "status" text NOT NULL DEFAULT 'active',
  "target_status" text NOT NULL DEFAULT 'not_configured',
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "sales_team_members_status_branch_id_idx" ON "public"."sales_team_members"("status","branch_id");

CREATE TABLE IF NOT EXISTS "public"."compliance_documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_number" text NOT NULL UNIQUE,
  "document_type" text NOT NULL,
  "title" text NOT NULL,
  "issuer" text,
  "issue_date" date,
  "expiry_date" date,
  "status" text NOT NULL DEFAULT 'draft',
  "verification_state" text NOT NULL DEFAULT 'unverified',
  "sensitivity" text NOT NULL DEFAULT 'internal',
  "storage_path" text,
  "mime_type" text,
  "file_size_bytes" integer,
  "version" integer NOT NULL DEFAULT 1,
  "notes" text,
  "reminder_dates" jsonb NOT NULL DEFAULT '[]',
  "tender_pack_status" text NOT NULL DEFAULT 'not_included',
  "uploaded_by_id" uuid,
  "reviewed_by_id" uuid,
  "reviewed_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "compliance_documents_type_status_idx" ON "public"."compliance_documents"("document_type","status");
CREATE INDEX IF NOT EXISTS "compliance_documents_expiry_date_idx" ON "public"."compliance_documents"("expiry_date");

CREATE TABLE IF NOT EXISTS "public"."admin_notices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "message" text NOT NULL,
  "priority" text NOT NULL DEFAULT 'normal',
  "audience" text NOT NULL DEFAULT 'all_admins',
  "role_keys" text[] NOT NULL DEFAULT '{}',
  "branch_ids" text[] NOT NULL DEFAULT '{}',
  "starts_at" timestamptz NOT NULL DEFAULT now(),
  "ends_at" timestamptz,
  "status" text NOT NULL DEFAULT 'draft',
  "is_pinned" boolean NOT NULL DEFAULT false,
  "acknowledgement_required" boolean NOT NULL DEFAULT false,
  "link_url" text,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "admin_notices_status_dates_idx" ON "public"."admin_notices"("status","starts_at","ends_at");

CREATE TABLE IF NOT EXISTS "public"."admin_notice_acknowledgements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "notice_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "acknowledged_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("notice_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "public"."business_profile_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "version" integer NOT NULL UNIQUE,
  "legal_name" text,
  "trading_name" text,
  "registration_number" text,
  "kra_pin" text,
  "vat_information" text,
  "address" text,
  "telephone" text,
  "general_email" text,
  "sales_email" text,
  "support_email" text,
  "website" text,
  "timezone" text NOT NULL DEFAULT 'Africa/Nairobi',
  "base_currency" text NOT NULL DEFAULT 'KES',
  "fiscal_year_config" jsonb,
  "default_country" text NOT NULL DEFAULT 'KE',
  "document_footer" text,
  "business_description" text,
  "approval_state" text NOT NULL DEFAULT 'draft',
  "active_from" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "business_profile_versions_approval_state_idx" ON "public"."business_profile_versions"("approval_state");

CREATE TABLE IF NOT EXISTS "public"."branding_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "version" integer NOT NULL UNIQUE,
  "admin_logo_path" text,
  "storefront_logo_path" text,
  "document_logo_path" text,
  "monochrome_logo_path" text,
  "favicon_path" text,
  "primary_color" text NOT NULL DEFAULT '#0f3b57',
  "secondary_color" text NOT NULL DEFAULT '#1f7a8c',
  "accent_color" text NOT NULL DEFAULT '#f5a524',
  "document_header" jsonb,
  "document_footer" jsonb,
  "email_branding" jsonb,
  "status" text NOT NULL DEFAULT 'draft',
  "activated_at" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "branding_profiles_status_idx" ON "public"."branding_profiles"("status");

CREATE TABLE IF NOT EXISTS "public"."payment_method_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "code" text NOT NULL UNIQUE,
  "method_type" text NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "reference_required" boolean NOT NULL DEFAULT false,
  "branch_ids" text[] NOT NULL DEFAULT '{}',
  "customer_visible" boolean NOT NULL DEFAULT false,
  "accounting_mapping_ref" text,
  "integration_ref" text,
  "instructions" text,
  "sort_order" integer NOT NULL DEFAULT 100,
  "archived_at" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "payment_method_settings_active_sort_idx" ON "public"."payment_method_settings"("is_active","sort_order");

CREATE TABLE IF NOT EXISTS "public"."tax_type_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "internal_code" text NOT NULL,
  "official_code" text,
  "rate" decimal(8,4) NOT NULL,
  "calculation_mode" text NOT NULL DEFAULT 'exclusive',
  "is_zero_rated" boolean NOT NULL DEFAULT false,
  "is_exempt" boolean NOT NULL DEFAULT false,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "sales_account_mapping_ref" text,
  "purchase_account_mapping_ref" text,
  "last_verified_at" timestamptz,
  "review_status" text NOT NULL DEFAULT 'requires_review',
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("internal_code", "effective_from"),
  CONSTRAINT "tax_type_settings_date_order_chk" CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
CREATE INDEX IF NOT EXISTS "tax_type_settings_code_active_idx" ON "public"."tax_type_settings"("internal_code","is_active");

CREATE TABLE IF NOT EXISTS "public"."integration_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "integration_type" text NOT NULL,
  "environment" text NOT NULL DEFAULT 'sandbox',
  "enabled" boolean NOT NULL DEFAULT false,
  "credential_configured" boolean NOT NULL DEFAULT false,
  "secret_reference" text,
  "webhook_url" text,
  "webhook_status" text NOT NULL DEFAULT 'not_configured',
  "last_test_at" timestamptz,
  "last_success_at" timestamptz,
  "last_failure_at" timestamptz,
  "failure_state" text,
  "retry_state" text NOT NULL DEFAULT 'idle',
  "branch_ids" text[] NOT NULL DEFAULT '{}',
  "sanitized_metadata" jsonb,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("integration_type", "environment", "name")
);
CREATE INDEX IF NOT EXISTS "integration_settings_type_enabled_idx" ON "public"."integration_settings"("integration_type","enabled");

CREATE TABLE IF NOT EXISTS "public"."security_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "code" text NOT NULL UNIQUE,
  "value" jsonb NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "reason" text,
  "updated_by_id" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "role_key" text,
  "branch_id" uuid,
  "event_category" text NOT NULL,
  "in_app_enabled" boolean NOT NULL DEFAULT true,
  "email_enabled" boolean NOT NULL DEFAULT false,
  "sms_enabled" boolean NOT NULL DEFAULT false,
  "digest_mode" text NOT NULL DEFAULT 'immediate',
  "quiet_hours" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("user_id", "role_key", "branch_id", "event_category")
);

CREATE TABLE IF NOT EXISTS "public"."template_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "template_key" text NOT NULL,
  "template_type" text NOT NULL,
  "version" integer NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "subject" text,
  "body" text NOT NULL,
  "allowed_variables" text[] NOT NULL DEFAULT '{}',
  "sanitized_preview" jsonb,
  "approved_by_id" uuid,
  "approved_at" timestamptz,
  "activated_at" timestamptz,
  "superseded_by_id" uuid,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("template_key", "version")
);
CREATE INDEX IF NOT EXISTS "template_versions_type_status_idx" ON "public"."template_versions"("template_type","status");

CREATE TABLE IF NOT EXISTS "public"."legal_content_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "content_key" text NOT NULL,
  "title" text NOT NULL,
  "version" integer NOT NULL,
  "body" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "approved_by_id" uuid,
  "approved_at" timestamptz,
  "published_at" timestamptz,
  "superseded_by_id" uuid,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("content_key", "version")
);
CREATE INDEX IF NOT EXISTS "legal_content_versions_key_status_idx" ON "public"."legal_content_versions"("content_key","status");

CREATE TABLE IF NOT EXISTS "public"."feature_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "flag_key" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "description" text,
  "enabled" boolean NOT NULL DEFAULT false,
  "requires_configuration" jsonb,
  "history" jsonb NOT NULL DEFAULT '[]',
  "updated_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "feature_flags_enabled_idx" ON "public"."feature_flags"("enabled");
