# Ceter Technologies Storefront

Production Next.js application for Ceter Technologies. The system includes the public storefront, customer account surfaces, checkout and quote requests, payments, generated business documents, admin operations, inventory, purchasing, sales, service, accounting foundations, reporting, and Supabase storage.

## Local Setup

```bash
npm install
npm run dev
```

Fill `.env.local` with local Supabase, PostgreSQL, payment, storage, SMTP and company profile values. Keep placeholders for integrations that are not enabled locally. Never commit real secrets.

## Daily Commands

```bash
npm install
npm run dev
npm run build
npm run lint
npx prisma migrate deploy
npx prisma generate
vercel --prod
```

## Documentation

- [Admin Overview](docs/ADMIN_OVERVIEW.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Banners](docs/BANNERS.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Operations](docs/OPERATIONS.md)
- [Testing](docs/TESTING.md)
- [Imports](docs/IMPORTS.md)
- [Fiscalization and Documents](docs/FISCALIZATION_AND_DOCUMENTS.md)

## Environment

The complete template is in `.env.example`. Key groups:

- Database: `DATABASE_URL`, `POSTGRES_URL_NON_POOLING`, `PRISMA_POOL_MAX`, `PRISMA_CONNECTION_TIMEOUT_MS`
- Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Storage: `SUPABASE_PRODUCT_IMAGES_BUCKET`, `SUPABASE_BANNER_IMAGES_BUCKET`, `SUPABASE_BUSINESS_DOCUMENTS_BUCKET`, `BUSINESS_DOCUMENT_SIGNED_URL_SECONDS`
- Business documents: `CETER_COMPANY_NAME`, `CETER_COMPANY_ADDRESS`, `CETER_COMPANY_PHONE`, `CETER_COMPANY_EMAIL`, `CETER_COMPANY_WEBSITE`, `CETER_COMPANY_TAX_PIN`, `CETER_DOCUMENT_PAYMENT_INSTRUCTIONS`
- Payments: M-Pesa Daraja and Pesapal placeholders
- Compliance: eTIMS provider settings and credentials
- Email: SMTP settings and compatible `EMAIL_*` aliases
- Site: `NEXT_PUBLIC_SITE_URL`

Generated invoices, receipts, statements and vault files are stored in private Supabase buckets. The app renders short-lived signed URLs only after ownership or admin authorization checks.
