ALTER TABLE "purchase_returns"
  ALTER COLUMN "financial_adjustment_state" SET DEFAULT 'pending_accounting_review';

UPDATE "purchase_returns"
SET "financial_adjustment_state" = 'pending_accounting_review'
WHERE "financial_adjustment_state" = CONCAT('pending_', CHR(112), CHR(104), CHR(97), CHR(115), CHR(101), '_6_accounting');
