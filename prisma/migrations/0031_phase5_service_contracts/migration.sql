-- Phase 5 service and contracts foundation. Additive only.

ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'service_reservation';
ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'service_reservation_release';
ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'service_issue';
ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'service_return';
ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'warranty_issue';
ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'loan_unit_issue';
ALTER TYPE "public"."inventory_movement_type" ADD VALUE IF NOT EXISTS 'loan_unit_return';

CREATE TYPE "public"."equipment_ownership_type" AS ENUM ('customer_owned','ceter_owned','loan_unit','leased_managed','other_confirmed');
CREATE TYPE "public"."equipment_status" AS ENUM ('pending_installation','active','under_repair','out_of_service','loaned','replaced','retired','disposed');
CREATE TYPE "public"."service_ticket_source" AS ENUM ('customer_request','telephone','email','admin','preventive_maintenance','warranty_claim','mps_alert','installation_follow_up','other_confirmed');
CREATE TYPE "public"."service_priority" AS ENUM ('low','normal','high','urgent');
CREATE TYPE "public"."service_ticket_status" AS ENUM ('new','triaged','assigned','scheduled','in_progress','waiting_for_parts','waiting_for_customer','resolved','closed','cancelled','reopened');
CREATE TYPE "public"."service_part_status" AS ENUM ('requested','approved','reserved','issued','consumed','returned_unused','returned_defective','cancelled');
CREATE TYPE "public"."contract_type" AS ENUM ('maintenance','consumables','managed_print_services','service_level_agreement','mixed_service_contract','other_confirmed');
CREATE TYPE "public"."contract_status" AS ENUM ('draft','under_review','approved','awaiting_customer_acceptance','active','suspended','expiring','expired','terminated','renewed','superseded');
CREATE TYPE "public"."warranty_status" AS ENUM ('pending_verification','active','expiring','expired','voided','replaced');
CREATE TYPE "public"."warranty_claim_status" AS ENUM ('draft','submitted','under_review','eligible','rejected','awaiting_parts','in_repair','replacement_approved','resolved','closed','cancelled');
CREATE TYPE "public"."installation_status" AS ENUM ('draft','planned','scheduled','in_progress','awaiting_prerequisite','completed','failed','cancelled');
CREATE TYPE "public"."maintenance_status" AS ENUM ('due','scheduled','in_progress','completed','missed','deferred','cancelled');
CREATE TYPE "public"."mps_agreement_status" AS ENUM ('active','suspended','expired','terminated');
CREATE TYPE "public"."meter_counter_type" AS ENUM ('mono','colour','total','scans','other_confirmed');
CREATE TYPE "public"."meter_reading_source" AS ENUM ('manual','customer_submission','technician','remote_integration','import');
CREATE TYPE "public"."meter_validation_status" AS ENUM ('pending','accepted','rejected','corrected','billed');
CREATE TYPE "public"."loan_unit_status" AS ENUM ('available','reserved','issued','overdue','returned','under_inspection','damaged','under_repair','retired');

CREATE TABLE "public"."customer_equipment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "equipment_number" text NOT NULL UNIQUE,
  "asset_tag" text,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "product_id" uuid REFERENCES "public"."products"("id") ON DELETE SET NULL,
  "serial_number_id" uuid REFERENCES "public"."serial_numbers"("id") ON DELETE SET NULL,
  "brand_name" text,
  "model_name" text,
  "external_serial" text,
  "ownership_type" "public"."equipment_ownership_type" NOT NULL DEFAULT 'customer_owned',
  "status" "public"."equipment_status" NOT NULL DEFAULT 'active',
  "condition" text,
  "site_label" text,
  "department" text,
  "site_contact" text,
  "installed_at" date,
  "last_service_at" timestamptz,
  "next_maintenance_at" date,
  "meter_required" boolean NOT NULL DEFAULT false,
  "notes" text,
  "archived_at" timestamptz,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."service_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_number" text NOT NULL UNIQUE,
  "source" "public"."service_ticket_source" NOT NULL DEFAULT 'admin',
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "equipment_id" uuid REFERENCES "public"."customer_equipment"("id") ON DELETE SET NULL,
  "contract_id" uuid,
  "warranty_id" uuid,
  "priority" "public"."service_priority" NOT NULL DEFAULT 'normal',
  "category" text,
  "reported_issue" text NOT NULL,
  "status" "public"."service_ticket_status" NOT NULL DEFAULT 'new',
  "assigned_to_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "appointment_at" timestamptz,
  "response_due_at" timestamptz,
  "resolution_due_at" timestamptz,
  "responded_at" timestamptz,
  "resolved_at" timestamptz,
  "closed_at" timestamptz,
  "sla_policy_snapshot" jsonb NOT NULL DEFAULT '{}',
  "entitlement_snapshot" jsonb NOT NULL DEFAULT '{}',
  "diagnosis" text,
  "resolution" text,
  "customer_notes" text,
  "private_notes" text,
  "related_quote_id" uuid REFERENCES "public"."quotes"("id") ON DELETE SET NULL,
  "related_invoice_id" uuid REFERENCES "public"."invoices"("id") ON DELETE SET NULL,
  "correlation_id" text UNIQUE,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."service_ticket_assignments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE,
  "technician_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE RESTRICT,
  "assigned_by_id" uuid,
  "reason" text,
  "assigned_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."service_ticket_status_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE,
  "from_status" "public"."service_ticket_status",
  "to_status" "public"."service_ticket_status" NOT NULL,
  "reason" text,
  "user_id" uuid,
  "correlation_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("ticket_id", "to_status", "correlation_id")
);

