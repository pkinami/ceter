create table if not exists public.sales_credit_notes (
  id uuid primary key default gen_random_uuid(),
  credit_note_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  invoice_id uuid references public.invoices(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  amount_kes integer not null,
  reason text not null,
  reference text,
  status text not null default 'draft',
  issued_at timestamptz,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_credit_notes_customer_id_idx on public.sales_credit_notes(customer_id);
create index if not exists sales_credit_notes_invoice_id_idx on public.sales_credit_notes(invoice_id);
create index if not exists sales_credit_notes_payment_id_idx on public.sales_credit_notes(payment_id);
create index if not exists sales_credit_notes_status_idx on public.sales_credit_notes(status);

create table if not exists public.purchase_debit_notes (
  id uuid primary key default gen_random_uuid(),
  debit_note_number text not null unique,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  supplier_invoice_id uuid references public.supplier_invoices(id) on delete set null,
  purchase_order_id uuid references public.purchase_orders(id) on delete set null,
  amount_kes integer not null,
  reason text not null,
  reference text,
  status text not null default 'draft',
  issued_at timestamptz,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_debit_notes_supplier_id_idx on public.purchase_debit_notes(supplier_id);
create index if not exists purchase_debit_notes_supplier_invoice_id_idx on public.purchase_debit_notes(supplier_invoice_id);
create index if not exists purchase_debit_notes_purchase_order_id_idx on public.purchase_debit_notes(purchase_order_id);
create index if not exists purchase_debit_notes_status_idx on public.purchase_debit_notes(status);

create table if not exists public.recurring_invoice_schedules (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  name text not null,
  frequency text not null default 'monthly',
  next_run_at date not null,
  amount_kes integer not null,
  status text not null default 'active',
  notes text,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_invoice_schedules_customer_id_idx on public.recurring_invoice_schedules(customer_id);
create index if not exists recurring_invoice_schedules_status_next_run_at_idx on public.recurring_invoice_schedules(status, next_run_at);

create table if not exists public.sales_commission_rates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate_percent numeric(6, 3) not null,
  applies_to text not null default 'paid_invoices',
  is_active boolean not null default true,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_commission_rates_is_active_idx on public.sales_commission_rates(is_active);

create table if not exists public.sales_commission_tiers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  threshold_kes integer not null,
  rate_percent numeric(6, 3) not null,
  is_active boolean not null default true,
  created_by_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_commission_tiers_is_active_threshold_kes_idx on public.sales_commission_tiers(is_active, threshold_kes);

create table if not exists public.sales_commissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  invoice_id uuid references public.invoices(id) on delete set null,
  commission_ref text not null,
  base_amount_kes integer not null,
  rate_percent numeric(6, 3) not null,
  amount_kes integer not null,
  status text not null default 'earned',
  earned_at timestamptz not null default now(),
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists sales_commissions_profile_id_idx on public.sales_commissions(profile_id);
create index if not exists sales_commissions_invoice_id_idx on public.sales_commissions(invoice_id);
create index if not exists sales_commissions_status_idx on public.sales_commissions(status);

create table if not exists public.sales_commission_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique,
  profile_id uuid references public.profiles(id) on delete set null,
  amount_kes integer not null,
  method public.business_payment_method not null default 'bank_transfer',
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  created_by_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists sales_commission_payments_profile_id_idx on public.sales_commission_payments(profile_id);
create index if not exists sales_commission_payments_paid_at_idx on public.sales_commission_payments(paid_at);
