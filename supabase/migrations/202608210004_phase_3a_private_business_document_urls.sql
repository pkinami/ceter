UPDATE "public"."documents"
SET "public_url" = NULL
WHERE "document_type" IN (
  'quotation',
  'proforma_invoice',
  'invoice',
  'receipt',
  'customer_statement',
  'purchase_order',
  'company_document'
);

UPDATE "public"."company_documents"
SET "public_url" = NULL;
