# Imports

## Rules

Implemented in `lib/admin-import.ts`:

- Categories import before products.
- Categories and products are upserted by slug.
- Product rows validate distinct slug, SKU and MPN values within the workbook.
- Existing nonblank SKU and MPN values are protected by partial unique indexes.
- Product imports must reference existing categories.
- Product imports do not invent missing brands or suppliers.
- Existing product images are preserved when an update row has no new image.
- New products without an image receive the storefront placeholder image.
- Missing images produce administrator warnings.
- Reused image URLs are allowed.
- Category relationships are validated with maximum three-level hierarchy.
- Category self-parenting and excessive depth are rejected.
- Products absent from spreadsheets are never deleted.
- Import logs and row errors are stored immutably.
- Refurbished products are imported unpublished and flagged for review.

## Source Workbooks

- `data/source/ceter-categories-full.xlsx` is the authoritative full category hierarchy.
- `data/source/ceter-products-300-official-images.xlsx` is the authoritative 300-product source workbook with official image references.
- Older source workbooks are retained only as import provenance. Do not use them as the active import source without a reviewed reconciliation.

## Templates

Product template: `public/templates/ceter-products-import-template.xlsx`

Required columns:

`name`, `slug`, `description`, `category`, `brand`, `mpn`, `sku`, `price_kes`, `cost_price_kes`, `supplier_name`, `supplier_lead_time_days`, `reorder_level`, `reorder_quantity`, `condition`, `stock_status`, `stock_quantity`, `images`, `specs`, `is_featured`, `is_published`

Category template: `public/templates/ceter-categories-import-template-v2.xlsx`

Required columns:

`name`, `slug`, `parent_slug`, `description`, `icon`, `sort_order`

Use `.xlsx` workbooks only. Uploads are limited to 5 MB and 500 data rows. The first worksheet must contain the exact column headers.

## Product Image Storage

Product import uses the Supabase Storage bucket named by `SUPABASE_PRODUCT_IMAGES_BUCKET`, defaulting to `product-images`. The bucket must exist before imports with images are confirmed.

Server-side writes use `SUPABASE_SERVICE_ROLE_KEY`; service-role credentials must never be exposed in browser code.
