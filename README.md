# Ceter Technologies Limited Storefront

Supabase-backed Next.js storefront for Ceter Technologies Limited, a Nairobi-based office printing equipment supplier.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Framer Motion
- Sonner toasts
- Supabase Auth, Postgres, RLS-backed catalog, cart, orders, quotes, and admin tooling

## Local Development

```bash
npm install
npm run dev
```

## Supabase Setup

Copy `.env.example` to `.env.local` and set:

```bash
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Use the Supabase project URL, anon key, service role key, and direct Postgres connection string from the new Supabase project. `SUPABASE_SERVICE_ROLE_KEY` is used only by server-side admin scripts and must never be exposed to the browser. Vercel can read the same variables from Project Settings > Environment Variables.

## Admin data layer

The `/admin` panel uses Prisma with `DATABASE_URL` for direct server-side database access after the existing Supabase Auth admin-role check passes. Treat this connection as privileged service-role-equivalent access.

Customer-facing routes and flows continue to use the Supabase client with RLS enforcement, including cart, checkout, auth, account pages, product browsing, and quote submission. Do not move those paths to Prisma unless the access model is deliberately redesigned.

## Prisma 7 setup

Prisma 7 reads the CLI datasource URL from `prisma.config.ts`, not from `prisma/schema.prisma`. The schema datasource declares the provider and schemas:

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["auth", "public"]
}
```

Deploy an empty Supabase database from the committed Prisma migration:

```bash
npm ci
npx prisma version
npx prisma validate
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run verify:db
npm run build
npm run dev
```

On Windows PowerShell, if `npm` or `npx` is blocked by the script execution policy, use `npm.cmd` and `npx.cmd` instead:

```bash
npm.cmd install
npx.cmd prisma validate
```

`DATABASE_URL` must be set in `.env.local` or another loaded env file before running Prisma commands or opening `/admin`. `prisma db pull` is not required during normal development; use migrations as the source of truth and reserve `db pull` for deliberate introspection of an externally changed database.
