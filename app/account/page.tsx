import { redirect } from "next/navigation";
import { updateProfileAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";

export const metadata = {
  title: "Account"
};

type Order = {
  id: string;
  status: string;
  total_kes: number;
  created_at: string;
  order_items: {
    quantity: number;
    price_at_purchase_kes: number;
    products: { name: string }[] | { name: string } | null;
  }[];
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const [{ data: profile }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("full_name,phone,role").eq("id", userData.user.id).maybeSingle(),
    supabase
      .from("orders")
      .select("id,status,total_kes,created_at,order_items(quantity,price_at_purchase_kes,products(name))")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
  ]);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[380px_1fr]">
      <section className="h-fit rounded-lg border border-slate-300 bg-white p-5">
        <h1 className="text-2xl font-black text-ink">Account</h1>
        <p className="mt-1 text-sm text-slate-500">{userData.user.email}</p>
        {params.error ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{params.error}</p> : null}
        {params.success ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-800">{params.success}</p> : null}
        <form action={updateProfileAction} className="mt-5 space-y-4">
          <label className="block text-sm font-bold text-slate-700">
            Full name
            <input name="full_name" defaultValue={profile?.full_name ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Phone
            <input name="phone" defaultValue={profile?.phone ?? ""} className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-signal focus:outline-none" />
          </label>
          <FormSubmitButton pendingText="Saving..." className="h-11 rounded-md bg-signal px-5 text-sm font-bold text-white hover:bg-teal-700">Save profile</FormSubmitButton>
        </form>
      </section>
      <section id="orders" className="rounded-lg border border-slate-300 bg-white">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-black text-ink">Order history</h2>
          <p className="text-sm text-slate-500">Pending orders are created before payment integration.</p>
        </div>
        <div className="divide-y divide-line">
          {((orders ?? []) as unknown as Order[]).length ? ((orders ?? []) as unknown as Order[]).map((order) => (
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
                  <div key={index} className="flex justify-between gap-3 rounded bg-mist px-3 py-2">
                    <span>{Array.isArray(item.products) ? item.products[0]?.name ?? "Product" : item.products?.name ?? "Product"} x {item.quantity}</span>
                    <strong>{formatKes(item.price_at_purchase_kes * item.quantity)}</strong>
                  </div>
                ))}
              </div>
            </article>
          )) : <p className="p-5 text-sm font-semibold text-slate-500">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
}
