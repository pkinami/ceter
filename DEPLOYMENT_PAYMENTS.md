# Deployment and Payment Setup

Production must use environment variables configured in Vercel Project Settings or `vercel env`, not a physical `.env` file in the deployment filesystem. Local development can use `.env.local`.

## Required Core Variables

- `DATABASE_URL` or `POSTGRES_URL_NON_POOLING`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAT_RATE`
- `NEXT_PUBLIC_VAT_RATE`

## M-Pesa Daraja

- `MPESA_ENV`: `sandbox` or `production`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_TRANSACTION_TYPE`: usually `CustomerPayBillOnline`

Daraja callback URL:

`https://your-domain.com/api/payments/mpesa/callback`

## Pesapal Card Payments

- `PESAPAL_ENV`: `sandbox` or `production`
- `PESAPAL_CONSUMER_KEY`
- `PESAPAL_CONSUMER_SECRET`
- `PESAPAL_IPN_ID`

Pesapal IPN URL:

`https://your-domain.com/api/payments/pesapal/ipn`

Card checkout redirects customers to Pesapal. The callback page verifies the transaction status server-side before marking an order paid.
