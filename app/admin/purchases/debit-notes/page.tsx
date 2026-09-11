import { redirect } from "next/navigation";

export default function PurchaseDebitNotesRedirectPage() {
  redirect("/admin/purchases/returns");
}
