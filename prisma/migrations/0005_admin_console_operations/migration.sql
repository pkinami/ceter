do $$ begin
  alter type public.profile_role add value if not exists 'owner';
  alter type public.profile_role add value if not exists 'manager';
  alter type public.profile_role add value if not exists 'sales';
  alter type public.profile_role add value if not exists 'store';
exception
  when undefined_object then null;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text in ('admin', 'owner', 'manager')
  );
$$;

do $$ begin
  create type public.product_compatibility_type as enum ('TONER', 'DRUM', 'INKJET', 'SPARE_PART', 'ACCESSORY');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.stock_movement_reason as enum ('SALE', 'PURCHASE', 'RETURN', 'DAMAGE', 'CORRECTION', 'OPENING_BALANCE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.product_serial_status as enum ('IN_STOCK', 'ALLOCATED', 'DELIVERED', 'RETURNED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.enrichment_job_status as enum ('PENDING', 'RUNNING', 'DONE', 'FAILED');
exception
  when duplicate_object then null;
end $$;

alter table public.products
  add column if not exists mpn text,
  add column if not exists sku text,
  add column if not exists cost_price_kes integer check (cost_price_kes is null or cost_price_kes >= 0),
  add column if not exists supplier_name text,
  add column if not exists supplier_lead_time_days integer check (supplier_lead_time_days is null or supplier_lead_time_days >= 0),
  add column if not exists reorder_level integer not null default 0 check (reorder_level >= 0),
  add column if not exists reorder_quantity integer not null default 0 check (reorder_quantity >= 0),
  add column if not exists is_published boolean not null default true,
  add column if not exists enriched_fields jsonb not null default '{}'::jsonb,
  add column if not exists enriched_at timestamptz;

alter table public.order_items
  add column if not exists service_label text;

create table if not exists public.product_compatibilities (
  id uuid primary key default gen_random_uuid(),
  printer_id uuid not null references public.products(id) on delete cascade on update no action,
  consumable_id uuid not null references public.products(id) on delete cascade on update no action,
  relation_type public.product_compatibility_type not null,
  created_at timestamptz not null default now(),
  unique (printer_id, consumable_id, relation_type)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update no action,
  delta integer not null,
  reason public.stock_movement_reason not null,
  reference text,
  user_id uuid references public.profiles(id) on delete set null on update no action,
  created_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update no action,
  price_kes integer not null check (price_kes >= 0),
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  changed_by uuid references public.profiles(id) on delete set null on update no action,
  note text
);

create table if not exists public.product_serials (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update no action,
  serial_number text not null,
  status public.product_serial_status not null default 'IN_STOCK',
  order_id uuid references public.orders(id) on delete set null on update no action,
  order_item_id uuid references public.order_items(id) on delete set null on update no action,
  delivered_at timestamptz,
  warranty_months integer check (warranty_months is null or warranty_months >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, serial_number)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null on update no action,
  entity text not null,
  entity_id text not null,
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.enrichment_jobs (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade on update no action,
  provider text not null,
  status public.enrichment_job_status not null default 'PENDING',
  requested_by uuid references public.profiles(id) on delete set null on update no action,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.icecat_lookup_cache (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  lookup_key text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, lookup_key)
);

create table if not exists public.icecat_category_mappings (
  id uuid primary key default gen_random_uuid(),
  icecat_category text not null unique,
  category_id uuid not null references public.categories(id) on delete cascade on update no action,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.quote_requests
  add column if not exists owner_id uuid,
  add column if not exists quoted_value_kes integer check (quoted_value_kes is null or quoted_value_kes >= 0),
  add column if not exists follow_up_at timestamptz,
  add column if not exists issued_at timestamptz,
  add column if not exists valid_until timestamptz,
  add column if not exists payment_terms text;

create table if not exists public.quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quote_requests(id) on delete cascade on update no action,
  product_id uuid references public.products(id) on delete set null on update no action,
  description text not null,
  quantity integer not null check (quantity > 0),
  unit_price_kes integer not null check (unit_price_kes >= 0),
  unit_cost_kes integer check (unit_cost_kes is null or unit_cost_kes >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_mpn_idx on public.products(mpn);
create index if not exists products_sku_idx on public.products(sku);
create index if not exists products_supplier_name_idx on public.products(supplier_name);
create index if not exists products_is_published_idx on public.products(is_published);
create index if not exists product_compatibilities_printer_id_idx on public.product_compatibilities(printer_id);
create index if not exists product_compatibilities_consumable_id_idx on public.product_compatibilities(consumable_id);
create index if not exists stock_movements_product_id_created_at_idx on public.stock_movements(product_id, created_at);
create index if not exists stock_movements_user_id_idx on public.stock_movements(user_id);
create index if not exists price_history_product_id_effective_from_idx on public.price_history(product_id, effective_from);
create index if not exists price_history_changed_by_idx on public.price_history(changed_by);
create index if not exists product_serials_status_idx on public.product_serials(status);
create index if not exists product_serials_order_id_idx on public.product_serials(order_id);
create index if not exists audit_logs_entity_entity_id_idx on public.audit_logs(entity, entity_id);
create index if not exists audit_logs_user_id_created_at_idx on public.audit_logs(user_id, created_at);
create index if not exists enrichment_jobs_product_id_status_idx on public.enrichment_jobs(product_id, status);
create index if not exists enrichment_jobs_status_created_at_idx on public.enrichment_jobs(status, created_at);
create index if not exists icecat_lookup_cache_updated_at_idx on public.icecat_lookup_cache(updated_at);
create index if not exists icecat_category_mappings_category_id_idx on public.icecat_category_mappings(category_id);
create index if not exists quote_lines_quote_id_idx on public.quote_lines(quote_id);
create index if not exists quote_lines_product_id_idx on public.quote_lines(product_id);

alter table public.product_compatibilities enable row level security;
alter table public.stock_movements enable row level security;
alter table public.price_history enable row level security;
alter table public.product_serials enable row level security;
alter table public.audit_logs enable row level security;
alter table public.enrichment_jobs enable row level security;
alter table public.icecat_lookup_cache enable row level security;
alter table public.icecat_category_mappings enable row level security;
alter table public.quote_lines enable row level security;

create policy "Public can read product compatibilities" on public.product_compatibilities for select using (true);
create policy "Admins manage product compatibilities" on public.product_compatibilities for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins read stock movements" on public.stock_movements for select using (public.is_admin());
create policy "Admins create stock movements" on public.stock_movements for insert with check (public.is_admin());

create policy "Public can read price history" on public.price_history for select using (true);
create policy "Admins manage price history" on public.price_history for all using (public.is_admin()) with check (public.is_admin());

create policy "Admins manage product serials" on public.product_serials for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage audit logs" on public.audit_logs for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage enrichment jobs" on public.enrichment_jobs for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage Icecat lookup cache" on public.icecat_lookup_cache for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage Icecat category mappings" on public.icecat_category_mappings for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins manage quote lines" on public.quote_lines for all using (public.is_admin()) with check (public.is_admin());

revoke select on public.products from anon, authenticated;
grant select (
  id,
  name,
  slug,
  description,
  mpn,
  sku,
  category_id,
  brand_id,
  price_kes,
  condition,
  stock_status,
  stock_quantity,
  images,
  specs,
  is_featured,
  is_published,
  enriched_fields,
  enriched_at,
  created_at,
  updated_at
) on public.products to anon, authenticated;
