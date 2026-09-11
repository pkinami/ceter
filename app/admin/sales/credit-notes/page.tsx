import { redirect } from "next/navigation";

export default function CreditNotesAlias() {
  redirect("/admin/business?tab=credit-notes");
}
