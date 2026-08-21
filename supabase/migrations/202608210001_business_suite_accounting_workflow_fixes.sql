ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS goods_received_note_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'journal_entries_goods_received_note_id_fkey'
  ) THEN
    ALTER TABLE public.journal_entries
      ADD CONSTRAINT journal_entries_goods_received_note_id_fkey
        FOREIGN KEY (goods_received_note_id) REFERENCES public.goods_received_notes(id)
        ON DELETE SET NULL ON UPDATE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS journal_entries_goods_received_note_id_idx
  ON public.journal_entries(goods_received_note_id);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_quantity_check;
