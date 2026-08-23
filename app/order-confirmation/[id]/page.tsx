import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { CustomerStatusBadge } from "@/components/CustomerStatusBadge";
import { ProductImageFrame } from "@/components/ProductImageFrame";
import { deliveryRegionLabel } from "@/lib/delivery";
import { prisma } from "@/lib/prisma";
import { productImageRenderUrls } from "@/lib/product-image-urls";
import { createClient } from "@/lib/supabase/server";
import { formatKes } from "@/lib/utils";
import { verifyPesapalByTrackingId } from "@/lib/payments";

export const metadata = {
  title: "Order confirmation",
  robots: { index: false, follow: false }
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
      order_items: { include: { product: { select: { name: true, images: true } } } }
    }
  });
  if (!order) redirect("/account#orders");

  const payment = order.payments[0];
  const isPaid = order.status === "paid" || payment?.status === "paid";
  const isFailed = payment?.status === "failed" || payment?.status === "cancelled";
  const Icon = isPaid ? CheckCircle2 : isFailed ? XCircle : Clock;
  const statusTone = isPaid ? "border-green-200 bg-green-50" : isFailed ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50";
  const paymentIcon = payment?.method === "mpesa" || payment?.provider === "safaricom_daraja" ? "mpesa" : "card";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <section className="rounded-lg border border-slate-300 bg-white p-6">
        <div className={`rounded-lg border p-4 ${statusTone}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Icon className={isPaid ? "mt-0.5 h-10 w-10 shrink-0 text-green-600" : isFailed ? "mt-0.5 h-10 w-10 shrink-0 text-red-600" : "mt-0.5 h-10 w-10 shrink-0 text-amber-600"} />
              <div>
                <h1 className="text-2xl font-black text-ink">{isPaid ? "Payment confirmed" : isFailed ? "Payment was not completed" : "Order received"}</h1>
                <p className="mt-1 text-sm font-semibold text-slate-700">Order {order.id.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <CustomerStatusBadge status={order.status} context="order" size="md" />
              {payment ? <CustomerStatusBadge status={payment.status} context="payment" size="md" /> : null}
            </div>
          </div>
        </div>
        {payment ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-[#DDE8EE] bg-[#F7FCFB] px-3 py-2 text-sm font-semibold text-ink">
            <span className="text-xs font-black uppercase text-slate-500">Payment method</span>
            {payment.method === "pay_on_delivery" ? null : <BrandIcon name={paymentIcon} label={paymentIcon === "mpesa" ? "M-Pesa" : "Card"} size={paymentIcon === "mpesa" ? 46 : 30} className="h-6 w-auto" />}
            <span className="capitalize">{payment.method?.replace(/_/g, " ") ?? "payment"}</span>
          </div>
        ) : null}
        <div className="mt-5 divide-y divide-line rounded-md border border-line">
          {order.order_items.map((item) => (
            <div key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-3 text-sm">
              <ProductImageFrame src={productImageRenderUrls(Array.isArray(item.product?.images) ? item.product.images.filter((image): image is string => typeof image === "string") : [])[0]} alt="" sizes="56px" className="h-14 w-14" imageClassName="p-1.5" />
              <span className="min-w-0 break-words">{item.product?.name ?? "Product"} x {item.quantity}</span>
              <strong className="text-right">{formatKes(item.price_at_purchase_kes * item.quantity)}</strong>
            </div>
          ))}
          {order.delivery_fee_kes ? (
            <div className="flex justify-between gap-3 p-3 text-sm">
              <span>Delivery - {deliveryRegionLabel(order.delivery_region)}</span>
              <strong>{formatKes(order.delivery_fee_kes)}</strong>
            </div>
          ) : null}
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
