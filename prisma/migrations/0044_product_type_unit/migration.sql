ALTER TABLE public.products
  ADD COLUMN item_type text,
  ADD COLUMN unit text;

-- Existing rows remain NULL until a user explicitly classifies them.
