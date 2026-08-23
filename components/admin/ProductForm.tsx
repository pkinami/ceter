import type { Product } from "@prisma/client";
import { deleteProductAction, upsertProductAction } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

type LookupBrand = { id: string; name: string; slug: string };
type LookupCategory = { id: string; name: string; slug: string; parent_id: string | null };

export function ProductForm({ product, brands, categories }: { product?: Product | null; brands: LookupBrand[]; categories: LookupCategory[] }) {
  const images = Array.isArray(product?.images) ? product.images.filter((item): item is string => typeof item === "string") : [];
  const specs = product?.specs && typeof product.specs === "object" && !Array.isArray(product.specs)
    ? Object.entries(product.specs).map(([key, value]) => `${key}: ${String(value)}`).join("\n")
    : "";

  return (
    <section className="ceter-admin-panel ceter-admin-form-panel">
      <form action={upsertProductAction} className="ceter-admin-form">
        <input type="hidden" name="id" value={product?.id ?? ""} />
        <input type="hidden" name="return_to" value={product ? `/admin/products/${product.id}/edit` : "/admin/products/new"} />
        <FormField label="Product name" name="name" required defaultValue={product?.name ?? ""} />
        <FormField label="Product slug" name="slug" defaultValue={product?.slug ?? ""} placeholder="Auto-generated from product name if blank" />
        <FormField label="SKU" name="sku" defaultValue={product?.sku ?? ""} />
        <FormField label="MPN" name="mpn" defaultValue={product?.mpn ?? ""} />
        <label>
          Brand
          <select name="brand_id" defaultValue={product?.brand_id ?? ""}>
            <option value="">Unbranded</option>
            {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
          </select>
        </label>
        <label>
          Category
          <select name="category_id" defaultValue={product?.category_id ?? ""}>
            <option value="">Uncategorised</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <FormField label="Cost price" name="cost_price_kes" type="number" min={0} defaultValue={product?.cost_price_kes ?? ""} />
        <FormField label="Selling price" name="price_kes" type="number" min={0} required defaultValue={product?.price_kes ?? 0} />
        <FormField label="Stock quantity" name="stock_quantity" type="number" min={0} defaultValue={product?.stock_quantity ?? 0} />
        <label>
          Stock status
          <select name="stock_status" defaultValue={product?.stock_status ?? "in_stock"}>
            <option value="in_stock">In stock</option>
            <option value="backorder">Backorder</option>
            <option value="out_of_stock">Out of stock</option>
          </select>
        </label>
        <FormField label="Reorder level" name="reorder_level" type="number" min={0} defaultValue={product?.reorder_level ?? 0} />
        <FormField label="Reorder quantity" name="reorder_quantity" type="number" min={0} defaultValue={product?.reorder_quantity ?? 0} />
        <FormField label="Supplier company" name="supplier_name" defaultValue={product?.supplier_name ?? ""} placeholder="Supplier business name" />
        <FormField label="Lead time days" name="supplier_lead_time_days" type="number" min={0} defaultValue={product?.supplier_lead_time_days ?? ""} />
        <label>
          Condition
          <select name="condition" defaultValue={product?.condition ?? "new"}>
            <option value="new">New</option>
            <option value="refurbished">Refurbished</option>
          </select>
        </label>
        <div className="ceter-admin-check-grid">
          <label><input type="checkbox" name="is_published" defaultChecked={product?.is_published ?? true} /> Published</label>
          <label><input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} /> Featured</label>
          <label><input type="checkbox" name="show_offer_badge" defaultChecked={product?.show_offer_badge ?? false} /> Offer badge</label>
          <label><input type="checkbox" name="show_flash_sale_badge" defaultChecked={product?.show_flash_sale_badge ?? false} /> Flash sale</label>
        </div>
        <label className="wide">
          Description
          <textarea required name="description" defaultValue={product?.description ?? ""} />
        </label>
        <label>
          Upload primary image
          <input name="primary_image_file" type="file" accept="image/*" />
        </label>
        <FormField label="Primary image URL" name="primary_image" defaultValue={images[0] ?? ""} placeholder="https://... or /product-placeholder.svg" />
        <label className="wide">
          Image URLs, one per line
          <textarea name="images" defaultValue={images.join("\n")} />
        </label>
        <label className="wide">
          Specs, one Key: Value per line
          <textarea name="specs" defaultValue={specs} />
        </label>
        <div className="ceter-admin-form-actions">
          <FormSubmitButton className="ceter-admin-primary-button" pendingText={product ? "Saving product..." : "Creating product..."}>{product ? "Save Product" : "Create Product"}</FormSubmitButton>
          <a className="ceter-admin-secondary-button" href="/admin/products">Cancel</a>
        </div>
      </form>
      {product ? (
        <div className="ceter-admin-delete-zone">
          <p>Delete only when this catalogue item should be removed from the storefront. Historical orders and quotes keep their line records.</p>
          <form action={deleteProductAction}>
            <input type="hidden" name="id" value={product.id} />
            <FormSubmitButton className="ceter-admin-danger-button" pendingText="Deleting product..." confirmMessage="Delete this product? Dependent cart, price, and stock records will be removed.">Delete Product</FormSubmitButton>
          </form>
        </div>
      ) : null}
    </section>
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
