ALTER TABLE public.journal_entries
  ADD COLUMN goods_received_note_id uuid,
  ADD CONSTRAINT journal_entries_goods_received_note_id_fkey
    FOREIGN KEY (goods_received_note_id) REFERENCES public.goods_received_notes(id)
    ON DELETE SET NULL ON UPDATE NO ACTION;

CREATE INDEX journal_entries_goods_received_note_id_idx
  ON public.journal_entries(goods_received_note_id);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_stock_quantity_check;
