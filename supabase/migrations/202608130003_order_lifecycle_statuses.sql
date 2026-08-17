alter type public.order_status add value if not exists 'ready';
alter type public.order_status add value if not exists 'dispatched';
alter type public.order_status add value if not exists 'completed';
