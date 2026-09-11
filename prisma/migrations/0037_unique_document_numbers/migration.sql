CREATE UNIQUE INDEX IF NOT EXISTS "documents_document_number_version_key"
  ON "public"."documents"("document_number", "version")
  WHERE "document_number" IS NOT NULL AND btrim("document_number") <> '';
