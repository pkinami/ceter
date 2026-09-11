# Operations

## Database

- Preserve all applied Prisma migrations.
- Use `npx prisma migrate deploy` to apply migrations during deployment.
- Use `npx prisma migrate status` before deployment when database access is available.
- Do not reset, truncate, or fabricate production data.
- Do not run one-time reconciliation against production without a reviewed migration or operating procedure.

## Storage

Supabase stores product images, banner images, generated business documents, import records, and protected operational files. Product images, banners, uploads, seed data, source workbooks, and Supabase assets are production assets.

Temporary local browser profiles, CDP evidence, generated screenshots, logs, build cache, and storage-state files are ignored and may be regenerated.

## Maintenance Commands

```bash
npm run banners:sync
npm run verify:db
```

`banners:sync` validates the responsive banner source files, uploads them to the configured Supabase banner bucket, and upserts banner records. Run it only with reviewed environment variables.

`verify:db` checks the baseline Supabase database objects needed by the app.
