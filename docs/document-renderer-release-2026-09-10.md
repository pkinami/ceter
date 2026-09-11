# Document renderer release — 2026-09-10

## Implemented generator inventory

| Document | Generation path | Status |
| --- | --- | --- |
| Quotation, proforma invoice, sales invoice | `app/admin/business/actions.ts:createDocumentFor` | Shared Letter renderer |
| Receipt | `lib/business/settlement.ts` | Shared Letter renderer |
| Delivery note | `lib/admin/sales-billing.ts:ensureDeliveryNoteDocument` | Shared Letter renderer with receiving acknowledgement |
| Customer statement | `app/account/actions.ts` and `app/admin/business/actions.ts` | Shared Letter renderer |
| Purchase order | `app/admin/business/actions.ts:createPurchaseOrderAction` | Shared Letter renderer |
| Credit note, goods-received note, stock transfer/take, service/equipment/contract, reports | No PDF generator was found; existing records/CSV/XLSX exports remain unchanged | Not implemented as PDFs |

## Reference verification assets

Artifacts are deliberately kept outside the deployment tree at `C:\ceter.tmp\document-verification`:

- `reference-render.png`
- `generated-reference-comparison.png`
- `reference-vs-generated-side-by-side.png`
- `reference-vs-generated-overlay.png`
- `reference-comparison-quotation.pdf`

The renderer uses a dynamic model (no sample transaction data in production output), US Letter 612 × 792 point pages, embedded Poppins assets, the shipped horizontal Ceter logo, a reference-aligned header/divider/table/footer, and document-specific metadata/terms. The supplied PDF contains Poppins and Arial-family subsets; its deployed renderer asset set provides the existing embedded Poppins family. The observable body-font difference is retained as the only known visual deviation rather than embedding a Windows-licensed Arial file.

## LPO implementation

Migration `0038_invoice_customer_lpo` adds nullable `customer_lpo_number` to quotes, proformas, and invoices. The sales/quotation workflow control writes the source value; quote → proforma → invoice and quote/proforma → invoice actions propagate it. Invoice metadata renders `LPO No.` and uses `—` where no customer LPO exists. Supplier purchase-order numbering remains separate.

## Validation record

- `npx prisma validate`: passed.
- `npx prisma generate`: passed.
- `0038_invoice_customer_lpo`: reviewed then deployed successfully to the configured Supabase PostgreSQL database.
- `scripts/verify-document-renderer.ts`: passed for the visual comparison quotation, ordinary quotation, multipage invoice, and delivery note.

Production deployment and authenticated live workflow verification are recorded separately once completed; no test financial record was created by this renderer regression run.

## Deployment submission

`vercel.cmd --prod --yes` was submitted from `C:\ceter` to project `ceter-tech`.

- Inspect: `https://vercel.com/patrickkinami-9564s-projects/ceter-tech/8vZF9BCh8796XAkvqn3iHD7zL7zw`
- Production deployment: `https://ceter-tech-7txaes1ky-patrickkinami-9564s-projects.vercel.app`
- Custom domain probe: `https://www.cetertechnologies.com` returned HTTP 200.

The deployment URL is SSO-protected when probed without the existing authenticated browser session (HTTP 302), so an unauthenticated curl response cannot prove its document-download workflow. No controlled live financial records were created or cleaned up in this run.

## Outage recovery and renderer follow-up

The interrupted submission `ceter-tech-7txaes1ky-patrickkinami-9564s-projects.vercel.app` was confirmed **Error**. Its Vercel log identifies the cause: a duplicate, unreachable `input.type === "invoice"` branch in `lib/business/documents.ts` caused TypeScript to fail. A later retry, `ceter-tech-fm1x6un7r-patrickkinami-9564s-projects.vercel.app`, was confirmed Ready and had been assigned the production aliases.

After the reference comparison was re-inspected, the renderer was refined to embed Poppins (SIL OFL) for branded/display text and Arimo (SIL OFL, Arial-compatible) for operational text. The quotation recipient block now follows the reference `Bill To` spacing and a single-page quotation no longer prints a page counter. Actual Windows Arial remains unavailable for redistribution; it is deliberately not embedded. This is the only font limitation.