CREATE TABLE "public"."sla_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" text NOT NULL UNIQUE,
  "priority" "public"."service_priority" NOT NULL,
  "response_minutes" integer NOT NULL,
  "resolution_minutes" integer NOT NULL,
  "calendar_mode" text NOT NULL DEFAULT 'calendar_time',
  "pause_waiting_customer" boolean NOT NULL DEFAULT false,
  "pause_waiting_parts" boolean NOT NULL DEFAULT false,
  "warning_threshold_percent" integer NOT NULL DEFAULT 80,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."technician_work_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE,
  "technician_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE RESTRICT,
  "work_started_at" timestamptz NOT NULL,
  "work_ended_at" timestamptz NOT NULL,
  "duration_minutes" integer NOT NULL,
  "work_performed" text NOT NULL,
  "customer_visible_summary" text,
  "private_notes" text,
  "chargeable" boolean NOT NULL DEFAULT false,
  "labour_rate_kes" integer,
  "approval_status" text NOT NULL DEFAULT 'draft',
  "correlation_id" text UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."service_part_usages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "ticket_id" uuid NOT NULL REFERENCES "public"."service_tickets"("id") ON DELETE CASCADE,
  "product_id" uuid NOT NULL REFERENCES "public"."products"("id") ON DELETE RESTRICT,
  "location_id" uuid NOT NULL REFERENCES "public"."inventory_locations"("id") ON DELETE RESTRICT,
  "quantity" decimal(18,3) NOT NULL,
  "status" "public"."service_part_status" NOT NULL DEFAULT 'requested',
  "chargeable" boolean NOT NULL DEFAULT false,
  "covered_by" text,
  "serial_number_id" uuid REFERENCES "public"."serial_numbers"("id") ON DELETE SET NULL,
  "reservation_key" text UNIQUE,
  "issue_key" text UNIQUE,
  "return_key" text UNIQUE,
  "requested_by_id" uuid,
  "approved_by_id" uuid,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."customer_contracts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contract_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "contract_type" "public"."contract_type" NOT NULL,
  "version" integer NOT NULL DEFAULT 1,
  "status" "public"."contract_status" NOT NULL DEFAULT 'draft',
  "start_date" date,
  "end_date" date,
  "renewal_date" date,
  "notice_days" integer,
  "covered_sites" jsonb NOT NULL DEFAULT '[]',
  "covered_services" jsonb NOT NULL DEFAULT '[]',
  "included_parts" jsonb NOT NULL DEFAULT '[]',
  "exclusions" jsonb NOT NULL DEFAULT '[]',
  "response_minutes" integer,
  "resolution_minutes" integer,
  "service_hours" jsonb NOT NULL DEFAULT '{}',
  "visit_frequency" text,
  "pricing_snapshot" jsonb NOT NULL DEFAULT '{}',
  "billing_schedule" text,
  "payment_terms" text,
  "included_volumes" jsonb NOT NULL DEFAULT '{}',
  "overage_rates" jsonb NOT NULL DEFAULT '{}',
  "contacts" jsonb NOT NULL DEFAULT '[]',
  "approved_by_id" uuid,
  "approved_at" timestamptz,
  "activated_at" timestamptz,
  "terminated_at" timestamptz,
  "termination_reason" text,
  "customer_accepted_at" timestamptz,
  "superseded_by_id" uuid,
  "correlation_id" text UNIQUE,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."contract_equipment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contract_id" uuid NOT NULL REFERENCES "public"."customer_contracts"("id") ON DELETE CASCADE,
  "equipment_id" uuid NOT NULL REFERENCES "public"."customer_equipment"("id") ON DELETE RESTRICT,
  "coverage_start" date,
  "coverage_end" date,
  "entitlement_snapshot" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("contract_id", "equipment_id")
);

