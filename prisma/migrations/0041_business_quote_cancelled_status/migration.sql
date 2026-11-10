-- Allow customers to cancel a draft or sent business quotation.
ALTER TYPE public.business_quote_status ADD VALUE IF NOT EXISTS 'cancelled';
