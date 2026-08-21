-- Ceter Business Suite ERP expansion: procurement, accounting, compliance, eTIMS, tenders, and document vault.

ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'purchase_order';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'supplier_invoice';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'delivery_note';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'customer_statement';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'expense_report';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'financial_report';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'tax_report';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'tender_document';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'company_document';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'contract';

CREATE TYPE public.purchase_request_status AS ENUM ('draft', 'requested', 'approved', 'rejected', 'ordered', 'cancelled');
CREATE TYPE public.purchase_order_status AS ENUM ('draft', 'sent', 'confirmed', 'partially_received', 'completed', 'cancelled');
CREATE TYPE public.goods_received_status AS ENUM ('received', 'reversed');
CREATE TYPE public.supplier_invoice_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE public.account_type AS ENUM ('asset', 'liability', 'equity', 'income', 'expense');
CREATE TYPE public.journal_source_type AS ENUM ('sales_invoice', 'customer_payment', 'expense', 'supplier_invoice', 'supplier_payment', 'stock_receipt', 'manual');
CREATE TYPE public.tax_type AS ENUM ('vat', 'paye', 'nssf', 'sha_shif', 'affordable_housing_levy', 'nita', 'kra_other');
CREATE TYPE public.compliance_status AS ENUM ('draft', 'pending', 'filed', 'paid', 'overdue', 'not_applicable');
CREATE TYPE public.setting_value_type AS ENUM ('percent', 'amount', 'text');
CREATE TYPE public.compliance_item_type AS ENUM ('vat_deadline', 'paye_deadline', 'licence_expiry', 'certificate_expiry', 'statutory_payment', 'tender_document_expiry', 'other');
CREATE TYPE public.etims_submission_status AS ENUM ('not_ready', 'pending', 'submitted', 'accepted', 'rejected', 'failed', 'retry_required');
CREATE TYPE public.tender_status AS ENUM ('new', 'reviewing', 'preparing', 'submitted', 'won', 'lost', 'cancelled');
CREATE TYPE public.tender_document_type AS ENUM ('tender_document', 'requirement', 'compliance_document', 'technical_document', 'pricing_schedule', 'submission_checklist');
CREATE TYPE public.document_category AS ENUM ('company', 'tax', 'tender', 'supplier', 'customer', 'contract', 'finance', 'other');

ALTER TABLE public.invoices
  ADD COLUMN etims_status public.etims_submission_status NOT NULL DEFAULT 'not_ready',
  ADD COLUMN etims_external_id text,
  ADD COLUMN etims_control_number text,
  ADD COLUMN etims_qr_reference text,
  ADD COLUMN etims_verification_url text;

ALTER TABLE public.stock_movements
  ADD COLUMN unit_cost_kes integer,
  ADD COLUMN supplier_id uuid,
  ADD COLUMN purchase_order_id uuid,
  ADD COLUMN goods_received_note_id uuid;

