alter table public.banners
  add column if not exists text_position text not null default 'left',
  add column if not exists overlay_opacity integer not null default 70,
  add column if not exists badge_enabled boolean not null default false,
  add column if not exists badge_text text,
  add column if not exists badge_color text,
  add column if not exists badge_position text not null default 'top-left';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'banners_overlay_opacity_range'
      and conrelid = 'public.banners'::regclass
  ) then
    alter table public.banners
      add constraint banners_overlay_opacity_range
      check (overlay_opacity between 0 and 95);
  end if;
end $$;
