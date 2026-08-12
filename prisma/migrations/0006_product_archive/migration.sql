alter table public.products
  add column if not exists archived_at timestamptz;

create index if not exists products_archived_at_idx on public.products(archived_at);
