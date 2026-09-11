alter table public.banners
  add column if not exists banner_key text,
  add column if not exists internal_name text,
  add column if not exists destination_type text not null default 'internal',
  add column if not exists image_path text,
  add column if not exists laptop_image_path text,
  add column if not exists mobile_image_path text,
  add column if not exists alt_text text,
  add column if not exists mobile_focal_position text not null default 'center center',
  add column if not exists landscape_focal_position text not null default 'center center',
  add column if not exists ultrawide_focal_position text not null default 'center center',
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists created_by_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_by_id uuid references public.profiles(id) on delete set null;

update public.banners
set banner_key = lower(regexp_replace(coalesce(nullif(banner_key, ''), title || '-' || id::text), '[^a-z0-9]+', '-', 'g'))
where banner_key is null or banner_key = '';

update public.banners
set internal_name = title
where internal_name is null or internal_name = '';

update public.banners
set destination_type = case
  when cta_href ~* '^https?://' then 'external'
  else 'internal'
end
where destination_type is null or destination_type not in ('internal', 'external', 'category', 'service');

update public.banners
set alt_text = title
where alt_text is null or alt_text = '';

create unique index if not exists banners_banner_key_unique_idx
  on public.banners(banner_key)
  where banner_key is not null;

create index if not exists banners_schedule_visibility_idx
  on public.banners(archived_at, is_enabled, starts_at, ends_at, placement, sort_order);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'banners_destination_type_check'
      and conrelid = 'public.banners'::regclass
  ) then
    alter table public.banners
      add constraint banners_destination_type_check
      check (destination_type in ('internal', 'external', 'category', 'service'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'banners_schedule_order_check'
      and conrelid = 'public.banners'::regclass
  ) then
    alter table public.banners
      add constraint banners_schedule_order_check
      check (starts_at is null or ends_at is null or starts_at < ends_at);
  end if;
end $$;
