-- Ceter Business Suite Phase 1 foundation

CREATE TYPE "public"."customer_type" AS ENUM ('individual', 'business', 'government', 'ngo');
CREATE TYPE "public"."business_quote_status" AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE "public"."proforma_status" AS ENUM ('draft', 'sent', 'paid', 'cancelled');
CREATE TYPE "public"."invoice_status" AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled');
CREATE TYPE "public"."business_payment_method" AS ENUM ('mpesa', 'bank_transfer', 'cash', 'card', 'pay_on_delivery', 'credit');
CREATE TYPE "public"."business_item_type" AS ENUM ('product', 'service');
CREATE TYPE "public"."transaction_type" AS ENUM ('invoice_created', 'payment_received', 'expense_recorded', 'sales_recorded', 'customer_balance_increase', 'customer_balance_decrease', 'cash_bank_increase');
CREATE TYPE "public"."transaction_direction" AS ENUM ('debit', 'credit');
CREATE TYPE "public"."document_type" AS ENUM ('quotation', 'proforma_invoice', 'invoice', 'receipt', 'expense_attachment');

ALTER TABLE "public"."orders" ADD COLUMN "customer_id" UUID;

CREATE TABLE "public"."customers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "profile_id" UUID,
  "name" TEXT NOT NULL,
  "company_name" TEXT,
  "customer_type" "public"."customer_type" NOT NULL DEFAULT 'individual',
  "phone" TEXT,
  "email" TEXT,
  "tax_pin" TEXT,
  "notes" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."customer_addresses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customer_id" UUID NOT NULL,
  "label" TEXT,
  "recipient_name" TEXT,
  "phone" TEXT,
  "address_line_1" TEXT NOT NULL,
  "address_line_2" TEXT,
  "city" TEXT,
  "region" TEXT,
  "delivery_notes" TEXT,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quote_number" TEXT NOT NULL,
  "customer_id" UUID NOT NULL,
  "status" "public"."business_quote_status" NOT NULL DEFAULT 'draft',
  "subtotal_kes" INTEGER NOT NULL DEFAULT 0,
  "discount_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_kes" INTEGER NOT NULL DEFAULT 0,
  "total_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_enabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "terms" TEXT,
  "valid_until" DATE,
  "created_by_id" UUID,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."quote_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quote_id" UUID NOT NULL,
  "product_id" UUID,
  "item_type" "public"."business_item_type" NOT NULL DEFAULT 'product',
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_kes" INTEGER NOT NULL,
  "discount_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_kes" INTEGER NOT NULL DEFAULT 0,
  "line_total_kes" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."proforma_invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "proforma_number" TEXT NOT NULL,
  "quote_id" UUID,
  "customer_id" UUID NOT NULL,
  "status" "public"."proforma_status" NOT NULL DEFAULT 'draft',
  "subtotal_kes" INTEGER NOT NULL DEFAULT 0,
  "discount_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_kes" INTEGER NOT NULL DEFAULT 0,
  "total_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_enabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "terms" TEXT,
  "due_date" DATE,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proforma_invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."proforma_invoice_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "proforma_invoice_id" UUID NOT NULL,
  "product_id" UUID,
  "item_type" "public"."business_item_type" NOT NULL DEFAULT 'product',
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_kes" INTEGER NOT NULL,
  "discount_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_kes" INTEGER NOT NULL DEFAULT 0,
  "line_total_kes" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "proforma_invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_number" TEXT NOT NULL,
  "quote_id" UUID,
  "proforma_invoice_id" UUID,
  "customer_id" UUID NOT NULL,
  "status" "public"."invoice_status" NOT NULL DEFAULT 'draft',
  "subtotal_kes" INTEGER NOT NULL DEFAULT 0,
  "discount_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_kes" INTEGER NOT NULL DEFAULT 0,
  "total_kes" INTEGER NOT NULL DEFAULT 0,
  "paid_kes" INTEGER NOT NULL DEFAULT 0,
  "balance_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_enabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "terms" TEXT,
  "due_date" DATE,
  "payment_terms" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."invoice_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "product_id" UUID,
  "item_type" "public"."business_item_type" NOT NULL DEFAULT 'product',
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_kes" INTEGER NOT NULL,
  "discount_kes" INTEGER NOT NULL DEFAULT 0,
  "vat_kes" INTEGER NOT NULL DEFAULT 0,
  "line_total_kes" INTEGER NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "payment_number" TEXT NOT NULL,
  "invoice_id" UUID,
  "proforma_invoice_id" UUID,
  "customer_id" UUID NOT NULL,
  "amount_kes" INTEGER NOT NULL,
  "method" "public"."business_payment_method" NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "paid_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."receipts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "receipt_number" TEXT NOT NULL,
  "payment_id" UUID NOT NULL,
  "invoice_id" UUID,
  "customer_id" UUID NOT NULL,
  "amount_kes" INTEGER NOT NULL,
  "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."expense_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."expenses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "expense_number" TEXT NOT NULL,
  "category_id" UUID NOT NULL,
  "supplier" TEXT,
  "customer_id" UUID,
  "amount_kes" INTEGER NOT NULL,
  "method" "public"."business_payment_method" NOT NULL,
  "expense_date" DATE NOT NULL,
  "notes" TEXT,
  "attachment_url" TEXT,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transaction_type" "public"."transaction_type" NOT NULL,
  "direction" "public"."transaction_direction" NOT NULL,
  "amount_kes" INTEGER NOT NULL,
  "memo" TEXT,
  "customer_id" UUID,
  "quote_id" UUID,
  "proforma_invoice_id" UUID,
  "invoice_id" UUID,
  "payment_id" UUID,
  "expense_id" UUID,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."documents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "document_type" "public"."document_type" NOT NULL,
  "title" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "storage_path" TEXT NOT NULL,
  "public_url" TEXT,
  "customer_id" UUID,
  "quote_id" UUID,
  "proforma_invoice_id" UUID,
  "invoice_id" UUID,
  "payment_id" UUID,
  "receipt_id" UUID,
  "expense_id" UUID,
  "created_by_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "quotes_quote_number_key" ON "public"."quotes"("quote_number");
