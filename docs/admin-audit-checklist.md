# Ceter Admin Audit Checklist

Audit started: 2026-09-10 Africa/Nairobi.

## Scope Tracker

| Phase | Area | Status | Notes |
| --- | --- | --- | --- |
| 1 | Inventory and live baseline audit | PARTIAL | Code inventory and production read-only screenshots captured. Full action testing blocked by safe-side-effect constraints and local auth. |
| 2 | Navigation cleanup and admin UI/UX repairs | IMPLEMENTED | First Reports group renamed to Billing & Documents. |
| 2 | Homepage & Banners redesign | IMPLEMENTED | Homepage sections edited in place; banner tab links/copy aligned with Homepage & Banners. |
| 2 | Featured Products redesign | IMPLEMENTED | Two-table layout replaced with selected list and product picker drawer. |
| 3 | Document generation/export inventory | PARTIAL | Shared renderer and generated paths identified; absent candidates marked. |
| 3 | Known PDF defects | IMPLEMENTED | Shared renderer and delivery-note generator repaired. |
| 4 | Tests, deployment and final report | BLOCKED | Production deployment blocked by unrelated dirty worktree and lack of safe local authenticated admin session. |

## Issue Register

| Issue ID | Module/document | Problem | Severity | Root cause | Fix status | Retest |
| --- | --- | --- | --- | --- | --- | --- |
| ADM-NAV-001 | Admin navigation | Finance document group is labelled "Reports", duplicating analytical Reports. | Medium | `lib/admin/modules.ts` label mismatch. | Fixed locally | Not production-verified |
| ADM-QTE-001 | Quotes | `/admin/quotes/[id]` renders the quotation listing instead of selected quotation detail. | High | Detail route returned `<QuotesPage />` and ignored the route id. | Fixed locally | Build-verified; not production-verified |
| ADM-FTR-001 | Featured Products | Add/remove action can be permission-denied for users who can open Featured Products. | High | Page used `storefront.featured.manage`; mutation used `products.feature`. | Fixed locally | Build-verified; not production-verified |
| ADM-FTR-002 | Featured Products | Cramped two-table page, internal `is_featured` copy, no drawer-style product picker. | Medium | Candidate picker and selected list rendered as equal grid panels. | Fixed locally | Build-verified; local browser auth blocked |
| ADM-HOM-001 | Homepage & Banners | Homepage management has ambiguous tabs and inline editor/list crowding. | Medium | Form/list layout did not separate management modes or preview clearly. | Fixed locally | Build-verified; local browser auth blocked |
| DOC-PDF-001 | Quotation/invoice/delivery PDFs | Stray `|` appears when customer address is missing. | High | Shared renderer fell back to literal `"|"` for missing address. | Fixed locally | Regression script generated PDFs |
| DOC-PDF-002 | Invoice PDFs | Invoice metadata uses quotation number/expiry labels and quotation terms. | High | Shared renderer used `quoteMeta()` and quotation-oriented closing for all document types. | Fixed locally | Regression script generated invoice |
| DOC-PDF-003 | Delivery note PDFs | Delivery notes inherit pricing/payment/totals presentation. | High | Shared financial table/closing were forced for all document types. | Fixed locally | Regression script generated delivery note |
| DOC-PDF-004 | Commercial PDFs | Tax copy hardcodes "inclusive" even when arithmetic adds VAT separately. | High | `defaultTaxInfo()` did not use stored tax treatment. | Fixed locally | Regression script generated PDFs |
| DOC-PDF-005 | Commercial PDFs | Logo is too close to the right edge. | Medium | Header image was drawn at fixed `x: 480` without margin fitting. | Fixed locally | Regression script generated PDFs |

## Baseline Action Matrix

| Module | Route | Action | Expected result | Actual result | Status | Evidence | Issue ID |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Dashboard | `/admin` | Quick Actions navigation | Opens the target workflow allowed for the role. | Source shows quick links routed through `AdminQuickActions`; browser retest pending. | BLOCKED | Authenticated browser verification pending. |  |
| Storefront | `/admin/storefront/homepage` | Homepage Sections tab | Shows section summary, list, editor and storefront preview. | Source shows inline editor/list; UX needs redesign. | FAIL | `app/admin/storefront/homepage/page.tsx` | ADM-HOM-001 |
| Storefront | `/admin/storefront/homepage?tab=banners` | Banners tab | Shows banner list, previews, edit, enable/disable, ordering, scheduling and assets. | Source exposes capabilities but uses separate nested page and dense editor. | FAIL | `app/admin/storefront/banners/page.tsx` | ADM-HOM-001 |
| Storefront | `/admin/storefront/featured` | Add/remove featured product | Persists selected featured products and refreshes storefront. | Source has permission mismatch and two-table layout. | FAIL | `app/admin/storefront/featured/page.tsx`, `app/admin/actions.ts` | ADM-FTR-001 ADM-FTR-002 |
| Sales | `/admin/quotes/[id]` | View quotation | Opens selected quotation with actual record data. | Route ignores id and returns listing. | FAIL | `app/admin/quotes/[id]/page.tsx` | ADM-QTE-001 |
| Billing & Documents | Generated quotation/invoice/delivery PDFs | Preview/download generated document | Correct labels, data, tax copy and document-specific layout. | Shared renderer has quotation labels, stray address separator, hardcoded inclusive tax and delivery pricing blocks. | FAIL | `lib/business/documents.ts` | DOC-PDF-001 DOC-PDF-002 DOC-PDF-003 DOC-PDF-004 DOC-PDF-005 |

## Evidence