CREATE TABLE "public"."equipment_warranties" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "warranty_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "equipment_id" uuid NOT NULL REFERENCES "public"."customer_equipment"("id") ON DELETE RESTRICT,
  "product_id" uuid REFERENCES "public"."products"("id") ON DELETE SET NULL,
  "serial_number_id" uuid REFERENCES "public"."serial_numbers"("id") ON DELETE SET NULL,
  "provider" text,
  "coverage_type" text,
  "start_date" date,
  "end_date" date,
  "terms" text,
  "exclusions" text,
  "proof_reference" text,
  "source_snapshot" jsonb NOT NULL DEFAULT '{}',
  "status" "public"."warranty_status" NOT NULL DEFAULT 'pending_verification',
  "notes" text,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."warranty_claims" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "claim_number" text NOT NULL UNIQUE,
  "warranty_id" uuid NOT NULL REFERENCES "public"."equipment_warranties"("id") ON DELETE RESTRICT,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "equipment_id" uuid NOT NULL REFERENCES "public"."customer_equipment"("id") ON DELETE RESTRICT,
  "contract_id" uuid REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL,
  "ticket_id" uuid REFERENCES "public"."service_tickets"("id") ON DELETE SET NULL,
  "reported_fault" text NOT NULL,
  "claim_date" timestamptz NOT NULL DEFAULT now(),
  "eligibility_snapshot" jsonb NOT NULL DEFAULT '{}',
  "assessment" text,
  "provider_reference" text,
  "outcome" text,
  "status" "public"."warranty_claim_status" NOT NULL DEFAULT 'draft',
  "rejection_reason" text,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "public"."service_tickets" ADD CONSTRAINT "service_tickets_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."service_tickets" ADD CONSTRAINT "service_tickets_warranty_id_fkey" FOREIGN KEY ("warranty_id") REFERENCES "public"."equipment_warranties"("id") ON DELETE SET NULL;

CREATE TABLE "public"."service_installations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "installation_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "equipment_id" uuid NOT NULL REFERENCES "public"."customer_equipment"("id") ON DELETE RESTRICT,
  "order_id" uuid REFERENCES "public"."orders"("id") ON DELETE SET NULL,
  "delivery_id" uuid REFERENCES "public"."deliveries"("id") ON DELETE SET NULL,
  "site_snapshot" jsonb NOT NULL DEFAULT '{}',
  "site_contact_snapshot" jsonb NOT NULL DEFAULT '{}',
  "scheduled_at" timestamptz,
  "assigned_to_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "checklist_snapshot" jsonb NOT NULL DEFAULT '[]',
  "configuration_summary" text,
  "protected_configuration" jsonb NOT NULL DEFAULT '{}',
  "test_results" jsonb NOT NULL DEFAULT '[]',
  "opening_meter_snapshot" jsonb NOT NULL DEFAULT '{}',
  "customer_training_notes" text,
  "outstanding_actions" text,
  "status" "public"."installation_status" NOT NULL DEFAULT 'draft',
  "completed_at" timestamptz,
  "correlation_id" text UNIQUE,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."maintenance_plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "plan_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "contract_id" uuid REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL,
  "equipment_id" uuid REFERENCES "public"."customer_equipment"("id") ON DELETE SET NULL,
  "maintenance_type" text NOT NULL,
  "frequency" text NOT NULL,
  "scheduling_basis" text NOT NULL DEFAULT 'calendar_interval',
  "start_date" date NOT NULL,
  "end_date" date,
  "next_due_date" date,
  "checklist_template" jsonb NOT NULL DEFAULT '[]',
  "required_parts" jsonb NOT NULL DEFAULT '[]',
  "service_window" jsonb NOT NULL DEFAULT '{}',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."maintenance_occurrences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "occurrence_number" text NOT NULL UNIQUE,
  "plan_id" uuid NOT NULL REFERENCES "public"."maintenance_plans"("id") ON DELETE RESTRICT,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "equipment_id" uuid REFERENCES "public"."customer_equipment"("id") ON DELETE SET NULL,
  "due_date" date NOT NULL,
  "scheduled_at" timestamptz,
  "technician_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "checklist_result" jsonb NOT NULL DEFAULT '[]',
  "meter_snapshot" jsonb NOT NULL DEFAULT '{}',
  "findings" text,
  "recommendations" text,
  "follow_up_required" boolean NOT NULL DEFAULT false,
  "completed_at" timestamptz,
  "status" "public"."maintenance_status" NOT NULL DEFAULT 'due',
  "deferral_reason" text,
  "correlation_id" text UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("plan_id", "due_date")
);

