begin;

update public.profiles
set role = 'customer'
where role::text in ('admin', 'owner', 'manager', 'sales', 'store');

create or replace function pg_temp.drop_policy_if_table(policy_name text, table_name text)
returns void language plpgsql as $$
begin
  if to_regclass('public.' || table_name) is not null then
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
  end if;
end;
$$;

select pg_temp.drop_policy_if_table(policy_name, table_name)
from (values
  ('Admins manage categories', 'categories'),
  ('Admins manage brands', 'brands'),
  ('Admins manage products', 'products'),
  ('Admins delete profiles', 'profiles'),
  ('Admins delete orders', 'orders'),
  ('Admins update order items', 'order_items'),
  ('Admins delete order items', 'order_items'),
  ('Admins read quote requests', 'quote_requests'),
  ('Admins update quote requests', 'quote_requests'),
  ('Admins delete quote requests', 'quote_requests'),
  ('Admins manage banners', 'banners'),
  ('Admins manage homepage sections', 'homepage_sections'),
  ('Admins manage service entries', 'service_entries'),
  ('Admins manage product compatibilities', 'product_compatibilities'),
  ('Admins read stock movements', 'stock_movements'),
  ('Admins create stock movements', 'stock_movements'),
  ('Admins manage price history', 'price_history'),
  ('Admins manage product serials', 'product_serials'),
  ('Admins manage audit logs', 'audit_logs'),
  ('Admins manage enrichment jobs', 'enrichment_jobs'),
  ('Admins manage Icecat lookup cache', 'icecat_lookup_cache'),
  ('Admins manage Icecat category mappings', 'icecat_category_mappings'),
  ('Admins manage quote lines', 'quote_lines'),
  ('Customers read own profile', 'profiles'),
  ('Customers update own profile', 'profiles'),
  ('Customers insert own profile', 'profiles'),
  ('Customers read own orders', 'orders'),
  ('Customers create own orders', 'orders'),
  ('Customers update own pending orders', 'orders'),
  ('Customers read own order items', 'order_items'),
  ('Customers create own order items', 'order_items'),
  ('Customers manage own cart', 'cart_items')
) as policies(policy_name, table_name);

create policy "Customers read own profile" on public.profiles for select using (id = auth.uid());
create policy "Customers update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Customers insert own profile" on public.profiles for insert with check (id = auth.uid());
create policy "Customers read own orders" on public.orders for select using (user_id = auth.uid());
create policy "Customers create own orders" on public.orders for insert with check (user_id = auth.uid());
create policy "Customers update own pending orders" on public.orders for update using (user_id = auth.uid() and status = 'pending') with check (user_id = auth.uid());
create policy "Customers read own order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "Customers create own order items" on public.order_items for insert with check (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "Customers manage own cart" on public.cart_items for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop function if exists public.is_admin();

alter table public.profiles alter column role drop default;
alter type public.profile_role rename to profile_role_old;
create type public.profile_role as enum ('customer');
alter table public.profiles alter column role type public.profile_role using 'customer'::public.profile_role;
alter table public.profiles alter column role set default 'customer';
drop type public.profile_role_old;

commit;
