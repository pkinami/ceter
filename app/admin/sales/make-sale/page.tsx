import { redirect } from "next/navigation";

export default function MakeSaleAlias() {
  redirect("/admin/business?tab=sales");
}
