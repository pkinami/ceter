import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";
import { verifyPesapalByTrackingId } from "@/lib/payments";

export const metadata = {
  title: "Order confirmation"
};

export default async function OrderConfirmationPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ OrderTrackingId?: string; OrderMerchantReference?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  if (query.OrderTrackingId) {
    await verifyPesapalByTrackingId(query.OrderTrackingId, query.OrderMerchantReference ?? null).catch(() => null);
  }

  const order = await prisma.order.findFirst({
    where: { id, user_id: data.user.id },
    include: {
      payments: { orderBy: { created_at: "desc" }, take: 1 },
      order_items: { include: { product: { select: { name: true } } } }
    }
  });
  if (!order) redirect("/account#orders");

  const payment = order.payments[0];
  const isPaid = order.status === "paid" || payment?.status === "paid";
  const isFailed = payment?.status === "failed" || payment?.status === "cancelled";
  const Icon = isPaid ? CheckCircle2 : isFailed ? XCircle : Clock;
  const paymentIcon = payment?.method === "mpesa" || payment?.provider === "safaricom_daraja" ? "mpesa" : "card";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <section className="rounded-lg border border-slate-300 bg-white p-6">
        <Icon className={isPaid ? "h-10 w-10 text-green-600" : isFailed ? "h-10 w-10 text-red-600" : "h-10 w-10 text-amber-600"} />
        <h1 className="mt-4 text-2xl font-black text-ink">{isPaid ? "Payment confirmed" : isFailed ? "Payment was not completed" : "Order received"}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Order {order.id.slice(0, 8)} is currently <strong className="capitalize">{order.status}</strong>.
          {payment ? ` Payment status: ${payment.status}.` : ""}
        </p>
        {payment ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-[#DDE8EE] bg-[#F7FCFB] px-3 py-2 text-sm font-semibold text-ink">
            <BrandIcon name={paymentIcon} label={paymentIcon === "mpesa" ? "M-Pesa" : "Card"} size={paymentIcon === "mpesa" ? 46 : 30} className="h-6 w-auto" />
            <span className="capitalize">{payment.method ?? "payment"}</span>
          </div>
        ) : null}
        <div className="mt-5 divide-y divide-line rounded-md border border-line">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 p-3 text-sm">
              <span>{item.product?.name ?? "Product"} x {item.quantity}</span>
              <strong>{formatKes(item.price_at_purchase_kes * item.quantity)}</strong>
            </div>
          ))}
          <div className="flex justify-between gap-3 p-3 font-black">
            <span>Total</span>
            <span>{formatKes(order.total_kes)}</span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account#orders" className="rounded-md bg-signal px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">View orders</Link>
          {!isPaid ? <Link href="/cart" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-bold text-ink hover:bg-slate-50">Return to cart</Link> : null}
        </div>
      </section>
    </div>
  );
}
