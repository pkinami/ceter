import { redirect } from "next/navigation";
import Link from "next/link";
import { ProductImageFrame } from "@/components/ProductImageFrame";
import { productImageRenderUrls } from "@/lib/product-image-urls";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";

export const metadata = {
  title: "Order History",
  robots: { index: false, follow: false }
};

type Order = {
  id: string;
  status: string;
  total_kes: number;
  created_at: string;
  order_items: {
    quantity: number;
    price_at_purchase_kes: number;
    products: { name: string; images?: unknown }[] | { name: string; images?: unknown } | null;
  }[];
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("id,status,total_kes,created_at,order_items(quantity,price_at_purchase_kes,products(name,images))")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  const orderList = (orders ?? []) as unknown as Order[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <section className="mb-6 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-signal">Your Orders</p>
          <h1 className="mt-1 text-3xl font-black text-ink">Order History</h1>
          <p className="mt-2 text-sm text-slate-500">{userData.user.email ?? "Email unavailable"}</p>
        </div>
        <Link href="/account/edit" className="inline-flex h-11 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-bold text-ink hover:bg-slate-50">
          Edit Account
        </Link>
      </section>
      <section id="orders" className="rounded-lg border border-slate-300 bg-white">
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        {params.success ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">{params.success}</p> : null}
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-ink">Your Orders</h2>
        </div>
        <div className="divide-y divide-line">
          {orderList.length ? orderList.map((order) => (
            <article key={order.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-black text-ink">Order {order.id.slice(0, 8)}</p>
                  <p className="text-xs font-semibold uppercase text-slate-500">{new Date(order.created_at).toLocaleDateString("en-KE")}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-signal">{formatKes(order.total_kes)}</p>
                  <span className="rounded-full bg-panel px-2.5 py-1 text-xs font-bold capitalize text-ink">{order.status}</span>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                {order.order_items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 rounded bg-mist px-3 py-2">
                    <ProductImageFrame src={orderProductImage(item.products)} alt="" sizes="48px" className="h-12 w-12" imageClassName="p-1" />
                    <span className="min-w-0 break-words">{orderProductName(item.products)} x {item.quantity}</span>
                    <strong className="text-right">{formatKes(item.price_at_purchase_kes * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </article>
          )) : (
            <div className="p-8 text-center">
              <p className="text-lg font-black text-ink">You have no orders yet</p>
              <Link href="/category" className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">
                Browse Products
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function orderProductName(product: Order["order_items"][number]["products"]) {
  return Array.isArray(product) ? product[0]?.name ?? "Product" : product?.name ?? "Product";
}

function orderProductImage(product: Order["order_items"][number]["products"]) {
  const value = Array.isArray(product) ? product[0]?.images : product?.images;
  const images = Array.isArray(value) ? value.filter((image): image is string => typeof image === "string") : [];
  return productImageRenderUrls(images)[0];
}
