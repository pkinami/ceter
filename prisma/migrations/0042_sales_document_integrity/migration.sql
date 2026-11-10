-- One commercial invoice may originate from a quotation.  A partial unique
-- index keeps historical standalone invoices intact while making concurrent
-- quote conversion idempotent at the database boundary.
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_per_quote_idx
  ON public.invoices (quote_id)
  WHERE quote_id IS NOT NULL;

-- POST retry/idempotency key for cash/manual payments where no processor
-- reference exists. Nullable preserves every existing payment record.
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS operation_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS payments_operation_key_unique_idx
  ON public.payments (operation_key)
  WHERE operation_key IS NOT NULL;
