create type public.fulfillment_method as enum ('pickup', 'delivery');
create type public.delivery_region as enum ('within_nairobi', 'around_nairobi', 'countrywide');

alter type public.payment_method add value if not exists 'pay_on_delivery';
alter type public.payment_provider add value if not exists 'manual_pay_on_delivery';

alter table public.banners
  add column if not exists image_variants jsonb not null default '[]'::jsonb;

alter table public.profiles
  add column if not exists email text,
  add column if not exists delivery_region public.delivery_region,
  add column if not exists delivery_location text,
  add column if not exists delivery_instructions text;

alter table public.orders
  add column if not exists fulfillment_method public.fulfillment_method not null default 'delivery',
  add column if not exists delivery_region public.delivery_region,
  add column if not exists delivery_fee_kes integer not null default 0,
  add column if not exists delivery_name text,
  add column if not exists delivery_phone text,
  add column if not exists delivery_email text,
  add column if not exists delivery_location text,
  add column if not exists delivery_instructions text;

create table if not exists public.delivery_fees (
  id uuid primary key default gen_random_uuid(),
  region public.delivery_region not null unique,
  fee_kes integer not null default 0,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.delivery_fees (region, fee_kes, is_enabled)
values
  ('within_nairobi', 0, true),
  ('around_nairobi', 0, true),
  ('countrywide', 0, true)
on conflict (region) do nothing;
