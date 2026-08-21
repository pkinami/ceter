# Ceter Technologies Storefront

Next.js storefront and admin console with Business Suite CRM, sales documents, procurement, accounting preparation, compliance tracking and document vault modules.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Fill in `.env.local` with your own Supabase, PostgreSQL, payment and company profile values. Keep placeholders for integrations you are not enabling locally. Do not commit real secrets.

4. Apply database migrations:

```bash
npx prisma migrate deploy
```

5. Generate the Prisma client:

```bash
npx prisma generate
```

6. Run the app:

```bash
npm run dev
```

## Required Environment

The full required environment template is in `.env.example`. Key groups:

- Database: `DATABASE_URL`, `POSTGRES_URL_NON_POOLING`, `PRISMA_POOL_MAX`, `PRISMA_CONNECTION_TIMEOUT_MS`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Storage: `SUPABASE_PRODUCT_IMAGES_BUCKET`, `SUPABASE_BANNER_IMAGES_BUCKET`, `SUPABASE_BUSINESS_DOCUMENTS_BUCKET`, `BUSINESS_DOCUMENT_SIGNED_URL_SECONDS`
- Business Suite documents: `CETER_COMPANY_NAME`, `CETER_COMPANY_ADDRESS`, `CETER_COMPANY_PHONE`, `CETER_COMPANY_EMAIL`, `CETER_COMPANY_WEBSITE`, `CETER_COMPANY_TAX_PIN`, `CETER_DOCUMENT_PAYMENT_INSTRUCTIONS`
- Payments: M-Pesa Daraja uses `MPESA_ENVIRONMENT`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_TRANSACTION_TYPE`, `MPESA_PENDING_TIMEOUT_MINUTES`; Pesapal placeholders remain for card checkout
- Compliance: eTIMS readiness uses non-secret business settings for KRA PIN, VAT registration number, branch details and legal information; API credentials stay in `ETIMS_API_URL` and `ETIMS_API_KEY`, with `ETIMS_REQUEST_TIMEOUT_MS` for live endpoint protection
- Email: transactional SMTP delivery uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`, `SMTP_STARTTLS`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL`, `SMTP_TIMEOUT_MS`, `SMTP_MAX_RETRIES`; compatible `EMAIL_*` aliases are documented in `.env.example`
- Storage: generated PDFs and vault files use Supabase today; future storage placeholders are `STORAGE_PROVIDER` and `STORAGE_KEY`
- Site: `NEXT_PUBLIC_SITE_URL`

## Deployment Checks

Run these before deploying:

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npx prisma generate
npm run build
npx prisma migrate status
```

For hosted environments, use the pooled database URL for `DATABASE_URL` and the direct database URL for `POSTGRES_URL_NON_POOLING`.

Generated invoices, receipts, statements and vault files should be stored in a private Supabase bucket. The app renders short-lived signed URLs only after customer ownership or admin authorization checks.