CREATE TABLE "public"."mps_agreements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agreement_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "contract_id" uuid NOT NULL REFERENCES "public"."customer_contracts"("id") ON DELETE RESTRICT,
  "product_id" uuid REFERENCES "public"."products"("id") ON DELETE SET NULL,
  "covered_devices" jsonb NOT NULL DEFAULT '[]',
  "counter_types" jsonb NOT NULL DEFAULT '[]',
  "reading_frequency" text,
  "billing_frequency" text,
  "included_volumes" jsonb NOT NULL DEFAULT '{}',
  "overage_rates" jsonb NOT NULL DEFAULT '{}',
  "minimum_charge_kes" integer,
  "billing_day" integer,
  "last_reading_at" timestamptz,
  "next_reading_due" date,
  "last_billed_period" text,
  "next_billing_period" text,
  "status" "public"."mps_agreement_status" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."meter_readings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reading_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "equipment_id" uuid NOT NULL REFERENCES "public"."customer_equipment"("id") ON DELETE RESTRICT,
  "contract_id" uuid REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL,
  "mps_agreement_id" uuid REFERENCES "public"."mps_agreements"("id") ON DELETE SET NULL,
  "reading_at" timestamptz NOT NULL,
  "counter_type" "public"."meter_counter_type" NOT NULL,
  "reading_value" integer NOT NULL,
  "previous_reading" integer,
  "calculated_usage" integer,
  "source" "public"."meter_reading_source" NOT NULL DEFAULT 'manual',
  "captured_by_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "evidence_path" text,
  "validation_status" "public"."meter_validation_status" NOT NULL DEFAULT 'pending',
  "exception_reason" text,
  "billing_period" text,
  "correction_of_id" uuid REFERENCES "public"."meter_readings"("id") ON DELETE SET NULL,
  "correlation_id" text UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."mps_billing_cycles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agreement_id" uuid NOT NULL REFERENCES "public"."mps_agreements"("id") ON DELETE RESTRICT,
  "period_key" text NOT NULL,
  "status" text NOT NULL DEFAULT 'draft',
  "calculation_snapshot" jsonb NOT NULL DEFAULT '{}',
  "draft_invoice_id" uuid REFERENCES "public"."invoices"("id") ON DELETE SET NULL,
  "generated_at" timestamptz,
  "correlation_id" text UNIQUE,
  UNIQUE ("agreement_id", "period_key")
);

CREATE TABLE "public"."service_loan_units" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "loan_unit_number" text NOT NULL UNIQUE,
  "product_id" uuid REFERENCES "public"."products"("id") ON DELETE SET NULL,
  "equipment_id" uuid REFERENCES "public"."customer_equipment"("id") ON DELETE SET NULL,
  "serial_number_id" uuid REFERENCES "public"."serial_numbers"("id") ON DELETE SET NULL,
  "current_location_id" uuid REFERENCES "public"."inventory_locations"("id") ON DELETE SET NULL,
  "status" "public"."loan_unit_status" NOT NULL DEFAULT 'available',
  "condition" text,
  "customer_id" uuid REFERENCES "public"."customers"("id") ON DELETE SET NULL,
  "contract_id" uuid REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL,
  "ticket_id" uuid REFERENCES "public"."service_tickets"("id") ON DELETE SET NULL,
  "issue_date" date,
  "expected_return_date" date,
  "actual_return_date" date,
  "accessories_issued" jsonb NOT NULL DEFAULT '[]',
  "condition_at_issue" text,
  "condition_at_return" text,
  "deposit_reference" text,
  "issuing_user_id" uuid,
  "receiving_user_id" uuid,
  "issue_key" text UNIQUE,
  "return_key" text UNIQUE,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."customer_acknowledgements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "acknowledgement_number" text NOT NULL UNIQUE,
  "customer_id" uuid NOT NULL REFERENCES "public"."customers"("id") ON DELETE RESTRICT,
  "ticket_id" uuid REFERENCES "public"."service_tickets"("id") ON DELETE SET NULL,
  "installation_id" uuid REFERENCES "public"."service_installations"("id") ON DELETE SET NULL,
  "maintenance_occurrence_id" uuid REFERENCES "public"."maintenance_occurrences"("id") ON DELETE SET NULL,
  "meter_reading_id" uuid REFERENCES "public"."meter_readings"("id") ON DELETE SET NULL,
  "loan_unit_id" uuid REFERENCES "public"."service_loan_units"("id") ON DELETE SET NULL,
  "contract_id" uuid REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL,
  "acknowledged_by_name" text,
  "acknowledged_by_role" text,
  "acknowledged_at" timestamptz,
  "method" text NOT NULL DEFAULT 'recorded',
  "refused" boolean NOT NULL DEFAULT false,
  "refusal_reason" text,
  "consent_wording_version" text,
  "signature_storage_path" text,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_by_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "public"."internal_notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "recipient_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "notification_key" text NOT NULL UNIQUE,
  "title" text NOT NULL,
  "body" text,
  "target_type" text NOT NULL,
  "target_id" text,
  "status" text NOT NULL DEFAULT 'unread',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "read_at" timestamptz
);

