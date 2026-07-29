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
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Run the migration files in `supabase/migrations/`, then load `supabase/seed.sql` for the initial Ceter product catalog. `SUPABASE_SERVICE_ROLE_KEY` is used only by server-side admin actions and must never be exposed to the browser. Vercel can read the same variables from Project Settings > Environment Variables.
