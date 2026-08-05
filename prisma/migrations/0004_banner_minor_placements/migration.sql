alter type public.banner_placement add value if not exists 'main';
alter type public.banner_placement add value if not exists 'category';
alter type public.banner_placement add value if not exists 'services';

alter table public.banners
  add column if not exists mobile_image text,
  add column if not exists category_id uuid references public.categories(id) on delete set null on update no action;

alter table public.banners
  alter column placement set default 'main'::public.banner_placement;

update public.banners
set placement = 'main'::public.banner_placement
where placement = 'top'::public.banner_placement;

update public.banners
set placement = 'category'::public.banner_placement
where placement = 'middle'::public.banner_placement;

update public.banners
set placement = 'services'::public.banner_placement
where placement = 'bottom'::public.banner_placement;

create index if not exists banners_category_placement_enabled_order_idx
  on public.banners(category_id, placement, is_enabled, sort_order);
