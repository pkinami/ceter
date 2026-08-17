alter table public.products
  add column if not exists show_offer_badge boolean not null default false,
  add column if not exists show_flash_sale_badge boolean not null default false;

create index if not exists products_show_offer_badge_idx on public.products(show_offer_badge);
create index if not exists products_show_flash_sale_badge_idx on public.products(show_flash_sale_badge);
