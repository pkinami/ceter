create extension if not exists "pgcrypto";

create type product_condition as enum ('new', 'refurbished');
create type stock_status as enum ('in_stock', 'backorder', 'out_of_stock');
create type profile_role as enum ('customer', 'admin');
create type order_status as enum ('pending', 'processing', 'paid', 'fulfilled', 'cancelled');
create type payment_method as enum ('mpesa', 'card');
create type quote_status as enum ('new', 'contacted', 'closed');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  price_kes integer not null check (price_kes >= 0),
  condition product_condition not null default 'new',
  stock_status stock_status not null default 'in_stock',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  images jsonb not null default '[]'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role profile_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  status order_status not null default 'pending',
  payment_method payment_method,
  total_kes integer not null default 0 check (total_kes >= 0),
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price_at_purchase_kes integer not null check (price_at_purchase_kes >= 0)
);

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text not null,
  service_needed text not null,
  message text not null,
  status quote_status not null default 'new',
  created_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger cart_items_set_updated_at
before update on public.cart_items
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.quote_requests enable row level security;
alter table public.cart_items enable row level security;

create policy "Public can read categories" on public.categories for select using (true);
create policy "Admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read brands" on public.brands for select using (true);
create policy "Admins manage brands" on public.brands for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read products" on public.products for select using (true);
create policy "Admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());

create policy "Customers read own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Customers update own profile" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "Customers insert own profile" on public.profiles for insert with check (id = auth.uid() or public.is_admin());
create policy "Admins delete profiles" on public.profiles for delete using (public.is_admin());

create policy "Customers read own orders" on public.orders for select using (user_id = auth.uid() or public.is_admin());
create policy "Customers create own orders" on public.orders for insert with check (user_id = auth.uid() or public.is_admin());
create policy "Customers update own pending orders" on public.orders for update using ((user_id = auth.uid() and status = 'pending') or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy "Admins delete orders" on public.orders for delete using (public.is_admin());

create policy "Customers read own order items" on public.order_items for select using (
  public.is_admin() or exists (
    select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);
create policy "Customers create own order items" on public.order_items for insert with check (
  public.is_admin() or exists (
    select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid()
  )
);
create policy "Admins update order items" on public.order_items for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete order items" on public.order_items for delete using (public.is_admin());

create policy "Public can create quote requests" on public.quote_requests for insert with check (true);
create policy "Admins read quote requests" on public.quote_requests for select using (public.is_admin());
create policy "Admins update quote requests" on public.quote_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete quote requests" on public.quote_requests for delete using (public.is_admin());

create policy "Customers manage own cart" on public.cart_items for all using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

create index products_category_id_idx on public.products(category_id);
create index products_brand_id_idx on public.products(brand_id);
create index products_featured_idx on public.products(is_featured);
create index orders_user_id_idx on public.orders(user_id);
create index order_items_order_id_idx on public.order_items(order_id);
create index cart_items_user_id_idx on public.cart_items(user_id);
