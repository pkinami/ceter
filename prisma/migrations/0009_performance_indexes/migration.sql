CREATE INDEX IF NOT EXISTS "orders_created_at_idx" ON "public"."orders"("created_at");
CREATE INDEX IF NOT EXISTS "products_is_published_is_featured_created_at_idx" ON "public"."products"("is_published", "is_featured", "created_at");
CREATE INDEX IF NOT EXISTS "products_updated_at_idx" ON "public"."products"("updated_at");
CREATE INDEX IF NOT EXISTS "quote_requests_created_at_idx" ON "public"."quote_requests"("created_at");
