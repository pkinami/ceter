do $$ begin
  create type public.banner_placement as enum ('top', 'middle', 'bottom');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.homepage_section_type as enum ('category_products', 'latest_products', 'services', 'brands');
exception
  when duplicate_object then null;
end $$;

alter table public.brands
  add column if not exists icon text,
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kicker text,
  body text not null,
  cta_label text,
  cta_href text,
  image text,
  placement public.banner_placement not null default 'top',
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  section_type public.homepage_section_type not null default 'category_products',
  category_id uuid references public.categories(id) on delete set null on update no action,
  sort_order integer not null default 0,
  product_limit integer not null default 8 check (product_limit between 1 and 24),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null,
  image text,
  price_kes integer check (price_kes is null or price_kes >= 0),
  show_request_quote boolean not null default true,
  sort_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists banners_set_updated_at on public.banners;
create trigger banners_set_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

drop trigger if exists homepage_sections_set_updated_at on public.homepage_sections;
create trigger homepage_sections_set_updated_at
before update on public.homepage_sections
for each row execute function public.set_updated_at();

drop trigger if exists service_entries_set_updated_at on public.service_entries;
create trigger service_entries_set_updated_at
before update on public.service_entries
for each row execute function public.set_updated_at();

alter table public.banners enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.service_entries enable row level security;

drop policy if exists "Public can read enabled banners" on public.banners;
create policy "Public can read enabled banners" on public.banners for select using (is_enabled = true);
drop policy if exists "Admins manage banners" on public.banners;
create policy "Admins manage banners" on public.banners for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read enabled homepage sections" on public.homepage_sections;
create policy "Public can read enabled homepage sections" on public.homepage_sections for select using (is_enabled = true);
drop policy if exists "Admins manage homepage sections" on public.homepage_sections;
create policy "Admins manage homepage sections" on public.homepage_sections for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read enabled service entries" on public.service_entries;
create policy "Public can read enabled service entries" on public.service_entries for select using (is_enabled = true);
drop policy if exists "Admins manage service entries" on public.service_entries;
create policy "Admins manage service entries" on public.service_entries for all using (public.is_admin()) with check (public.is_admin());

create index if not exists banners_placement_enabled_order_idx on public.banners(placement, is_enabled, sort_order);
create index if not exists homepage_sections_type_enabled_order_idx on public.homepage_sections(section_type, is_enabled, sort_order);
create index if not exists homepage_sections_category_id_idx on public.homepage_sections(category_id);
create index if not exists service_entries_enabled_order_idx on public.service_entries(is_enabled, sort_order);

update public.brands set icon = coalesce(icon, '/product-placeholder.svg');

insert into public.banners (title, kicker, body, cta_label, cta_href, image, placement, sort_order, is_enabled)
select banner.title, banner.kicker, banner.body, banner.cta_label, banner.cta_href, banner.image, banner.placement, banner.sort_order, banner.is_enabled
from (
  values
  ('Office technology supplied, installed and supported', 'Ceter Technologies Limited', 'Source printers, copiers, consumables, networking hardware and IT services from one Nairobi partner.', 'Shop catalog', '/category', '/product-placeholder.svg', 'top'::public.banner_placement, 10, true),
  ('Printer fleets, toners and spares for active offices', 'Commercial supply', 'Keep operations moving with verified stock, setup support and quote-based procurement for larger needs.', 'Request quote', '/quote', '/product-placeholder.svg', 'middle'::public.banner_placement, 20, true),
  ('Infrastructure services for growing teams', 'Services and solutions', 'Plan CCTV, cabling, networking, servers, cloud and security work with Ceter engineers.', 'Explore services', '/quote', '/product-placeholder.svg', 'bottom'::public.banner_placement, 30, true)
) as banner(title, kicker, body, cta_label, cta_href, image, placement, sort_order, is_enabled)
where not exists (
  select 1 from public.banners existing
  where existing.title = banner.title and existing.placement = banner.placement
);

insert into public.service_entries (title, slug, description, image, price_kes, show_request_quote, sort_order, is_enabled) values
  ('CCTV Installation', 'cctv-installation', 'Camera planning, installation, recording setup and handover for offices, retail sites and facilities.', '/product-placeholder.svg', null, true, 10, true),
  ('Structured Cabling', 'structured-cabling', 'Clean copper and fibre cabling for office networks, server rooms and multi-floor deployments.', '/product-placeholder.svg', null, true, 20, true),
  ('Networking', 'networking', 'Switching, routing, Wi-Fi and secure network configuration for reliable business connectivity.', '/product-placeholder.svg', null, true, 30, true),
  ('Server Installation', 'server-installation', 'Server sizing, installation, storage setup and operational configuration.', '/product-placeholder.svg', null, true, 40, true),
  ('Data Recovery', 'data-recovery', 'Assessment and recovery support for failed drives, accidental deletion and damaged storage media.', '/product-placeholder.svg', null, true, 50, true),
  ('Managed IT Services', 'managed-it-services', 'Ongoing maintenance, support, monitoring and procurement assistance for business IT environments.', '/product-placeholder.svg', null, true, 60, true),
  ('Cloud Solutions', 'cloud-solutions', 'Cloud email, storage, backup and productivity solution planning and migration.', '/product-placeholder.svg', null, true, 70, true),
  ('Security Solutions', 'security-solutions', 'Access control, endpoint protection and physical security integrations for business sites.', '/product-placeholder.svg', null, true, 80, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  image = excluded.image,
  price_kes = excluded.price_kes,
  show_request_quote = excluded.show_request_quote,
  sort_order = excluded.sort_order,
  is_enabled = excluded.is_enabled;

insert into public.homepage_sections (title, section_type, category_id, sort_order, product_limit, is_enabled)
select c.name, 'category_products'::public.homepage_section_type, c.id, row_number() over (order by c.name) * 10, 8, true
from public.categories c
where not exists (
  select 1 from public.homepage_sections existing
  where existing.section_type = 'category_products'::public.homepage_section_type and existing.category_id = c.id
);

insert into public.homepage_sections (title, section_type, category_id, sort_order, product_limit, is_enabled)
select section.title, section.section_type, null, section.sort_order, section.product_limit, section.is_enabled
from (
  values
  ('Ceter Services & Solutions', 'services'::public.homepage_section_type, 500, 8, true),
  ('Latest Products', 'latest_products'::public.homepage_section_type, 700, 8, true),
  ('Featured Brands', 'brands'::public.homepage_section_type, 800, 12, true)
) as section(title, section_type, sort_order, product_limit, is_enabled)
where not exists (
  select 1 from public.homepage_sections existing
  where existing.section_type = section.section_type and existing.category_id is null
);
