# Ceter Import Templates

Use `.xlsx` workbooks only. Uploads are limited to 5 MB and 500 data rows. The first worksheet must contain the exact column headers listed below. Existing rows are updated by `slug`; new slugs are created.

## Product File

Template: `public/templates/ceter-products-import-template.xlsx`

Required columns:

`name`, `slug`, `description`, `category`, `brand`, `mpn`, `sku`, `price_kes`, `cost_price_kes`, `supplier_name`, `supplier_lead_time_days`, `reorder_level`, `reorder_quantity`, `condition`, `stock_status`, `stock_quantity`, `images`, `specs`, `is_featured`, `is_published`

Required values:

- `name`: product name.
- `slug`: unique lowercase slug using letters, numbers, and single hyphens.
- `description`: plain product description.
- `price_kes`: whole number greater than or equal to 0.

Accepted optional values:

- `category`: existing category slug or name. A new category is created when the value is a valid slug that does not exist.
- `brand`: existing brand slug or name. A new brand is created when the value can be converted to a slug.
- `mpn`: manufacturer part number or model.
- `sku`: internal stock keeping unit.
- `cost_price_kes`, `supplier_lead_time_days`, `reorder_level`, `reorder_quantity`, `stock_quantity`: whole numbers. Blank `reorder_level`, `reorder_quantity`, and `stock_quantity` default to `0`.
- `condition`: `new` or `refurbished`. Blank defaults to `new`.
- `stock_status`: `in_stock`, `backorder`, or `out_of_stock`. Blank defaults to `in_stock`.
- `images`: 1-3 URLs or paths separated by semicolons. Blank uses `/product-placeholder.svg`.
- `specs`: semicolon-separated `Key: Value` pairs, for example `Speed: 40ppm; Paper size: A4`.
- `is_featured`: `true`/`false`, `yes`/`no`, `1`/`0`, or blank. Blank defaults to `false`.
- `is_published`: `true`/`false`, `yes`/`no`, `1`/`0`, or blank. Blank defaults to `true`.

## Category File

Template: `public/templates/ceter-categories-import-template-v2.xlsx`

Required columns:

`name`, `slug`, `parent_slug`, `description`, `icon`, `image`, `sort_order`

Required values:

- `name`: category name.
- `slug`: unique lowercase slug using letters, numbers, and single hyphens.

Hierarchy rules:

- Leave `parent_slug` blank for a root category.
- Use an existing category slug, or a parent row that appears earlier in the same workbook, to create a subcategory.
- Supported depth is root > subcategory > sub-subcategory.
- `parent_slug` cannot point to the same row and cannot point to a sub-subcategory.
- Only siblings under the same parent are ordered together.

Accepted optional values:

- `description`: plain category description.
- `icon`: icon text or image URL matching the manual category form.
- `image`: 1-3 URLs or paths separated by semicolons. The first image is stored as the category image.
- `sort_order`: whole number used to order siblings. Blank defaults to `0`.
