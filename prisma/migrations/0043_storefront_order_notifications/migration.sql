ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_key_key
  ON public.orders (checkout_key);

CREATE INDEX IF NOT EXISTS internal_notifications_unread_idx
  ON public.internal_notifications (recipient_id, status, created_at DESC);
