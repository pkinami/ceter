import { redirect } from "next/navigation";
import type { Prisma, StockStatus } from "@prisma/client";
import {
  deleteBrandAction,
  deleteCategoryAction,
  deleteHomepageSectionAction,
  deleteProductAction,
  deleteServiceAction,
  updateOrderStatusAction,
  updateQuoteStatusAction,
  upsertBannerAction,
  upsertBrandAction,
  upsertCategoryAction,
  upsertHomepageSectionAction,
  upsertProductAction,
  upsertServiceAction
} from "@/app/admin/actions";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";
import { BannerAdminForm } from "@/app/admin/BannerAdminForm";
import { ExcelImportPanel } from "@/app/admin/ExcelImportPanel";

export const metadata = { title: "Admin" };

type AdminSearchParams = {
  edit?: string;
  q?: string;
  category?: string;
  brand?: string;
  stock?: string;
};

function asStringArray(value: Prisma.JsonValue | undefined) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatSpecs(value: Prisma.JsonValue | undefined) {
  if (!value || Array.isArray(value) || typeof value !== "object") return "";
  return Object.entries(value).map(([key, entry]) => `${key}: ${String(entry)}`).join("\n");
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const categoryFilter = params.category?.trim() ?? "";
  const brandFilter = params.brand?.trim() ?? "";
  const stockFilter = params.stock?.trim() ?? "";
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const productWhere: Prisma.ProductWhereInput = {
    AND: [
      query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { slug: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } }
            ]
          }
        : {},
      categoryFilter ? { category_id: categoryFilter } : {},
      brandFilter ? { brand_id: brandFilter } : {},
      stockFilter ? { stock_status: stockFilter as StockStatus } : {}
    ]
  };

  const [productCount, lowStock, newQuotes, recentOrders, categories, brands, products, quotes, editProduct, banners, services, homepageSections] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { OR: [{ stock_status: "backorder" }, { stock_quantity: { lt: 5 } }] } }),
    prisma.quoteRequest.count({ where: { status: "new" } }),
    prisma.order.findMany({
      include: {
        profile: { select: { full_name: true } },
        order_items: { include: { product: { select: { name: true, slug: true } } } }
      },
      orderBy: { created_at: "desc" },
      take: 10
    }),
    prisma.category.findMany({ select: { id: true, name: true, slug: true, description: true, icon: true, image: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true, slug: true, icon: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({
      where: productWhere,
      include: { category: { select: { name: true } }, brand: { select: { name: true } } },
      orderBy: { created_at: "desc" }
    }),
    prisma.quoteRequest.findMany({
      select: { id: true, name: true, email: true, phone: true, service_needed: true, status: true, created_at: true },
      orderBy: { created_at: "desc" },
      take: 20
    }),
    params.edit ? prisma.product.findUnique({ where: { id: params.edit } }) : null,
    prisma.banner.findMany({ include: { category: { select: { slug: true } } }, orderBy: [{ placement: "asc" }, { sort_order: "asc" }] }),
    prisma.serviceEntry.findMany({ orderBy: [{ sort_order: "asc" }, { title: "asc" }] }),
    prisma.homepageSection.findMany({ include: { category: { select: { name: true } } }, orderBy: [{ sort_order: "asc" }, { title: "asc" }] })
  ]);
  const bannerAssetIndexes = new Map<string, number>();
  let mainBannerIndex = 0;
  let servicesBannerIndex = 0;
  banners.forEach((banner) => {
    if (banner.placement === "main" || banner.placement === "top") {
      bannerAssetIndexes.set(banner.id, mainBannerIndex);
      mainBannerIndex += 1;
    }
    if (banner.placement === "services" || banner.placement === "bottom") {
      bannerAssetIndexes.set(banner.id, servicesBannerIndex);
      servicesBannerIndex += 1;
    }
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section>
        <h1 className="text-2xl font-black text-ink">Admin dashboard</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total products" value={String(productCount)} />
          <Metric label="Low stock/backorder" value={String(lowStock)} />
          <Metric label="New quote requests" value={String(newQuotes)} />
          <Metric label="Recent orders" value={String(recentOrders.length)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form action={upsertProductAction} encType="multipart/form-data" className="rounded-lg border border-slate-300 bg-white p-5">
          <h2 className="text-lg font-black text-ink">{editProduct ? "Edit product" : "Add product"}</h2>
          <input type="hidden" name="id" defaultValue={editProduct?.id ?? ""} />
          <div className="mt-4 grid gap-3">
            <Input name="name" label="Name" defaultValue={editProduct?.name ?? ""} />
            <Input name="slug" label="Slug" defaultValue={editProduct?.slug ?? ""} />
            <Input name="price_kes" label="Price KES" type="number" defaultValue={editProduct?.price_kes ?? 0} />
            <Input name="stock_quantity" label="Stock quantity" type="number" defaultValue={editProduct?.stock_quantity ?? 0} />
            <label className="block text-sm font-bold text-slate-700">
              Category
              <select name="category_id" defaultValue={editProduct?.category_id ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Brand
              <select name="brand_id" defaultValue={editProduct?.brand_id ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Select brand</option>
                {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Condition
              <select name="condition" defaultValue={editProduct?.condition ?? "new"} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
                <option value="new">New</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Stock status
              <select name="stock_status" defaultValue={editProduct?.stock_status ?? "in_stock"} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
                <option value="in_stock">In stock</option>
                <option value="backorder">Backorder</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Description
              <textarea name="description" defaultValue={editProduct?.description ?? ""} className="mt-2 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Images, one per line
              <textarea name="images" defaultValue={asStringArray(editProduct?.images).join("\n") || "/product-placeholder.svg"} className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Upload primary image
              <input name="primary_image_file" type="file" accept="image/*" className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Specs, `Key: Value` per line
              <textarea name="specs" defaultValue={formatSpecs(editProduct?.specs)} className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" name="is_featured" defaultChecked={Boolean(editProduct?.is_featured)} />
              Featured
            </label>
            <button className="h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">{editProduct ? "Update product" : "Create product"}</button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4">
              <h2 className="text-lg font-black text-ink">Products</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_180px_180px_auto]">
                <input name="q" defaultValue={query} placeholder="Search products" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <select name="category" defaultValue={categoryFilter} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <select name="brand" defaultValue={brandFilter} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">All brands</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                </select>
                <select name="stock" defaultValue={stockFilter} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  <option value="">All stock</option>
                  <option value="in_stock">In stock</option>
                  <option value="backorder">Backorder</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
                <button className="h-10 rounded-md bg-ink px-4 text-sm font-bold text-white">Filter</button>
              </form>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-mist text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold text-ink">{product.name}</td>
                      <td className="px-4 py-3">{product.category?.name ?? "-"}</td>
                      <td className="px-4 py-3">{product.brand?.name ?? "-"}</td>
                      <td className="px-4 py-3">{formatKes(product.price_kes)}</td>
                      <td className="px-4 py-3">{product.stock_status} / {product.stock_quantity}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <a href={`/admin?edit=${product.id}`} className="rounded-md border border-slate-300 px-3 py-2 font-semibold">Edit</a>
                          <form action={deleteProductAction}>
                            <input type="hidden" name="id" value={product.id} />
                            <button className="rounded-md border border-red-200 px-3 py-2 font-semibold text-red-700">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <ExcelImportPanel />

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Categories</h2></div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <form action={upsertCategoryAction} className="grid gap-3 rounded-md border border-slate-200 p-4">
                <h3 className="text-sm font-black uppercase text-slate-600">Create category</h3>
                <Input name="name" label="Name" />
                <Input name="slug" label="Slug" />
                <Input name="icon" label="Lucide icon name" defaultValue="Printer" />
                <Input name="image" label="Category image URL" />
                <label className="block text-sm font-bold text-slate-700">
                  Description
                  <textarea name="description" className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <button className="h-10 rounded-md bg-ink px-4 text-sm font-bold text-white">Create category</button>
              </form>
              <div className="space-y-3">
                {categories.map((category) => (
                  <form key={category.id} action={upsertCategoryAction} className="grid gap-2 rounded-md border border-slate-200 p-3">
                    <input type="hidden" name="id" value={category.id} />
                    <div className="grid gap-2 md:grid-cols-2">
                      <input name="name" defaultValue={category.name} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="slug" defaultValue={category.slug} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    </div>
                    <input name="icon" defaultValue={category.icon ?? ""} placeholder="Icon" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    <input type="hidden" name="existing_image" value={category.image ?? ""} />
                    <input name="image" defaultValue={category.image ?? ""} placeholder="Category image URL" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    <textarea name="description" defaultValue={category.description ?? ""} className="min-h-16 rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">Save</button>
                      <DeleteButton action={deleteCategoryAction} id={category.id} />
                    </div>
                  </form>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Brands</h2></div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <form action={upsertBrandAction} encType="multipart/form-data" className="grid gap-3 rounded-md border border-slate-200 p-4">
                <h3 className="text-sm font-black uppercase text-slate-600">Create brand</h3>
                <Input name="name" label="Name" />
                <Input name="slug" label="Slug" />
                <Input name="icon" label="Icon/image URL" defaultValue="/product-placeholder.svg" />
                <label className="block text-sm font-bold text-slate-700">
                  Upload brand icon
                  <input name="icon_file" type="file" accept="image/*" className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </label>
                <button className="h-10 rounded-md bg-ink px-4 text-sm font-bold text-white">Create brand</button>
              </form>
              <div className="space-y-3">
                {brands.map((brand) => (
                  <form key={brand.id} action={upsertBrandAction} encType="multipart/form-data" className="grid gap-2 rounded-md border border-slate-200 p-3">
                    <input type="hidden" name="id" value={brand.id} />
                    <input type="hidden" name="existing_icon" value={brand.icon ?? ""} />
                    <div className="grid gap-2 md:grid-cols-2">
                      <input name="name" defaultValue={brand.name} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="slug" defaultValue={brand.slug} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    </div>
                    <input name="icon" defaultValue={brand.icon ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                    <input name="icon_file" type="file" accept="image/*" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                    <div className="flex gap-2">
                      <button className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">Save</button>
                      <DeleteButton action={deleteBrandAction} id={brand.id} />
                    </div>
                  </form>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4">
              <h2 className="text-lg font-black text-ink">Banners</h2>
              <p className="mt-1 text-sm text-slate-500">Banner images are managed from the project public folder. You can continue editing the banner content and display settings.</p>
            </div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <BannerAdminForm categories={categories} action={upsertBannerAction} />
              <div className="space-y-3">
                {banners.map((banner) => <BannerAdminForm key={banner.id} banner={banner} categories={categories} action={upsertBannerAction} assetIndex={bannerAssetIndexes.get(banner.id) ?? 0} />)}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Ceter Services & Solutions</h2></div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <ServiceForm />
              <div className="space-y-3">
                {services.map((service) => <ServiceForm key={service.id} service={service} />)}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Homepage featured sections</h2></div>
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              <HomepageSectionForm categories={categories} />
              <div className="space-y-3">
                {homepageSections.map((section) => <HomepageSectionForm key={section.id} section={section} categories={categories} />)}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Recent orders</h2></div>
            <div className="divide-y divide-line">
              {recentOrders.map((order) => (
                <form key={order.id} action={updateOrderStatusAction} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-ink">{order.profile?.full_name ?? order.user_id ?? "Guest"}</p>
                    <p className="text-xs text-slate-500">{order.created_at.toLocaleString("en-KE")} | {formatKes(order.total_kes)}</p>
                    <p className="text-xs text-slate-500">{order.order_items.map((item) => `${item.quantity}x ${item.product?.name ?? "Deleted product"}`).join(", ") || "No items"}</p>
                  </div>
                  <input type="hidden" name="id" value={order.id} />
                  <select name="status" defaultValue={order.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                    <option value="pending">pending</option>
                    <option value="processing">processing</option>
                    <option value="paid">paid</option>
                    <option value="fulfilled">fulfilled</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button className="h-10 rounded-md bg-ink px-4 text-sm font-bold text-white">Update</button>
                </form>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Quote requests</h2></div>
            <div className="divide-y divide-line">
              {quotes.map((quote) => (
                <form key={quote.id} action={updateQuoteStatusAction} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-ink">{quote.name} | {quote.service_needed}</p>
                    <p className="text-xs text-slate-500">{quote.email} | {quote.phone}</p>
                  </div>
                  <input type="hidden" name="id" value={quote.id} />
                  <select name="status" defaultValue={quote.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                    <option value="new">new</option>
                    <option value="contacted">contacted</option>
                    <option value="closed">closed</option>
                  </select>
                  <button className="h-10 rounded-md bg-ink px-4 text-sm font-bold text-white">Update</button>
                </form>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-ink">{value}</p>
    </div>
  );
}

function Input({ name, label, type = "text", defaultValue }: { name: string; label: string; type?: string; defaultValue?: string | number }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <input name={name} type={type} defaultValue={defaultValue} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm" />
    </label>
  );
}

function DeleteButton({ action, id }: { action: (formData: FormData) => Promise<void>; id: string }) {
  return (
    <button formAction={action} name="id" value={id} className="rounded-md border border-red-200 px-3 py-2 text-sm font-bold text-red-700">
      Delete
    </button>
  );
}

function ServiceForm({ service }: { service?: { id: string; title: string; slug: string; description: string; image: string | null; price_kes: number | null; show_request_quote: boolean; sort_order: number; is_enabled: boolean } }) {
  return (
    <form action={upsertServiceAction} encType="multipart/form-data" className="grid gap-2 rounded-md border border-slate-200 p-3">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <input type="hidden" name="existing_image" value={service?.image ?? ""} />
      <h3 className="text-sm font-black uppercase text-slate-600">{service ? "Edit service" : "Create service"}</h3>
      <div className="grid gap-2 md:grid-cols-2">
        <input name="title" defaultValue={service?.title ?? ""} placeholder="Title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="slug" defaultValue={service?.slug ?? ""} placeholder="Slug" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      </div>
      <textarea name="description" defaultValue={service?.description ?? ""} placeholder="Description" className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <div className="grid gap-2 md:grid-cols-3">
        <input name="price_kes" type="number" defaultValue={service?.price_kes ?? ""} placeholder="Optional price" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="sort_order" type="number" defaultValue={service?.sort_order ?? 0} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="is_enabled" defaultChecked={service?.is_enabled ?? true} /> Enabled
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="show_request_quote" defaultChecked={service?.show_request_quote ?? true} /> Show Request Quote button
      </label>
      <input name="image" defaultValue={service?.image ?? ""} placeholder="Image URL" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <input name="image_file" type="file" accept="image/*" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <button className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">{service ? "Save" : "Create"}</button>
        {service ? <DeleteButton action={deleteServiceAction} id={service.id} /> : null}
      </div>
    </form>
  );
}

function HomepageSectionForm({
  section,
  categories
}: {
  section?: { id: string; title: string; section_type: string; category_id: string | null; sort_order: number; product_limit: number; is_enabled: boolean; category?: { name: string } | null };
  categories: { id: string; name: string }[];
}) {
  return (
    <form action={upsertHomepageSectionAction} className="grid gap-2 rounded-md border border-slate-200 p-3">
      <input type="hidden" name="id" value={section?.id ?? ""} />
      <h3 className="text-sm font-black uppercase text-slate-600">{section ? `Edit ${section.title}` : "Create homepage section"}</h3>
      <input name="title" defaultValue={section?.title ?? ""} placeholder="Title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <div className="grid gap-2 md:grid-cols-2">
        <select name="section_type" defaultValue={section?.section_type ?? "category_products"} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
          <option value="category_products">Category products</option>
          <option value="latest_products">Latest products</option>
          <option value="services">Services</option>
          <option value="brands">Brands</option>
        </select>
        <select name="category_id" defaultValue={section?.category_id ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
          <option value="">No category</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <input name="sort_order" type="number" defaultValue={section?.sort_order ?? 0} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="product_limit" type="number" min="1" max="24" defaultValue={section?.product_limit ?? 8} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input type="checkbox" name="is_enabled" defaultChecked={section?.is_enabled ?? true} /> Enabled
        </label>
      </div>
      <div className="flex gap-2">
        <button className="rounded-md bg-ink px-3 py-2 text-sm font-bold text-white">{section ? "Save" : "Create"}</button>
        {section ? <DeleteButton action={deleteHomepageSectionAction} id={section.id} /> : null}
      </div>
    </form>
  );
}
