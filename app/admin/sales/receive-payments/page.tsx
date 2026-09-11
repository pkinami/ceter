import { redirect } from "next/navigation";

export default function ReceivePaymentsAlias() {
  redirect("/admin/business?tab=payments");
}