| Evidence | Path/result | Notes |
| --- | --- | --- |
| Production dashboard screenshot | `.tmp/admin-dashboard.png` | Authenticated Chrome session on localhost:9222 reached production admin. |
| Production Homepage & Banners baseline | `.tmp/prod-homepage-banners.png` | Shows joined labels and unclear stats before local fix. |
| Production Featured Products baseline | `.tmp/prod-featured.png` | Shows cramped two-table layout and internal `is_featured` copy before local fix. |
| Production Quotes baseline | `.tmp/prod-quotes.png` | Listing captured from authenticated production session. |
| Production quote detail baseline | `.tmp/prod-quote-detail-before.png` | Navigation landed on quotations listing/business tab, not selected-record detail. |
| Local sample quotation PDF | `.tmp/sample-quotation.pdf`, `.tmp/quotation-regression.pdf` | Generated from repaired renderer. |
| Local sample invoice PDF | `.tmp/sample-invoice.pdf`, `.tmp/multipage-invoice-regression.pdf` | Generated from repaired renderer; regression case is multipage. |
| Local sample delivery note PDF | `.tmp/sample-delivery-note.pdf`, `.tmp/delivery-note-regression.pdf` | Generated from repaired renderer with delivery columns/acknowledgement. |

## Tests Run

| Command | Result |
| --- | --- |
| `npx prisma validate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npx tsx scripts/verify-document-renderer.ts` | PASS: quotation 1 page, multipage invoice 2 pages, delivery note 1 page |

## Blockers

| Area | Status | Reason |
| --- | --- | --- |
| Local authenticated admin browser retest | BLOCKED | Provided production admin Chrome session does not authenticate `localhost:3000`; local admin redirects to `/admin/login`. |
| Production deployment | BLOCKED | Worktree contains extensive unrelated modifications and deletions predating this task. Deploying the whole checkout would violate the no-unrelated-changes requirement. |
| Destructive/side-effect actions | BLOCKED | No approval was requested or granted for stock, payment, SMS, eTIMS, signing, deletion, or posted financial side effects. |
| Rendered PDF page screenshots | BLOCKED | Local Chromium downloads PDFs in headless mode and no `pdftoppm`, ImageMagick, or MuPDF rasterizer is installed. Generated PDFs are available for manual inspection. |

## Release and Live Retest (2026-09-10)

| Item | Result | Evidence |
| --- | --- | --- |
| Release baseline | `171abe6` (`origin/main`) | Isolated `audit-release` worktree created; original dirty checkout retained. |
| Release commits | `fe78dbb`, `5318d63` | Dependency-closed admin/document audit cohort; second commit keeps Sign out under Integrations only. |
| Database migrations | PASS | `npx prisma migrate status`: production database is up to date through `0037_unique_document_numbers`; no migration applied by this release. |
| Local document regression | PASS | `npx tsx scripts/verify-document-renderer.ts`: quotation 1 page, multipage invoice 2 pages, delivery note 1 page. |
| Production deployment | PASS | `vercel.cmd --prod --yes` completed from the isolated release worktree; live authenticated UI subsequently served the new navigation and feature UI. |
| Live navigation | PASS | Billing & Documents replaces the first Reports label; analytical Reports remains; exactly one Sign out is shown under Integrations. |
| Live Featured Products | PASS | `/admin/storefront/featured` showed full-width selected records; `/admin/storefront/featured?picker=1&q=Zebra` showed searchable add candidates. |
| Live Homepage & Banners | PASS | `/admin/storefront/homepage` and `?tab=banners` show separate management modes, editor controls and banner list. |
| Live quote detail | PASS | Selected quotation `10ff91a0-3b7b-482e-8929-92ef41b53fff` opened at its direct route with customer, line, total, VAT, status and document data. |

## Remaining Scope / Final Status

The audit remains **PARTIAL PASS**. The targeted repaired workflows above are deployed and live-verified. The full requested action matrix is not complete: all create/edit/delete/status and role-negative paths across every module, customer quotation ownership, responsive testing, public storefront persistence after a controlled content mutation, fresh production PDF generation/rendering, and sandbox-only financial/stock/integration effects still require execution. Existing historical PDFs must not be used as proof of the new renderer.

## Document Inventory

| Document/export type | Path/source | Status | Notes |
| --- | --- | --- | --- |
| Quotation | `app/admin/business/actions.ts#createDocumentFor("quote")` | IMPLEMENTED | Uses shared renderer. |
| Proforma invoice | `app/admin/business/actions.ts#createDocumentFor("proforma")` | IMPLEMENTED | Uses shared renderer. |
| Invoice | `app/admin/business/actions.ts#createDocumentFor("invoice")` | IMPLEMENTED | Uses shared renderer. |
| Receipt | `lib/business/settlement.ts` and business actions | IMPLEMENTED | Uses shared renderer. |
| Delivery note | `lib/admin/sales-billing.ts#ensureDeliveryNoteDocument` | IMPLEMENTED | Uses shared renderer. |
| Customer statement | `app/account/actions.ts`, `app/admin/business/actions.ts` | IMPLEMENTED | Uses shared renderer. |
| Purchase order | `app/admin/business/actions.ts#createPurchaseOrderAction` | IMPLEMENTED | Uses shared renderer. |
| Goods-received document | Admin goods-received workflow | NOT IMPLEMENTED | No generated PDF path found in initial source scan. |
| Stock transfer | Inventory workflow | NOT IMPLEMENTED | No generated PDF path found in initial source scan. |
| Stock-take report | Inventory workflow/report exports | NOT IMPLEMENTED | No generated PDF path found in initial source scan. |
| Contract/service document | `lib/admin/service.ts` document records | PARTIAL | Contract document records exist; PDF generation path not confirmed in initial scan. |
| Report exports | `app/api/admin/exports/route.ts` | IMPLEMENTED | CSV/JSON-style exports; not PDF renderer. |