CREATE TABLE public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  kra_pin text,
  notes text,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT suppliers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.purchase_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_number text NOT NULL,
  supplier_id uuid,
  status public.purchase_request_status NOT NULL DEFAULT 'draft',
  needed_by date,
  reason text,
  notes text,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_requests_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_requests_request_number_key UNIQUE (request_number),
  CONSTRAINT purchase_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  po_number text NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_request_id uuid,
  status public.purchase_order_status NOT NULL DEFAULT 'draft',
  expected_delivery_date date,
  subtotal_kes integer NOT NULL DEFAULT 0,
  vat_kes integer NOT NULL DEFAULT 0,
  total_kes integer NOT NULL DEFAULT 0,
  notes text,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT purchase_orders_purchase_request_id_fkey FOREIGN KEY (purchase_request_id) REFERENCES public.purchase_requests(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL,
  product_id uuid NOT NULL,
  description text NOT NULL,
  quantity integer NOT NULL,
  unit_price_kes integer NOT NULL,
  vat_kes integer NOT NULL DEFAULT 0,
  line_total_kes integer NOT NULL,
  received_quantity integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT purchase_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE TABLE public.goods_received_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  grn_number text NOT NULL,
  supplier_id uuid NOT NULL,
  purchase_order_id uuid NOT NULL,
  delivery_date date NOT NULL,
  status public.goods_received_status NOT NULL DEFAULT 'received',
  delivery_reference text,
  notes text,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT goods_received_notes_pkey PRIMARY KEY (id),
  CONSTRAINT goods_received_notes_grn_number_key UNIQUE (grn_number),
  CONSTRAINT goods_received_notes_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT goods_received_notes_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE TABLE public.goods_received_note_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  goods_received_note_id uuid NOT NULL,
  purchase_order_item_id uuid NOT NULL,
  product_id uuid NOT NULL,
  quantity_received integer NOT NULL,
  unit_cost_kes integer NOT NULL,
  CONSTRAINT goods_received_note_items_pkey PRIMARY KEY (id),
  CONSTRAINT goods_received_note_items_goods_received_note_id_fkey FOREIGN KEY (goods_received_note_id) REFERENCES public.goods_received_notes(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT goods_received_note_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT goods_received_note_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE TABLE public.supplier_invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_invoice_number text NOT NULL,
  supplier_reference text,
  supplier_id uuid NOT NULL,
  purchase_order_id uuid,
  status public.supplier_invoice_status NOT NULL DEFAULT 'unpaid',
  subtotal_kes integer NOT NULL DEFAULT 0,
  vat_kes integer NOT NULL DEFAULT 0,
  total_kes integer NOT NULL DEFAULT 0,
  paid_kes integer NOT NULL DEFAULT 0,
  balance_kes integer NOT NULL DEFAULT 0,
  invoice_date date NOT NULL,
  due_date date,
  notes text,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT supplier_invoices_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_invoices_supplier_invoice_number_key UNIQUE (supplier_invoice_number),
  CONSTRAINT supplier_invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT supplier_invoices_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE public.supplier_invoice_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_invoice_id uuid NOT NULL,
  purchase_order_item_id uuid,
  product_id uuid,
  description text NOT NULL,
  quantity integer NOT NULL,
  unit_price_kes integer NOT NULL,
  vat_kes integer NOT NULL DEFAULT 0,
  line_total_kes integer NOT NULL,
  CONSTRAINT supplier_invoice_items_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_invoice_items_supplier_invoice_id_fkey FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT supplier_invoice_items_purchase_order_item_id_fkey FOREIGN KEY (purchase_order_item_id) REFERENCES public.purchase_order_items(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT supplier_invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE public.supplier_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  supplier_payment_number text NOT NULL,
  supplier_id uuid NOT NULL,
  supplier_invoice_id uuid NOT NULL,
  amount_kes integer NOT NULL,
  method public.business_payment_method NOT NULL,
  reference text,
  notes text,
  paid_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT supplier_payments_pkey PRIMARY KEY (id),
  CONSTRAINT supplier_payments_supplier_payment_number_key UNIQUE (supplier_payment_number),
  CONSTRAINT supplier_payments_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT supplier_payments_supplier_invoice_id_fkey FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  type public.account_type NOT NULL,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_code_key UNIQUE (code)
);

CREATE TABLE public.journal_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  entry_number text NOT NULL,
  source_type public.journal_source_type NOT NULL,
  memo text,
  entry_date date NOT NULL,
  invoice_id uuid,
  payment_id uuid,
  expense_id uuid,
  supplier_invoice_id uuid,
  supplier_payment_id uuid,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT journal_entries_pkey PRIMARY KEY (id),
  CONSTRAINT journal_entries_entry_number_key UNIQUE (entry_number),
  CONSTRAINT journal_entries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT journal_entries_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT journal_entries_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT journal_entries_supplier_invoice_id_fkey FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT journal_entries_supplier_payment_id_fkey FOREIGN KEY (supplier_payment_id) REFERENCES public.supplier_payments(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE public.journal_lines (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL,
  account_id uuid NOT NULL,
  direction public.transaction_direction NOT NULL,
  amount_kes integer NOT NULL,
  memo text,
  CONSTRAINT journal_lines_pkey PRIMARY KEY (id),
  CONSTRAINT journal_lines_journal_entry_id_fkey FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT journal_lines_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE RESTRICT ON UPDATE NO ACTION
);

CREATE TABLE public.tax_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tax_type public.tax_type NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  output_tax_kes integer NOT NULL DEFAULT 0,
  input_tax_kes integer NOT NULL DEFAULT 0,
  payable_kes integer NOT NULL DEFAULT 0,
  status public.compliance_status NOT NULL DEFAULT 'draft',
  notes text,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tax_records_pkey PRIMARY KEY (id)
);

CREATE TABLE public.compliance_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  agency text NOT NULL,
  value_type public.setting_value_type NOT NULL DEFAULT 'percent',
  value numeric(12,4),
  effective_from date,
  effective_to date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_settings_pkey PRIMARY KEY (id),
  CONSTRAINT compliance_settings_code_key UNIQUE (code)
);

CREATE TABLE public.compliance_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  agency text NOT NULL,
  compliance_type public.compliance_item_type NOT NULL,
  due_date date NOT NULL,
  status public.compliance_status NOT NULL DEFAULT 'draft',
  amount_kes integer,
  reference text,
  notes text,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT compliance_items_pkey PRIMARY KEY (id)
);

CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  kra_pin text,
  national_id text,
  nssf_number text,
  sha_number text,
  email text,
  phone text,
  base_salary_kes integer NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT employees_pkey PRIMARY KEY (id)
);

CREATE TABLE public.payroll_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  gross_pay_kes integer NOT NULL,
  paye_kes integer NOT NULL DEFAULT 0,
  nssf_kes integer NOT NULL DEFAULT 0,
  sha_kes integer NOT NULL DEFAULT 0,
  housing_levy_kes integer NOT NULL DEFAULT 0,
  nita_kes integer NOT NULL DEFAULT 0,
  net_pay_kes integer NOT NULL DEFAULT 0,
  status public.compliance_status NOT NULL DEFAULT 'draft',
  notes text,
  CONSTRAINT payroll_records_pkey PRIMARY KEY (id),
  CONSTRAINT payroll_records_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE public.etims_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  status public.etims_submission_status NOT NULL DEFAULT 'not_ready',
  external_invoice_id text,
  control_number text,
  qr_reference text,
  verification_url text,
  last_error text,
  retry_count integer NOT NULL DEFAULT 0,
  submitted_at timestamptz(6),
  last_attempt_at timestamptz(6),
  payload jsonb,
  response jsonb,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT etims_records_pkey PRIMARY KEY (id),
  CONSTRAINT etims_records_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE public.etims_submission_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  etims_record_id uuid NOT NULL,
  status public.etims_submission_status NOT NULL,
  message text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT etims_submission_logs_pkey PRIMARY KEY (id),
  CONSTRAINT etims_submission_logs_etims_record_id_fkey FOREIGN KEY (etims_record_id) REFERENCES public.etims_records(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE public.tenders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tender_title text NOT NULL,
  organization text NOT NULL,
  tender_number text,
  closing_date date,
  tender_value_kes integer,
  status public.tender_status NOT NULL DEFAULT 'new',
  technical_notes text,
  pricing_notes text,
  submission_notes text,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tenders_pkey PRIMARY KEY (id)
);

CREATE TABLE public.tender_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL,
  title text NOT NULL,
  document_type public.tender_document_type NOT NULL DEFAULT 'tender_document',
  bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  expiry_date date,
  notes text,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tender_documents_pkey PRIMARY KEY (id),
  CONSTRAINT tender_documents_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE public.tender_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL,
  requirement text NOT NULL,
  category text,
  is_required boolean NOT NULL DEFAULT true,
  is_complete boolean NOT NULL DEFAULT false,
  due_date date,
  notes text,
  CONSTRAINT tender_requirements_pkey PRIMARY KEY (id),
  CONSTRAINT tender_requirements_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE public.tender_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tender_id uuid NOT NULL,
  product_id uuid,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_kes integer NOT NULL DEFAULT 0,
  notes text,
  CONSTRAINT tender_products_pkey PRIMARY KEY (id),
  CONSTRAINT tender_products_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT tender_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE public.company_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category public.document_category NOT NULL DEFAULT 'company',
  bucket text NOT NULL,
  storage_path text NOT NULL,
  public_url text,
  expiry_date date,
  reminder_date date,
  notes text,
  tender_id uuid,
  supplier_id uuid,
  customer_id uuid,
  created_by_id uuid,
  created_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT company_documents_pkey PRIMARY KEY (id),
  CONSTRAINT company_documents_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT company_documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT company_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

