-- Customer-owned service quote workflow and customer LPO on the resulting sales order.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_lpo_number TEXT;
CREATE INDEX IF NOT EXISTS orders_customer_lpo_number_idx ON public.orders (customer_lpo_number);

-- owner_id already exists on quote_requests and is used for the authenticated
-- storefront customer that submitted the request.
