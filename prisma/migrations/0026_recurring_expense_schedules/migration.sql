create table if not exists public.recurring_expense_schedules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid null references public.expense_categories(id) on delete set null,
  name text not null,
  supplier text null,
  frequency text not null default 'monthly',
  next_run_at date not null,
  amount_kes integer not null,
  method public.business_payment_method not null default 'cash',
  status text not null default 'active',
  notes text null,
  created_by_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recurring_expense_schedules_category_id_idx
  on public.recurring_expense_schedules(category_id);

create index if not exists recurring_expense_schedules_status_next_run_at_idx
  on public.recurring_expense_schedules(status, next_run_at);
