# Deployment

The application deploys to Vercel as a Next.js app backed by PostgreSQL, Prisma, and Supabase Storage.

## Required Environment

- `DATABASE_URL`: pooled application database URL.
- `POSTGRES_URL_NON_POOLING`: direct database URL for Prisma migrations.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public Supabase client values.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key.
- Payment, eTIMS, SMTP, storage, signing, and company profile variables from `.env.example`.

## Pre-Deployment Validation

```bash
npm run lint
npx tsc --noEmit
npx prisma validate
npx prisma generate
npm run build
npx prisma migrate status
npm run verify:db
```

## Deploy

Vercel runs `npm run build`, which generates Prisma Client and builds Next.js.

Apply database migrations with:

```bash
npx prisma migrate deploy
```

Do not relink the repository, create a duplicate Vercel project, reset the database, or run destructive data commands as part of deployment.

## Integrations

Production eTIMS, M-Pesa, SMS, email, signing, and storage settings must be configured with legitimate credentials and verified callback URLs before enabling live workflows.
