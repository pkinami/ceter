import { redirect } from "next/navigation";

export default function NewQuotationPage() {
  redirect("/admin/business?tab=quotes");
}