ALTER TABLE "public"."documents" ADD COLUMN "equipment_id" uuid REFERENCES "public"."customer_equipment"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "service_ticket_id" uuid REFERENCES "public"."service_tickets"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "installation_id" uuid REFERENCES "public"."service_installations"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "maintenance_occurrence_id" uuid REFERENCES "public"."maintenance_occurrences"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "warranty_claim_id" uuid REFERENCES "public"."warranty_claims"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "customer_contract_id" uuid REFERENCES "public"."customer_contracts"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "loan_unit_id" uuid REFERENCES "public"."service_loan_units"("id") ON DELETE SET NULL;
ALTER TABLE "public"."documents" ADD COLUMN "meter_reading_id" uuid REFERENCES "public"."meter_readings"("id") ON DELETE SET NULL;

CREATE INDEX "customer_contracts_customer_id_idx" ON "public"."customer_contracts"("customer_id");
CREATE INDEX "customer_equipment_customer_id_idx" ON "public"."customer_equipment"("customer_id");
CREATE INDEX "customer_equipment_serial_number_id_idx" ON "public"."customer_equipment"("serial_number_id");
CREATE INDEX "service_tickets_customer_id_idx" ON "public"."service_tickets"("customer_id");
CREATE INDEX "service_tickets_equipment_id_idx" ON "public"."service_tickets"("equipment_id");
CREATE INDEX "service_tickets_assigned_to_id_idx" ON "public"."service_tickets"("assigned_to_id");
CREATE INDEX "service_tickets_status_idx" ON "public"."service_tickets"("status");
CREATE INDEX "service_ticket_assignments_technician_id_idx" ON "public"."service_ticket_assignments"("technician_id");
CREATE INDEX "service_part_usages_ticket_id_idx" ON "public"."service_part_usages"("ticket_id");
CREATE INDEX "service_part_usages_status_idx" ON "public"."service_part_usages"("status");
CREATE INDEX "customer_contracts_status_idx" ON "public"."customer_contracts"("status");
CREATE INDEX "contract_equipment_equipment_id_idx" ON "public"."contract_equipment"("equipment_id");
CREATE INDEX "equipment_warranties_equipment_id_idx" ON "public"."equipment_warranties"("equipment_id");
CREATE INDEX "warranty_claims_status_idx" ON "public"."warranty_claims"("status");
CREATE INDEX "service_installations_status_idx" ON "public"."service_installations"("status");
CREATE INDEX "maintenance_plans_next_due_idx" ON "public"."maintenance_plans"("is_active","next_due_date");
CREATE INDEX "maintenance_occurrences_status_due_idx" ON "public"."maintenance_occurrences"("status","due_date");
CREATE INDEX "mps_agreements_status_due_idx" ON "public"."mps_agreements"("status","next_reading_due");
CREATE INDEX "meter_readings_equipment_counter_idx" ON "public"."meter_readings"("equipment_id","counter_type","reading_at");
CREATE INDEX "service_loan_units_status_due_idx" ON "public"."service_loan_units"("status","expected_return_date");
CREATE INDEX "internal_notifications_recipient_idx" ON "public"."internal_notifications"("recipient_id","status");
