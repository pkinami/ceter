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
    <div className="admin-card p-4">
      <form action={upsertProductAction}>
        <input type="hidden" name="id" value={product?.id ?? ""} />
        <input type="hidden" name="return_to" value={product ? `/admin/products/${product.id}/edit` : "/admin/products/new"} />
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold">Name<input required className="admin-input" name="name" defaultValue={product?.name ?? ""} /></label>
          <label className="grid gap-1 text-xs font-semibold">Slug<input className="admin-input" name="slug" defaultValue={product?.slug ?? ""} placeholder="Auto-generated from name if blank" /></label>
          <label className="grid gap-1 text-xs font-semibold">SKU<input className="admin-input" name="sku" defaultValue={product?.sku ?? ""} /></label>
          <label className="grid gap-1 text-xs font-semibold">MPN<input className="admin-input" name="mpn" defaultValue={product?.mpn ?? ""} /></label>
          <label className="grid gap-1 text-xs font-semibold">Brand
            <select className="admin-input" name="brand_id" defaultValue={product?.brand_id ?? ""}>
              <option value="">Unbranded</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Category
            <select className="admin-input" name="category_id" defaultValue={product?.category_id ?? ""}>
              <option value="">Uncategorised</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Cost Price<input min={0} type="number" className="admin-input" name="cost_price_kes" defaultValue={product?.cost_price_kes ?? ""} /></label>
          <label className="grid gap-1 text-xs font-semibold">Selling Price<input required min={0} type="number" className="admin-input" name="price_kes" defaultValue={product?.price_kes ?? 0} /></label>
          <label className="grid gap-1 text-xs font-semibold">Stock Quantity<input min={0} type="number" className="admin-input" name="stock_quantity" defaultValue={product?.stock_quantity ?? 0} /></label>
          <label className="grid gap-1 text-xs font-semibold">Stock Status
            <select className="admin-input" name="stock_status" defaultValue={product?.stock_status ?? "in_stock"}>
              <option value="in_stock">In stock</option>
              <option value="backorder">Backorder</option>
              <option value="out_of_stock">Out of stock</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold">Reorder Level<input min={0} type="number" className="admin-input" name="reorder_level" defaultValue={product?.reorder_level ?? 0} /></label>
          <label className="grid gap-1 text-xs font-semibold">Reorder Quantity<input min={0} type="number" className="admin-input" name="reorder_quantity" defaultValue={product?.reorder_quantity ?? 0} /></label>
          <label className="grid gap-1 text-xs font-semibold">Supplier<input className="admin-input" name="supplier_name" defaultValue={product?.supplier_name ?? ""} /></label>
          <label className="grid gap-1 text-xs font-semibold">Lead Time Days<input min={0} type="number" className="admin-input" name="supplier_lead_time_days" defaultValue={product?.supplier_lead_time_days ?? ""} /></label>
          <label className="grid gap-1 text-xs font-semibold">Condition
            <select className="admin-input" name="condition" defaultValue={product?.condition ?? "new"}>
              <option value="new">New</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="is_published" defaultChecked={product?.is_published ?? true} /> Published</label>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} /> Featured</label>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="show_offer_badge" defaultChecked={product?.show_offer_badge ?? false} /> Show Offer flame Badge</label>
          <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" name="show_flash_sale_badge" defaultChecked={product?.show_flash_sale_badge ?? false} /> Flash Sale</label>
        </div>
        <label className="mt-3 grid gap-1 text-xs font-semibold">Description<textarea required className="admin-input min-h-28 py-2" name="description" defaultValue={product?.description ?? ""} /></label>
        <label className="mt-3 grid gap-1 text-xs font-semibold">Upload Primary Image<input className="admin-input" name="primary_image_file" type="file" accept="image/*" /></label>
        <label className="mt-3 grid gap-1 text-xs font-semibold">Primary Image URL<input className="admin-input" name="primary_image" defaultValue={images[0] ?? ""} placeholder="https://... or /product-placeholder.svg" /></label>
        <label className="mt-3 grid gap-1 text-xs font-semibold">Image URLs, one per line<textarea className="admin-input min-h-24 py-2" name="images" defaultValue={images.join("\n")} /></label>
        <label className="mt-3 grid gap-1 text-xs font-semibold">Specs, one `Key: Value` per line<textarea className="admin-input min-h-24 py-2" name="specs" defaultValue={specs} /></label>
        <div className="mt-4 flex gap-2">
          <FormSubmitButton className="btn-dark" pendingText={product ? "Saving product..." : "Creating product..."}>{product ? "Save Product" : "Create Product"}</FormSubmitButton>
          <a className="btn-lite" href="/admin/products">Cancel</a>
        </div>
      </form>
      {product ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs font-semibold text-slate-500">Deleting removes this product from the storefront and clears dependent cart, price and stock records. Order and quote history keep their line records without the product link.</p>
          <DeleteProductForm id={product.id} />
        </div>
      ) : null}
    </div>
  );
}

function DeleteProductForm({ id }: { id: string }) {
  return (
    <form action={deleteProductAction}>
      <input type="hidden" name="id" value={id} />
      <FormSubmitButton className="btn-lite text-red-700" pendingText="Deleting product..." confirmMessage="Delete this product? Dependent cart, price, and stock records will be removed.">Delete Product</FormSubmitButton>
    </form>
  );
}