ALTER TABLE public.transactions
  ADD COLUMN supplier_invoice_id uuid,
  ADD COLUMN supplier_payment_id uuid,
  ADD CONSTRAINT transactions_supplier_invoice_id_fkey FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT transactions_supplier_payment_id_fkey FOREIGN KEY (supplier_payment_id) REFERENCES public.supplier_payments(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE public.documents
  ADD COLUMN supplier_id uuid,
  ADD COLUMN purchase_order_id uuid,
  ADD COLUMN supplier_invoice_id uuid,
  ADD COLUMN tender_id uuid,
  ADD COLUMN company_document_id uuid,
  ADD COLUMN category public.document_category NOT NULL DEFAULT 'company',
  ADD COLUMN expiry_date date,
  ADD COLUMN reminder_date date,
  ADD COLUMN notes text,
  ADD CONSTRAINT documents_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT documents_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT documents_supplier_invoice_id_fkey FOREIGN KEY (supplier_invoice_id) REFERENCES public.supplier_invoices(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT documents_tender_id_fkey FOREIGN KEY (tender_id) REFERENCES public.tenders(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT documents_company_document_id_fkey FOREIGN KEY (company_document_id) REFERENCES public.company_documents(id) ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TABLE public.stock_movements
  ADD CONSTRAINT stock_movements_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT stock_movements_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE SET NULL ON UPDATE NO ACTION,
  ADD CONSTRAINT stock_movements_goods_received_note_id_fkey FOREIGN KEY (goods_received_note_id) REFERENCES public.goods_received_notes(id) ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX invoices_etims_status_idx ON public.invoices(etims_status);
CREATE INDEX stock_movements_supplier_id_idx ON public.stock_movements(supplier_id);
CREATE INDEX stock_movements_purchase_order_id_idx ON public.stock_movements(purchase_order_id);
CREATE INDEX stock_movements_goods_received_note_id_idx ON public.stock_movements(goods_received_note_id);
CREATE INDEX suppliers_company_name_idx ON public.suppliers(company_name);
CREATE INDEX suppliers_email_idx ON public.suppliers(email);
CREATE INDEX suppliers_phone_idx ON public.suppliers(phone);
CREATE INDEX purchase_requests_supplier_id_idx ON public.purchase_requests(supplier_id);
CREATE INDEX purchase_requests_status_idx ON public.purchase_requests(status);
CREATE INDEX purchase_orders_supplier_id_idx ON public.purchase_orders(supplier_id);
CREATE INDEX purchase_orders_purchase_request_id_idx ON public.purchase_orders(purchase_request_id);
CREATE INDEX purchase_orders_status_idx ON public.purchase_orders(status);
CREATE INDEX purchase_orders_expected_delivery_date_idx ON public.purchase_orders(expected_delivery_date);
CREATE INDEX purchase_order_items_purchase_order_id_idx ON public.purchase_order_items(purchase_order_id);
CREATE INDEX purchase_order_items_product_id_idx ON public.purchase_order_items(product_id);
CREATE INDEX goods_received_notes_supplier_id_idx ON public.goods_received_notes(supplier_id);
CREATE INDEX goods_received_notes_purchase_order_id_idx ON public.goods_received_notes(purchase_order_id);
CREATE INDEX goods_received_notes_delivery_date_idx ON public.goods_received_notes(delivery_date);
CREATE INDEX goods_received_note_items_goods_received_note_id_idx ON public.goods_received_note_items(goods_received_note_id);
CREATE INDEX goods_received_note_items_purchase_order_item_id_idx ON public.goods_received_note_items(purchase_order_item_id);
CREATE INDEX goods_received_note_items_product_id_idx ON public.goods_received_note_items(product_id);
CREATE INDEX supplier_invoices_supplier_id_idx ON public.supplier_invoices(supplier_id);
CREATE INDEX supplier_invoices_purchase_order_id_idx ON public.supplier_invoices(purchase_order_id);
CREATE INDEX supplier_invoices_status_idx ON public.supplier_invoices(status);
CREATE INDEX supplier_invoices_due_date_idx ON public.supplier_invoices(due_date);
CREATE INDEX supplier_invoice_items_supplier_invoice_id_idx ON public.supplier_invoice_items(supplier_invoice_id);
CREATE INDEX supplier_invoice_items_purchase_order_item_id_idx ON public.supplier_invoice_items(purchase_order_item_id);
CREATE INDEX supplier_invoice_items_product_id_idx ON public.supplier_invoice_items(product_id);
CREATE INDEX supplier_payments_supplier_id_idx ON public.supplier_payments(supplier_id);
CREATE INDEX supplier_payments_supplier_invoice_id_idx ON public.supplier_payments(supplier_invoice_id);
CREATE INDEX supplier_payments_paid_at_idx ON public.supplier_payments(paid_at);
CREATE INDEX accounts_type_idx ON public.accounts(type);
CREATE INDEX journal_entries_source_type_entry_date_idx ON public.journal_entries(source_type, entry_date);
CREATE INDEX journal_entries_invoice_id_idx ON public.journal_entries(invoice_id);
CREATE INDEX journal_entries_payment_id_idx ON public.journal_entries(payment_id);
CREATE INDEX journal_entries_expense_id_idx ON public.journal_entries(expense_id);
CREATE INDEX journal_entries_supplier_invoice_id_idx ON public.journal_entries(supplier_invoice_id);
CREATE INDEX journal_entries_supplier_payment_id_idx ON public.journal_entries(supplier_payment_id);
CREATE INDEX journal_lines_journal_entry_id_idx ON public.journal_lines(journal_entry_id);
CREATE INDEX journal_lines_account_id_idx ON public.journal_lines(account_id);
CREATE INDEX tax_records_tax_type_period_start_period_end_idx ON public.tax_records(tax_type, period_start, period_end);
CREATE INDEX tax_records_status_idx ON public.tax_records(status);
CREATE INDEX compliance_settings_agency_is_active_idx ON public.compliance_settings(agency, is_active);
CREATE INDEX compliance_items_due_date_idx ON public.compliance_items(due_date);
CREATE INDEX compliance_items_status_idx ON public.compliance_items(status);
CREATE INDEX compliance_items_agency_idx ON public.compliance_items(agency);
CREATE INDEX employees_is_active_idx ON public.employees(is_active);
CREATE INDEX payroll_records_employee_id_idx ON public.payroll_records(employee_id);
CREATE INDEX payroll_records_period_start_period_end_idx ON public.payroll_records(period_start, period_end);
CREATE INDEX etims_records_invoice_id_idx ON public.etims_records(invoice_id);
CREATE INDEX etims_records_status_idx ON public.etims_records(status);
CREATE INDEX etims_submission_logs_etims_record_id_created_at_idx ON public.etims_submission_logs(etims_record_id, created_at);
CREATE INDEX tenders_status_idx ON public.tenders(status);
CREATE INDEX tenders_closing_date_idx ON public.tenders(closing_date);
CREATE INDEX tender_documents_tender_id_idx ON public.tender_documents(tender_id);
CREATE INDEX tender_documents_document_type_idx ON public.tender_documents(document_type);
CREATE INDEX tender_documents_expiry_date_idx ON public.tender_documents(expiry_date);
CREATE INDEX tender_requirements_tender_id_idx ON public.tender_requirements(tender_id);
CREATE INDEX tender_requirements_is_complete_idx ON public.tender_requirements(is_complete);
CREATE INDEX tender_products_tender_id_idx ON public.tender_products(tender_id);
CREATE INDEX tender_products_product_id_idx ON public.tender_products(product_id);
CREATE INDEX company_documents_category_idx ON public.company_documents(category);
CREATE INDEX company_documents_expiry_date_idx ON public.company_documents(expiry_date);
CREATE INDEX company_documents_tender_id_idx ON public.company_documents(tender_id);
CREATE INDEX company_documents_supplier_id_idx ON public.company_documents(supplier_id);
CREATE INDEX company_documents_customer_id_idx ON public.company_documents(customer_id);
CREATE INDEX transactions_supplier_invoice_id_idx ON public.transactions(supplier_invoice_id);
CREATE INDEX transactions_supplier_payment_id_idx ON public.transactions(supplier_payment_id);
CREATE INDEX documents_supplier_id_idx ON public.documents(supplier_id);
CREATE INDEX documents_purchase_order_id_idx ON public.documents(purchase_order_id);
CREATE INDEX documents_supplier_invoice_id_idx ON public.documents(supplier_invoice_id);
CREATE INDEX documents_tender_id_idx ON public.documents(tender_id);
CREATE INDEX documents_company_document_id_idx ON public.documents(company_document_id);
CREATE INDEX documents_category_expiry_date_idx ON public.documents(category, expiry_date);

INSERT INTO public.accounts (code, name, type, is_system) VALUES
  ('1000', 'Cash', 'asset', true),
  ('1010', 'Bank', 'asset', true),
  ('1200', 'Inventory', 'asset', true),
  ('1300', 'Customer Receivables', 'asset', true),
  ('2000', 'Supplier Payables', 'liability', true),
  ('2100', 'Taxes Payable', 'liability', true),
  ('4000', 'Product Sales', 'income', true),
  ('4010', 'Service Income', 'income', true),
  ('5000', 'Transport', 'expense', true),
  ('5010', 'Salaries', 'expense', true),
  ('5020', 'Rent', 'expense', true),
  ('5030', 'Marketing', 'expense', true),
  ('5090', 'General Expenses', 'expense', true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.compliance_settings (code, name, agency, value_type, value, effective_from, notes) VALUES
  ('VAT_STANDARD_RATE', 'VAT standard rate', 'KRA', 'percent', 16.0000, '2026-01-01', 'Configurable rate used for VAT preparation; verify before filing.'),
  ('PAYE_DUE_DAY', 'PAYE return due day of following month', 'KRA', 'amount', 9.0000, '2026-01-01', 'KRA guidance: PAYE return and payment are due by the 9th of the following month.'),
  ('VAT_DUE_DAY', 'VAT return due day of following month', 'KRA', 'amount', 20.0000, '2026-01-01', 'KRA guidance: VAT return and payment are due by the 20th of the following month.'),
  ('AHL_EMPLOYEE_RATE', 'Affordable Housing Levy employee rate', 'KRA', 'percent', 1.5000, '2026-01-01', 'Configurable statutory rate; do not hard-code in payroll logic.'),
  ('AHL_EMPLOYER_RATE', 'Affordable Housing Levy employer rate', 'KRA', 'percent', 1.5000, '2026-01-01', 'Configurable statutory rate; do not hard-code in payroll logic.'),
  ('NSSF_EMPLOYEE_RATE', 'NSSF employee rate', 'NSSF', 'percent', 6.0000, '2026-01-01', 'Configurable NSSF preparation rate subject to earning limits.'),
  ('NSSF_EMPLOYER_RATE', 'NSSF employer rate', 'NSSF', 'percent', 6.0000, '2026-01-01', 'Configurable NSSF preparation rate subject to earning limits.'),
  ('SHA_SHIF_RATE', 'SHA/SHIF contribution rate', 'SHA', 'percent', NULL, '2026-01-01', 'Configure current SHA/SHIF rate before payroll preparation.'),
  ('NITA_LEVY', 'NITA levy', 'NITA', 'amount', NULL, '2026-01-01', 'Configure current NITA levy before payroll preparation.')
ON CONFLICT (code) DO NOTHING;
