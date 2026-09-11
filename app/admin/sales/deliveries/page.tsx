import { redirect } from "next/navigation";

export default function DeliveriesAlias() {
  redirect("/admin/orders?view=deliveries");
}
