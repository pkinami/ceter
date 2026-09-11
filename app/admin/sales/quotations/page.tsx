import { redirect } from "next/navigation";

export default function QuotationsAlias() {
  redirect("/admin/business?tab=quotes");
}
