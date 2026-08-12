alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete cascade on update no action,
  add column if not exists sort_order integer not null default 0;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.categories'::regclass
      and conname = 'categories_name_key'
  ) then
    alter table public.categories drop constraint categories_name_key;
  end if;
end $$;

create index if not exists categories_parent_sort_idx on public.categories(parent_id, sort_order);
