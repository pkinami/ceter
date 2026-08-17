import type { OrderStatus } from "@prisma/client";
import { updateOrderStatusAction } from "@/app/admin/actions";
import { Money, PageHeader, Pill, Table } from "@/components/admin/AdminPrimitives";
import { deliveryRegionLabel } from "@/lib/delivery";
import { getOrders, searchParam } from "@/lib/admin/data";
import { requireAdminSession } from "@/lib/admin/auth";

const statuses: OrderStatus[] = ["pending", "paid", "processing", "ready", "dispatched", "completed", "fulfilled", "cancelled"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  await requireAdminSession();
  const status = searchParam(params.status) as OrderStatus | "all" | undefined;
  const orders = await getOrders(status ?? "all");
  return (
    <>
      <PageHeader title="Orders" copy="Real order lifecycle records with persisted status changes and purchase-time item prices." />
      <form className="admin-toolbar" action="/admin/orders">
        <select className="admin-input" name="status" defaultValue={status ?? "all"}>
          <option value="all">All statuses</option>
          {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button className="btn-dark">Filter</button>
      </form>
      <Table headers={["Order", "Customer", "Delivery", "Items", "Payment", "Total", "Status", "Created", "Action"]} minWidth={1280}>
        {orders.map((order) => {
          const payment = order.payments[0];
          return (
            <tr key={order.id}>
              <td><strong>{order.id.slice(0, 8)}</strong></td>
              <td>{order.delivery_name ?? order.profile?.full_name ?? "Guest"}<br /><span className="text-slate-500">{order.delivery_phone ?? order.profile?.phone ?? "No phone"}</span></td>
              <td>
                <strong className="capitalize">{order.fulfillment_method}</strong><br />
                <span className="text-slate-500">{order.fulfillment_method === "delivery" ? `${deliveryRegionLabel(order.delivery_region)} / ${order.delivery_location ?? "No location"}` : "No delivery required"}</span><br />
                {order.delivery_fee_kes ? <span className="text-slate-500">Fee: <Money value={order.delivery_fee_kes} /></span> : null}
              </td>
              <td>{order.order_items.map((item) => `${item.quantity} x ${item.product?.name ?? item.service_label ?? "Item"} @ ${item.price_at_purchase_kes}`).join("; ")}</td>
              <td>{payment ? `${payment.method} / ${payment.status}` : order.payment_method ? `${order.payment_method} / no transaction` : "No payment record"}</td>
              <td><Money value={order.total_kes} /></td>
              <td><Pill tone={order.status === "cancelled" ? "red" : order.status === "completed" ? "green" : "teal"}>{order.status}</Pill></td>
              <td>{order.created_at.toLocaleString("en-KE")}</td>
              <td>
                <form action={updateOrderStatusAction} className="flex gap-2">
                  <input type="hidden" name="id" value={order.id} />
                  <select className="admin-input" name="status" defaultValue={order.status}>
                    {statuses.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <button className="btn-lite">Save</button>
                </form>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
