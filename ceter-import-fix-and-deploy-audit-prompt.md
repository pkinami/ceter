Work on the existing Ceter Technologies project. Two tasks. Do Task 1 first — it is blocking real work today.

---

# TASK 1 — The product import is being rejected; find out why and fix it

The file `ceter-products-import-300 (2).xlsx` has been placed in the project (search the repo for it — likely under a templates, seed, or sample-data folder) and uploading it through the admin's product import fails.

**Diagnose before changing anything, and report the exact error text** — do not guess at the cause.

1. Locate the file and open it. Report its exact header row, row count, and the values in a handful of representative rows.
2. Run the actual import path against it — either through the real import route or by calling the same validation function it uses — and capture the precise error message and, if the validator reports per-row or per-column errors, the full list, not just the first one.
3. Compare the file's schema against what the validator currently requires: column names, order sensitivity (if any), required vs optional fields, and allowed values for `condition`, `stock_status`, and `is_featured`.
4. Check whether this is a **content** problem rather than a **schema** problem. In particular:
   - Do any `category` values in the file fail to match a category that currently exists in the database? List every mismatch.
   - Do any `slug` or `mpn` values already exist in the database from an earlier partial or failed import attempt, causing a uniqueness conflict on reimport? Check for this specifically — it is a likely cause if this file (or an earlier version of it) was uploaded before.
   - Are there any other constraint violations: price format, negative numbers, row limits, file size limits, sheet name expectations, or a required column that is present but contains blanks the validator treats as missing?
5. If a prior fix already consolidated the import schema into a single source of truth (check for this — it may already exist in the codebase from earlier work), diagnose which side is actually out of sync with it: the file, or the validator. Do not silently change the validator to accept whatever the file contains, and do not silently rewrite the file to hide a real validator bug — determine which one is wrong and say so.

**Then fix it**, and you are authorized to change the import/validation code if that is where the bug actually is, not only the spreadsheet:

- If the cause is in the file (wrong categories, stale schema, leftover bad rows from an earlier version), correct the file and confirm the corrected version imports successfully end to end.
- If the cause is in the code (a validator bug, an overly strict check, a schema mismatch, a uniqueness check that should upsert instead of reject on an existing slug/mpn), fix the code, add a regression check if the project has a test suite, and confirm against the same file afterward.
- If the cause is leftover data from a previous failed import, determine whether those partial rows should be cleaned up or the import should upsert on conflict, and implement whichever matches how the rest of the import feature is supposed to behave.

Re-run the import after the fix and confirm it succeeds with zero errors and the expected row count.

---

# TASK 2 — Production-readiness audit for Vercel deployment

Confirm the application will actually run correctly once deployed to Vercel, not just that it builds. Two failure modes are common with this exact stack (Next.js + Prisma + Supabase on Vercel serverless) and are not caught by a local build — check both explicitly:

1. **Filesystem writes.** Vercel's serverless functions have an ephemeral, effectively read-only filesystem outside `/tmp`. Search the codebase for anything that writes uploaded files, generated images, or Icecat-downloaded images to a local path such as `public/` at request time. Anything found must instead write to persistent storage — Supabase Storage, since the project already uses Supabase, unless the project has already standardised on something else. Report every write path found and whether it is safe.

2. **Database connections under serverless concurrency.** Confirm the Prisma connection string used in production points at a pooled connection (Supabase's connection pooler / PgBouncer, typically the port 6543 URL) rather than a direct database connection. A direct connection will exhaust the database's connection limit under concurrent serverless invocations. Report which connection string is configured and fix it if it is not pooled.

Beyond those two, run the standard checks:

- Lint, type-check, tests if present, and a full production build (`next build`), all with zero errors. Fix what is caused by this task; report anything pre-existing and out of scope.
- Confirm every environment variable the code actually reads is documented in `.env.example`, and list exactly which ones must be set in Vercel's project settings for the app to run (do not assume — check what is read in code).
- Confirm no hardcoded `localhost` URLs or dev-only code paths would execute in production.
- Confirm any remote image domains used anywhere in the app are correctly configured in `next.config`, not left defaulting to only local paths if remote ones are actually used.
- Confirm any server action or API route that calls a slow external service (Icecat, email, etc.) is structured so it cannot exceed Vercel's function execution time limit — it should already be a background/queued job from earlier work; confirm that is still true and nothing regressed it into a blocking call.
- Do a final consolidated check across everything built in this project so far — the banner system, the admin console rebuild, the MPN field, the import template fix — and confirm none of it depends on local dev-only behaviour that would break once deployed.

---

# Report

For Task 1: the exact original error, the root cause, whether the fix was to the file or the code (or both), and confirmation the import now succeeds.

For Task 2: the filesystem-write audit result, the database connection-pooling result, environment variables required in Vercel, lint/type-check/test/build results, and any remaining item that must be fixed before this is safe to deploy — do not report the app as production-ready if something is still broken; say so plainly instead.
