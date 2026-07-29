import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deleteProductAction, updateOrderStatusAction, updateQuoteStatusAction, upsertProductAction } from "@/app/admin/actions";
import { formatKes } from "@/lib/utils";

export const metadata = { title: "Admin" };

type AdminOrder = {
  id: string;
  status: string;
  total_kes: number;
  created_at: string;
  user_id: string | null;
  profiles?: { full_name: string | null }[] | { full_name: string | null } | null;
};

type AdminQuote = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service_needed: string;
  status: string;
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  const admin = createAdminClient();
  const [productCount, lowStock, newQuotes, recentOrders, categories, brands, products, quotes] = await Promise.all([
    admin.from("products").select("id", { count: "exact", head: true }),
    admin.from("products").select("id", { count: "exact", head: true }).or("stock_status.eq.backorder,stock_quantity.lt.5"),
    admin.from("quote_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    admin.from("orders").select("id,status,total_kes,created_at,user_id,profiles(full_name)").order("created_at", { ascending: false }).limit(10),
    admin.from("categories").select("id,name").order("name"),
    admin.from("brands").select("id,name").order("name"),
    admin.from("products").select("id,name,slug,price_kes,stock_status,stock_quantity,condition,is_featured,categories(name),brands(name)").order("created_at", { ascending: false }),
    admin.from("quote_requests").select("id,name,email,phone,service_needed,status,created_at").order("created_at", { ascending: false }).limit(20)
  ]);

  const editProduct = params.edit ? (await admin.from("products").select("*").eq("id", params.edit).maybeSingle()).data : null;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <section>
        <h1 className="text-2xl font-black text-ink">Admin dashboard</h1>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric label="Total products" value={String(productCount.count ?? 0)} />
          <Metric label="Low stock/backorder" value={String(lowStock.count ?? 0)} />
          <Metric label="New quote requests" value={String(newQuotes.count ?? 0)} />
          <Metric label="Recent orders" value={String((recentOrders.data ?? []).length)} />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form action={upsertProductAction} className="rounded-lg border border-slate-300 bg-white p-5">
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
                {(categories.data ?? []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Brand
              <select name="brand_id" defaultValue={editProduct?.brand_id ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm">
                <option value="">Select brand</option>
                {(brands.data ?? []).map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
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
              <textarea name="images" defaultValue={(editProduct?.images as string[] | undefined)?.join("\n") ?? "/product-placeholder.svg"} className="mt-2 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-sm font-bold text-slate-700">
              Specs, `Key: Value` per line
              <textarea name="specs" defaultValue={editProduct?.specs ? Object.entries(editProduct.specs as Record<string, string>).map(([key, value]) => `${key}: ${value}`).join("\n") : ""} className="mt-2 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
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
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Products</h2></div>
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
                  {(products.data ?? []).map((product) => (
                    <tr key={product.id} className="border-t border-line">
                      <td className="px-4 py-3 font-semibold text-ink">{product.name}</td>
                      <td className="px-4 py-3">{Array.isArray(product.categories) ? product.categories[0]?.name ?? "-" : (product.categories as { name: string } | null)?.name ?? "-"}</td>
                      <td className="px-4 py-3">{Array.isArray(product.brands) ? product.brands[0]?.name ?? "-" : (product.brands as { name: string } | null)?.name ?? "-"}</td>
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

          <section className="rounded-lg border border-slate-300 bg-white">
            <div className="border-b border-line p-4"><h2 className="text-lg font-black text-ink">Recent orders</h2></div>
            <div className="divide-y divide-line">
              {((recentOrders.data ?? []) as unknown as AdminOrder[]).map((order) => (
                <form key={order.id} action={updateOrderStatusAction} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-ink">{Array.isArray(order.profiles) ? order.profiles[0]?.full_name ?? order.user_id ?? "Guest" : order.profiles?.full_name ?? order.user_id ?? "Guest"}</p>
                    <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString("en-KE")} • {formatKes(order.total_kes)}</p>
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
              {(quotes.data as AdminQuote[] | null ?? []).map((quote) => (
                <form key={quote.id} action={updateQuoteStatusAction} className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-ink">{quote.name} • {quote.service_needed}</p>
                    <p className="text-xs text-slate-500">{quote.email} • {quote.phone}</p>
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
