import { redirect } from "next/navigation";

export default function RecurringInvoicesAlias() {
  redirect("/admin/business?tab=recurring-invoices");
}
