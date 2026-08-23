-- Ceter Technologies clean application data reset for Supabase SQL Editor
--
-- Purpose:
--   Remove catalogue, CMS, cart, order, quote, payment, inventory, audit, and
--   profile application records so the app can start from an empty database.
--
-- This script does NOT drop schemas, tables, columns, indexes, constraints,
-- RLS policies, functions, triggers, Prisma migration history, Supabase Auth
-- infrastructure, or auth.users.
--
-- Important:
--   public.profiles is application data and is cleared. Supabase auth.users is
--   left intact.

begin;

truncate table
  public.audit_logs,
  public.payment_transactions,
  public.order_items,
  public.orders,
  public.quote_lines,
  public.quote_requests,
  public.cart_items,
  public.product_serials,
  public.price_history,
  public.stock_movements,
  public.product_compatibilities,
  public.homepage_sections,
  public.banners,
  public.service_entries,
  public.products,
  public.categories,
  public.brands,
  public.profiles
restart identity cascade;

commit;
