import Link from "next/link";
import type { Product } from "@prisma/client";
import { deleteProductAction, upsertProductAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { CeterCombobox } from "@/components/admin/CeterCombobox";

type LookupBrand = { id: string; name: string; slug: string };
type LookupCategory = { id: string; name: string; slug: string; parent_id: string | null };

export function ProductForm({
  product,
  brands,
  categories,
  canEditCost = false
}: {
  product?: Product | null;
  brands: LookupBrand[];
  categories: LookupCategory[];
  canEditCost?: boolean;
}) {
  const images = Array.isArray(product?.images) ? product.images.filter((item): item is string => typeof item === "string") : [];
  const specs = product?.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
    ? Object.entries(product.specs).map(([key, value]) => `${key}: ${String(value)}`).join("\n")
    : "";

  return (
    <section className="ceter-product-form-shell">
      <form action={upsertProductAction} className="ceter-admin-form" encType="multipart/form-data">
        <input type="hidden" name="id" value={product?.id ?? ""} />
        <input type="hidden" name="return_to" value={product ? `/admin/products/${product.id}/edit` : "/admin/products/new"} />
        {product ? <input type="hidden" name="slug" value={product.slug} /> : null}
        <input type="hidden" name="mpn" value={product?.mpn ?? ""} />
        <input type="hidden" name="condition" value={product?.condition ?? "new"} />
        <input type="hidden" name="stock_status" value={product?.stock_status ?? "in_stock"} />
        <input type="hidden" name="reorder_quantity" value={product?.reorder_quantity ?? 0} />
        <input type="hidden" name="supplier_name" value={product?.supplier_name ?? ""} />
        <input type="hidden" name="supplier_lead_time_days" value={product?.supplier_lead_time_days ?? ""} />
        <input type="hidden" name="images" value={images.slice(1).join("\n")} />
        <input type="hidden" name="specs" value={specs} />
        {product?.is_published ?? true ? <input type="hidden" name="is_published" value="on" /> : null}
        {product?.is_featured ? <input type="hidden" name="is_featured" value="on" /> : null}
        {product?.show_offer_badge ? <input type="hidden" name="show_offer_badge" value="on" /> : null}
        {product?.show_flash_sale_badge ? <input type="hidden" name="show_flash_sale_badge" value="on" /> : null}
        <FormSection title="Product Information">
          <FormField label="Name" name="name" required defaultValue={product?.name ?? ""} />
          <CeterCombobox label="Type" name="item_type" defaultValue="product" options={[{ value: "product", label: "Product" }, { value: "service", label: "Service" }, { value: "raw_material", label: "Raw Material" }]} />
          <CeterCombobox label="Category" name="category_id" defaultValue={product?.category_id ?? ""} placeholder="Search categories" options={[{ value: "", label: "Uncategorised" }, ...categories.map((category) => ({ value: category.id, label: category.name }))]} />
          <CeterCombobox label="Brand" name="brand_id" defaultValue={product?.brand_id ?? ""} placeholder="Search brands" options={[{ value: "", label: "Unbranded" }, ...brands.map((brand) => ({ value: brand.id, label: brand.name }))]} />
          <FormField label="SKU" name="sku" defaultValue={product?.sku ?? ""} />
        </FormSection>

        <FormSection title="Pricing">
          {canEditCost ? (
            <FormField label="Buying price" name="cost_price_kes" type="number" min={0} defaultValue={product?.cost_price_kes ?? ""} />
          ) : (
            <div className="ceter-admin-readonly-field">
              <span>Buying price</span>
              <strong>Restricted</strong>
            </div>
          )}
          <FormField label="Selling price" name="price_kes" type="number" min={0} required defaultValue={product?.price_kes ?? 0} />
          <CeterCombobox label="Tax" name="tax_type" defaultValue="vat_standard" options={[{ value: "vat_standard", label: "VAT Standard" }, { value: "vat_exempt", label: "VAT Exempt" }, { value: "zero_rated", label: "Zero Rated" }]} />
        </FormSection>

        <FormSection title="Inventory">
          {product ? (
            <div className="ceter-admin-readonly-field">
              <span>Available stock</span>
              <strong>{product.stock_quantity.toLocaleString("en-KE")}</strong>
              <small>Use Inventory Stock Control for audited stock changes.</small>
            </div>
          ) : (
            <FormField label="Opening stock" name="stock_quantity" type="number" min={0} defaultValue={0} />
          )}
          <FormField label="Minimum stock" name="reorder_level" type="number" min={0} defaultValue={product?.reorder_level ?? 0} />
          <CeterCombobox label="Unit" name="unit" defaultValue="pcs" options={[{ value: "pcs", label: "Pieces" }, { value: "unit", label: "Unit" }, { value: "box", label: "Box" }, { value: "service", label: "Service" }]} />
        </FormSection>

        <FormSection title="Additional">
          <label>
            Image
            <input name="primary_image_file" type="file" accept="image/*" />
          </label>
          <FormField label="Primary image URL" name="primary_image" defaultValue={images[0] ?? ""} placeholder="https://example.com/product-image.jpg" />
          <label className="wide">
            Description
            <textarea required name="description" defaultValue={product?.description ?? ""} />
          </label>
        </FormSection>
        <div className="ceter-admin-form-actions">
          <FormSubmitButton className="ceter-admin-primary-button" pendingText={product ? "Saving product..." : "Creating product..."}>{product ? "Save Product" : "Create Product"}</FormSubmitButton>
          <Link className="ceter-admin-secondary-button" href="/admin/products">Cancel</Link>
        </div>
      </form>
      {product ? (
        <div className="ceter-admin-delete-zone">
          <p>Archive when this catalogue item should be removed from the storefront. Historical orders, quotes, prices, stock movements and serial records remain intact.</p>
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <FormSubmitButton className="ceter-admin-danger-button" pendingText="Archiving product..." confirmMessage="Archive this product and remove it from public visibility?">Archive Product</FormSubmitButton>
          </form>
        </div>
      ) : null}
    </section>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="ceter-product-form-section">
      <legend>{title}</legend>
      <div>{children}</div>
    </fieldset>
  );
}

function FormField({ label, name, type = "text", required, min, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; min?: number; defaultValue?: string | number | null; placeholder?: string }) {
  return (
    <label>
      {label}
      <input name={name} type={type} required={required} min={min} defaultValue={defaultValue ?? ""} placeholder={placeholder} autoComplete="off" />
    </label>
  );
}