- Local renderer check: `npx tsx scripts/verify-document-renderer.ts` passed on 10 Sep 2026: quotation (1 page), ordinary quotation (1), multipage invoice (2), and delivery note (1).
- Migration check: `npx prisma migrate status` reported 38 migrations and **Database schema is up to date**. Migration `0038_invoice_customer_lpo` was not reapplied.
- Final production deployment: `dpl_ExKLeuF2fngpv7g6LU5VwJLpQ5og`, https://ceter-tech-6fmg6pi8u-patrickkinami-9564s-projects.vercel.app, **Ready**. Vercel inspection explicitly lists `https://www.cetertechnologies.com` as its alias; an independent domain request returned HTTP 200.

## Evidence and outstanding live verification

All document artifacts remain under `C:\ceter.tmp\document-verification`:

- `reference-comparison-quotation.pdf`, `quotation.pdf`, `multipage-invoice.pdf`, `delivery-note.pdf` — regenerated after the typography/layout correction.
- `updated-local-quotation-render.png` — rendered in Chrome's PDF viewer and visually inspected; it shows the Poppins display hierarchy, Arial-compatible body text, correct `Bill To` alignment, reference-sized Letter layout, and no single-page counter.
- The prior `reference-render.png`, `generated-reference-comparison.png`, `reference-vs-generated-side-by-side.png`, and `reference-vs-generated-overlay.png` are preserved as the pre-correction comparison baseline.

The authenticated admin (`localhost:9222`) and customer (`localhost:9223`) sessions were successfully attached before deployment and production pages were inspected. After the release, both CDP endpoints continued to report Chrome's debugger metadata, but Playwright `connectOverCDP` stopped completing; fresh UI-generated downloads, conversion/LPO propagation checks, customer-statement download, and all post-release PDF renders therefore could not be completed without risking the supplied authenticated browser sessions. No historical records were changed, no payments/stock/eTIMS activity was triggered, and no test financial record was created.

Live verification remains **blocked specifically by the post-release CDP connection failure**. Required next checks once the authenticated sessions accept CDP again: create controlled LPO-present and LPO-blank quotations, convert the LPO-present quotation, inspect invoice metadata/PDF, create a multipage controlled invoice, download each implemented type through the production UI, and replace the baseline comparison images with fresh live samples.

## Live recovery and verification â€” 2026-09-10

The CDP servers themselves were healthy: both `/json/version` endpoints advertised browser WebSockets and raw CDP `Browser.getVersion` / `Target.getTargets` calls returned. Playwright stalled only because nine old task-created admin page targets no longer answered `Page.getFrameTree`; it attaches to every target during `connectOverCDP`. Those nine stale tabs were closed through CDP, without terminating Chrome or changing either profile. The retained admin page and customer profile then attached in approximately 125 ms.

A live quotation initially exposed an actual deployment defect: `ENOENT` for the dynamically read Arimo WOFF files under `/var/task/node_modules`. `next.config.mjs` now traces the four Arimo weights explicitly. The corrective deployment is `dpl_JAG76fRFWpvhQP8NzhXDAeF9nxaU` (Ready); its first generated quote succeeded and stored its PDF.

Fresh production evidence is kept at `C:\ceter.tmp\document-verification\live` (the intended evidence location; no unrelated files were moved):

| Document/workflow | Live identifier | Result | Evidence |
| --- | --- | --- | --- |
| LPO quotation | `QTN-20260910095537-BFDC73F85173011F` | Stored and customer-downloaded | `live-quotation-lpo.pdf` (49,107 bytes) |
| Quote â†’ invoice LPO propagation | `INV-20260910095909-030AC17304F516A8` | Stored and customer-downloaded; rendered invoice displays `LPO No.: LPO-LIVE-20260910-002` | `live-invoice-lpo-converted.pdf` (49,125 bytes), `live-invoice-lpo-converted.png` |
| Multipage sales invoice | `INV-20260910100314-A27AB738BB689BB3` | Stored and customer-downloaded; parsed as 2 pages | `live-invoice-multipage.pdf` (51,218 bytes) |
| Receipt | `RCT-20260910100655-D072D619928E0223` | Controlled UAT payment generated and customer-downloaded | `live-receipt.pdf` (47,698 bytes) |
| Customer statement | `STM-2026-1789034862881` | Generated through customer portal and downloaded | `live-customer-statement.pdf` (48,228 bytes) |

Fresh viewer renders are `reference-live-comparison.png`, `live-quotation-lpo.png`, `live-invoice-lpo-converted.png` and their `-closing.png` counterparts. They show the same Letter geometry, Ceter logo position, two-rule header divider, bordered table, totals/payment block and footer layout as the reference. The visible typography difference remains material: operational text is Arimo, not Arial; its glyph widths/letter shapes differ slightly, most noticeably in narrow metadata values and table labels. Poppins remains the display face.