CREATE UNIQUE INDEX "proforma_invoices_proforma_number_key" ON "public"."proforma_invoices"("proforma_number");
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "public"."invoices"("invoice_number");
CREATE UNIQUE INDEX "payments_payment_number_key" ON "public"."payments"("payment_number");
CREATE UNIQUE INDEX "receipts_receipt_number_key" ON "public"."receipts"("receipt_number");
CREATE UNIQUE INDEX "receipts_payment_id_key" ON "public"."receipts"("payment_id");
CREATE UNIQUE INDEX "expense_categories_name_key" ON "public"."expense_categories"("name");
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "public"."expenses"("expense_number");

CREATE INDEX "orders_customer_id_idx" ON "public"."orders"("customer_id");
CREATE INDEX "customers_profile_id_idx" ON "public"."customers"("profile_id");
CREATE INDEX "customers_email_idx" ON "public"."customers"("email");
CREATE INDEX "customers_phone_idx" ON "public"."customers"("phone");
CREATE INDEX "customers_customer_type_idx" ON "public"."customers"("customer_type");
CREATE INDEX "customer_addresses_customer_id_idx" ON "public"."customer_addresses"("customer_id");
CREATE INDEX "quotes_customer_id_idx" ON "public"."quotes"("customer_id");
CREATE INDEX "quotes_status_idx" ON "public"."quotes"("status");
CREATE INDEX "quotes_created_at_idx" ON "public"."quotes"("created_at");
CREATE INDEX "quote_items_quote_id_idx" ON "public"."quote_items"("quote_id");
CREATE INDEX "quote_items_product_id_idx" ON "public"."quote_items"("product_id");
CREATE INDEX "proforma_invoices_quote_id_idx" ON "public"."proforma_invoices"("quote_id");
CREATE INDEX "proforma_invoices_customer_id_idx" ON "public"."proforma_invoices"("customer_id");
CREATE INDEX "proforma_invoices_status_idx" ON "public"."proforma_invoices"("status");
CREATE INDEX "proforma_invoice_items_proforma_invoice_id_idx" ON "public"."proforma_invoice_items"("proforma_invoice_id");
CREATE INDEX "proforma_invoice_items_product_id_idx" ON "public"."proforma_invoice_items"("product_id");
CREATE INDEX "invoices_quote_id_idx" ON "public"."invoices"("quote_id");
CREATE INDEX "invoices_proforma_invoice_id_idx" ON "public"."invoices"("proforma_invoice_id");
CREATE INDEX "invoices_customer_id_idx" ON "public"."invoices"("customer_id");
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");
CREATE INDEX "invoices_due_date_idx" ON "public"."invoices"("due_date");
CREATE INDEX "invoice_items_invoice_id_idx" ON "public"."invoice_items"("invoice_id");
CREATE INDEX "invoice_items_product_id_idx" ON "public"."invoice_items"("product_id");
CREATE INDEX "payments_invoice_id_idx" ON "public"."payments"("invoice_id");
CREATE INDEX "payments_proforma_invoice_id_idx" ON "public"."payments"("proforma_invoice_id");
CREATE INDEX "payments_customer_id_idx" ON "public"."payments"("customer_id");
CREATE INDEX "payments_paid_at_idx" ON "public"."payments"("paid_at");
CREATE INDEX "receipts_invoice_id_idx" ON "public"."receipts"("invoice_id");
CREATE INDEX "receipts_customer_id_idx" ON "public"."receipts"("customer_id");
CREATE INDEX "expenses_category_id_idx" ON "public"."expenses"("category_id");
CREATE INDEX "expenses_customer_id_idx" ON "public"."expenses"("customer_id");
CREATE INDEX "expenses_expense_date_idx" ON "public"."expenses"("expense_date");
CREATE INDEX "transactions_transaction_type_created_at_idx" ON "public"."transactions"("transaction_type", "created_at");
CREATE INDEX "transactions_customer_id_idx" ON "public"."transactions"("customer_id");
CREATE INDEX "transactions_invoice_id_idx" ON "public"."transactions"("invoice_id");
CREATE INDEX "transactions_payment_id_idx" ON "public"."transactions"("payment_id");
CREATE INDEX "transactions_expense_id_idx" ON "public"."transactions"("expense_id");
CREATE INDEX "documents_document_type_created_at_idx" ON "public"."documents"("document_type", "created_at");
CREATE INDEX "documents_customer_id_idx" ON "public"."documents"("customer_id");
CREATE INDEX "documents_quote_id_idx" ON "public"."documents"("quote_id");
CREATE INDEX "documents_proforma_invoice_id_idx" ON "public"."documents"("proforma_invoice_id");
CREATE INDEX "documents_invoice_id_idx" ON "public"."documents"("invoice_id");
CREATE INDEX "documents_payment_id_idx" ON "public"."documents"("payment_id");
CREATE INDEX "documents_receipt_id_idx" ON "public"."documents"("receipt_id");
CREATE INDEX "documents_expense_id_idx" ON "public"."documents"("expense_id");

ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."quotes" ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."quote_items" ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."proforma_invoices" ADD CONSTRAINT "proforma_invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."proforma_invoices" ADD CONSTRAINT "proforma_invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."proforma_invoice_items" ADD CONSTRAINT "proforma_invoice_items_proforma_invoice_id_fkey" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."proforma_invoice_items" ADD CONSTRAINT "proforma_invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_proforma_invoice_id_fkey" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_proforma_invoice_id_fkey" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "public"."receipts" ADD CONSTRAINT "receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."receipts" ADD CONSTRAINT "receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."expense_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE "public"."expenses" ADD CONSTRAINT "expenses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_proforma_invoice_id_fkey" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_proforma_invoice_id_fkey" FOREIGN KEY ("proforma_invoice_id") REFERENCES "public"."proforma_invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "public"."receipts"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "public"."documents" ADD CONSTRAINT "documents_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "public"."expenses"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
